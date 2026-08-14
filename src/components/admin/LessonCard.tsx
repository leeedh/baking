'use client';

import type { UploadState } from '@/hooks/useVideoUpload';
import { readError } from '@/lib/api/read-error';
import { formatBytes } from '@/lib/format';
import type { AdminLesson } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  GripVertical,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useRef, useState } from 'react';

/** 초 → mm:ss (미상이면 '--:--'). */
export function clock(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  lesson: AdminLesson;
  /** 커리큘럼 전체에서의 순번(1부터). */
  position: number;
  upload?: UploadState;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (lessonId: string, dir: -1 | 1) => void;
  onPickVideo: (lessonId: string) => void;
  onPatch: (lessonId: string, body: Record<string, unknown>) => Promise<void>;
  onDelete: (lessonId: string) => void;
  onDeleteMaterial: (materialId: string) => void;
  onError: (message: string) => void;
};

/**
 * 커리큘럼의 차시 카드 — 드래그 핸들·제목·영상·재생시간·실습 참고서(PDF)를 한 카드에 모은다.
 *
 * 재생시간은 **읽기 전용**이 기본이다. Mux가 인코딩을 마치며 실제 길이를 기록하므로
 * 사람이 입력할 이유가 없다(영상이 아직 없는 차시만 직접 입력을 허용한다).
 */
export default function LessonCard({
  lesson,
  position,
  upload,
  busy,
  canMoveUp,
  canMoveDown,
  onMove,
  onPickVideo,
  onPatch,
  onDelete,
  onDeleteMaterial,
  onError,
}: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });

  const [title, setTitle] = useState(lesson.titleKo);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationMin, setDurationMin] = useState(Math.round((lesson.durationSec ?? 0) / 60));

  const materialInputRef = useRef<HTMLInputElement>(null);
  const [materialUploading, setMaterialUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Mux에서 재생 ID·재생시간을 다시 가져온다.
   *
   * 완료 감지가 브라우저 폴링뿐이라(웹훅 미도입) 화면을 떠나거나 저장이 한 번 어긋나면
   * 파일은 Mux에 멀쩡한데 차시만 비는 일이 생긴다. 그때 재업로드 말고 되살릴 유일한 수단이다.
   */
  const refreshVideo = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}/refresh-video`, { method: 'POST' });
      if (!res.ok) {
        onError(await readError(res));
        return;
      }
      const { durationMissing } = (await res.json()) as { durationMissing?: boolean };
      if (durationMissing) {
        onError('영상은 연결했지만 Mux가 재생시간을 주지 않았습니다. 재생시간을 확인해 주세요.');
      }
      router.refresh();
    } catch {
      onError('영상 정보를 가져오지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setRefreshing(false);
    }
  };

  // 영상은 붙었는데 재생시간이 없거나, 업로드 기록만 남고 완료 저장이 안 된 상태 —
  // 둘 다 사람이 손댈 수 없던 막다른 길이었다.
  const needsRefresh = (lesson.hasVideo && !lesson.durationSec) || !!lesson.pendingUploadId;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commitTitle = async () => {
    const next = title.trim();
    if (!next || next === lesson.titleKo) {
      setTitle(lesson.titleKo);
      return;
    }
    await onPatch(lesson.id, { titleKo: next });
  };

  const commitDuration = async () => {
    setEditingDuration(false);
    const sec = durationMin > 0 ? durationMin * 60 : null;
    if (sec === lesson.durationSec) return;
    await onPatch(lesson.id, { durationSec: sec });
  };

  // 자료(PDF)는 비공개 버킷이라 클라이언트 직접 업로드 경로가 없다 — 서버 라우트로 multipart 전송.
  const sendMaterial = async (file: File) => {
    if (file.type !== 'application/pdf') {
      onError('실습 참고서는 PDF 파일만 등록할 수 있습니다.');
      return;
    }
    setMaterialUploading(true);
    const form = new FormData();
    form.append('lessonId', lesson.id);
    form.append('titleKo', file.name.replace(/\.pdf$/i, ''));
    form.append('file', file);
    try {
      const res = await fetch('/api/admin/materials', { method: 'POST', body: form });
      if (!res.ok) {
        onError(await readError(res));
        return;
      }
      router.refresh();
    } catch {
      // 예외를 놓치면 버튼이 "업로드 중…"으로 영구 고착된다(코드리뷰 X-3).
      onError('자료를 업로드하지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setMaterialUploading(false);
    }
  };

  const onDropFile = (e: React.DragEvent) => {
    // 카드 위로 PDF를 떨어뜨리면 곧바로 그 차시의 참고서가 된다.
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    void sendMaterial(file);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onDrop={onDropFile}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      className="bg-white rounded-xl border border-brown-light px-3 py-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${lesson.titleKo || '차시'} 순서 변경 — 스페이스로 집고 방향키로 이동`}
          className="text-brown-medium/60 hover:text-terracotta cursor-grab touch-none shrink-0"
        >
          <GripVertical size={16} aria-hidden />
        </button>

        {/* 드래그가 어려운 환경을 위한 확실한 대체 수단(EPIC-I 접근성). 커리큘럼 전체 순서
            기준이라 챕터 경계를 넘으면 소속 챕터도 함께 바뀐다. */}
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            disabled={busy || !canMoveUp}
            onClick={() => onMove(lesson.id, -1)}
            aria-label="위로 이동"
            className="text-brown-medium hover:text-terracotta disabled:opacity-30"
          >
            <ChevronUp size={14} aria-hidden />
          </button>
          <button
            type="button"
            disabled={busy || !canMoveDown}
            onClick={() => onMove(lesson.id, 1)}
            aria-label="아래로 이동"
            className="text-brown-medium hover:text-terracotta disabled:opacity-30"
          >
            <ChevronDown size={14} aria-hidden />
          </button>
        </div>

        <span className="font-mono text-xs text-brown-medium/60 w-6 shrink-0">{position}</span>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          aria-label="차시 명칭"
          className="min-w-0 flex-1 px-2 py-1 text-sm font-bold text-brown bg-transparent border border-transparent hover:border-brown-light rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />

        {editingDuration ? (
          <span className="inline-flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              aria-label="재생시간 (분)"
              className="w-16 px-2 py-1 border border-brown-light rounded text-[11px]"
            />
            <button
              type="button"
              onClick={commitDuration}
              className="text-[10px] font-bold text-terracotta underline"
            >
              저장
            </button>
          </span>
        ) : (
          <span className="font-mono text-[11px] text-brown-medium shrink-0">
            {clock(lesson.durationSec)}
            {needsRefresh && (
              <button
                type="button"
                disabled={busy || refreshing || !!upload}
                onClick={refreshVideo}
                title="Mux에서 재생 정보와 재생시간을 다시 가져옵니다"
                className="ml-1 text-[10px] text-gold-deep underline hover:text-terracotta disabled:opacity-50"
              >
                {refreshing ? '가져오는 중…' : '다시 가져오기'}
              </button>
            )}
            {!lesson.hasVideo && !needsRefresh && (
              <button
                type="button"
                onClick={() => setEditingDuration(true)}
                className="ml-1 text-[10px] text-brown-medium/70 underline hover:text-terracotta"
              >
                직접 입력
              </button>
            )}
          </span>
        )}

        {lesson.hasVideo ? (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
            <Video size={11} aria-hidden /> 영상
          </span>
        ) : lesson.pendingUploadId ? (
          // 업로드 기록은 남았는데 재생 ID가 안 붙은 상태 — "한 번도 안 올림"과 구분해야
          // 운영자가 "다시 가져오기"를 눌러볼 생각을 할 수 있다.
          <span className="hidden sm:inline text-[10px] font-bold text-gold-deep bg-gold/10 px-2 py-0.5 rounded shrink-0">
            연결 대기
          </span>
        ) : (
          <span className="hidden sm:inline text-[10px] font-bold text-brown-medium/50 bg-brown-medium/5 px-2 py-0.5 rounded shrink-0">
            영상 없음
          </span>
        )}

        <button
          type="button"
          disabled={busy || !!upload}
          onClick={() => onPickVideo(lesson.id)}
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded text-terracotta bg-terracotta/10 hover:bg-terracotta hover:text-cream transition-colors disabled:opacity-50 shrink-0"
        >
          <Upload size={11} aria-hidden /> {lesson.hasVideo ? '교체' : '업로드'}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onPatch(lesson.id, { isPreview: !lesson.isPreview })}
          aria-pressed={lesson.isPreview}
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50 shrink-0 ${
            lesson.isPreview ? 'text-gold-deep bg-gold/10' : 'text-brown-medium bg-brown-medium/10'
          }`}
        >
          <Eye size={11} aria-hidden /> {lesson.isPreview ? '미리보기' : '잠금'}
        </button>

        <button
          type="button"
          disabled={busy || !!upload}
          onClick={() => onDelete(lesson.id)}
          aria-label={`차시 ${lesson.titleKo} 삭제`}
          className="text-brown-medium/60 hover:text-terracotta disabled:opacity-50 shrink-0"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>

      {upload && (
        <div className="mt-3 pl-8">
          {upload.phase === 'error' || upload.phase === 'warning' ? (
            // 'warning'은 영상은 올라갔고 재생시간만 못 받은 상태다 — 다시 올릴 일이 아니라
            // 정보만 다시 가져오면 된다. 실패와 같은 색·같은 행동을 주면 재업로드를 유도한다.
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-[11px] font-semibold ${
                  upload.phase === 'warning' ? 'text-gold-deep' : 'text-terracotta-deep'
                }`}
              >
                {upload.message ?? '업로드에 실패했습니다.'}
              </span>
              {upload.phase === 'warning' ? (
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={refreshVideo}
                  className="text-[10px] font-bold text-gold-deep underline shrink-0 disabled:opacity-50"
                >
                  {refreshing ? '가져오는 중…' : '다시 가져오기'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onPickVideo(lesson.id)}
                  className="text-[10px] font-bold text-terracotta underline shrink-0"
                >
                  다시 시도
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-brown-medium">
                  {upload.phase === 'queued'
                    ? '대기 중…'
                    : upload.phase === 'uploading'
                      ? '업로드 중…'
                      : '인코딩 중… (완료되면 재생시간이 자동으로 채워집니다)'}
                </span>
                <span className="text-[11px] font-mono text-brown-medium">
                  {upload.phase === 'uploading' ? `${upload.progress}%` : ''}
                </span>
              </div>
              <div className="h-1.5 bg-cream rounded-full overflow-hidden border border-brown-light">
                <div
                  data-motion-essential
                  className={`h-full rounded-full ${
                    upload.phase === 'encoding'
                      ? 'bg-gold animate-pulse w-full'
                      : upload.phase === 'queued'
                        ? 'bg-brown-medium/30 w-full'
                        : 'bg-terracotta'
                  }`}
                  style={upload.phase === 'uploading' ? { width: `${upload.progress}%` } : undefined}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* DC-58 · 차시 실습 핵심 요약 참고서(PDF) */}
      <div className="mt-2 pl-8 space-y-1">
        {lesson.materials.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 text-[11px] text-brown-medium"
          >
            <span className="inline-flex items-center gap-1 min-w-0">
              <FileText size={11} className="shrink-0 text-gold-deep" aria-hidden />
              <span className="truncate">{m.title}</span>
              <span className="font-mono text-brown-medium/60 shrink-0">
                {formatBytes(m.sizeBytes)}
              </span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDeleteMaterial(m.id)}
              aria-label={`자료 ${m.title} 삭제`}
              className="text-brown-medium/60 hover:text-terracotta disabled:opacity-50 shrink-0"
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={busy || materialUploading}
          onClick={() => materialInputRef.current?.click()}
          className="text-[10px] font-bold text-gold-deep hover:text-terracotta underline disabled:opacity-50"
        >
          {materialUploading ? '자료 업로드 중…' : '+ 실습 참고서(PDF) 추가 — 끌어다 놓아도 됩니다'}
        </button>
      </div>

      <input
        ref={materialInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void sendMaterial(file);
        }}
      />
    </li>
  );
}
