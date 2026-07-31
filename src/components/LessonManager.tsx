'use client';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Link } from '@/i18n/navigation';
import { readError } from '@/lib/api/read-error';
import { formatBytes } from '@/lib/format';
import type { AdminLesson } from '@/types';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useRef, useState } from 'react';

/** 차시별 영상 업로드 진행 상태. */
type UploadState = {
  phase: 'uploading' | 'encoding' | 'error';
  progress: number;
  message?: string;
};

type Props = {
  courseId: string;
  courseTitle: string;
  initialLessons: AdminLesson[];
};

/** 초 → mm:ss (미상이면 '--:--'). */
function clock(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LessonManager({ courseId, courseTitle, initialLessons }: Props) {
  const router = useRouter();
  const lessons = initialLessons;

  const [busy, setBusy] = useState(false);
  /** 삭제 확인 대상 — 네이티브 confirm() 대신 ConfirmDialog를 띄운다. */
  const [pendingLessonDelete, setPendingLessonDelete] = useState<string | null>(null);
  const [pendingMaterialDelete, setPendingMaterialDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [chapterIndex, setChapterIndex] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [durationMin, setDurationMin] = useState(0);
  const [isPreview, setIsPreview] = useState(false);

  // 차시별 업로드 상태 + 파일 선택 대상 차시.
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  // 자료(PDF) 업로드 — 제목 입력줄을 연 차시와 진행 상태.
  const materialInputRef = useRef<HTMLInputElement>(null);
  const materialTargetRef = useRef<string | null>(null);
  const [materialFormLessonId, setMaterialFormLessonId] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUploading, setMaterialUploading] = useState<string | null>(null);

  const setUpload = (lessonId: string, state: UploadState | null) => {
    setUploads((prev) => {
      const next = { ...prev };
      if (state) next[lessonId] = state;
      else delete next[lessonId];
      return next;
    });
  };

  const pickFile = (lessonId: string) => {
    setError(null);
    uploadTargetRef.current = lessonId;
    fileInputRef.current?.click();
  };

  // 선택한 파일을 Mux Direct Upload로 PUT(진행률 추적) → 인코딩 완료까지 폴링.
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lessonId = uploadTargetRef.current;
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file || !lessonId) return;

    setUpload(lessonId, { phase: 'uploading', progress: 0 });

    // 1) Direct Upload URL 발급
    const initRes = await fetch('/api/admin/mux/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    });
    if (!initRes.ok) {
      setUpload(lessonId, { phase: 'error', progress: 0, message: await readError(initRes) });
      return;
    }
    const { uploadUrl, uploadId } = (await initRes.json()) as {
      uploadUrl: string;
      uploadId: string;
    };

    // 2) 파일 PUT + 진행률
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUpload(lessonId, {
              phase: 'uploading',
              progress: Math.round((ev.loaded / ev.total) * 100),
            });
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`업로드 실패 (HTTP ${xhr.status})`));
        xhr.onerror = () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
        xhr.send(file);
      });
    } catch (err) {
      setUpload(lessonId, {
        phase: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
      });
      return;
    }

    // 3) 인코딩 완료까지 폴링(최대 ~5분)
    setUpload(lessonId, { phase: 'encoding', progress: 100 });
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const stRes = await fetch('/api/admin/mux/upload/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, uploadId }),
      });
      if (!stRes.ok) {
        setUpload(lessonId, { phase: 'error', progress: 100, message: await readError(stRes) });
        return;
      }
      const { state } = (await stRes.json()) as { state: string };
      if (state === 'ready') {
        setUpload(lessonId, null);
        router.refresh();
        return;
      }
      if (state === 'errored') {
        setUpload(lessonId, {
          phase: 'error',
          progress: 100,
          message: 'Mux 인코딩에 실패했습니다. 다시 시도해 주세요.',
        });
        return;
      }
    }
    setUpload(lessonId, {
      phase: 'error',
      progress: 100,
      message: '인코딩이 지연되고 있습니다. 잠시 후 새로고침해 확인하세요.',
    });
  };

  // 자료(PDF) 업로드는 Mux와 달리 서버 라우트로 곧장 multipart 전송한다
  // (비공개 버킷에 클라이언트 정책이 없어 직접 업로드 경로가 존재하지 않는다).
  const openMaterialForm = (lessonId: string) => {
    setError(null);
    setMaterialTitle('');
    setMaterialFormLessonId((prev) => (prev === lessonId ? null : lessonId));
  };

  const pickMaterial = (lessonId: string) => {
    setError(null);
    materialTargetRef.current = lessonId;
    materialInputRef.current?.click();
  };

  const onMaterialSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lessonId = materialTargetRef.current;
    e.target.value = '';
    if (!file || !lessonId) return;

    // 제목을 비워두면 파일명을 그대로 쓴다.
    const title = materialTitle.trim() || file.name.replace(/\.pdf$/i, '');

    setMaterialUploading(lessonId);
    setError(null);
    const form = new FormData();
    form.append('lessonId', lessonId);
    form.append('titleKo', title);
    form.append('file', file);
    try {
      const res = await fetch('/api/admin/materials', { method: 'POST', body: form });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setMaterialFormLessonId(null);
      setMaterialTitle('');
      router.refresh();
    } catch {
      // 예외를 놓치면 해당 차시 버튼이 "업로드 중…"으로 영구 고착된다(코드리뷰 X-3).
      setError('자료를 업로드하지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setMaterialUploading(null);
    }
  };

  /**
   * 운영 액션 공통 실행기 — fetch가 throw해도 finally에서 busy를 반드시 푼다.
   * 예전에는 액션마다 setBusy(false)를 수동으로 불러서, 네트워크 예외가 나면
   * 화면이 "처리 중"으로 고착돼 다음 작업을 못 했다(코드리뷰 X-3).
   */
  const runMutation = async (request: () => Promise<Response>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        setError(await readError(res));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('요청을 처리하지 못했습니다. 네트워크 상태를 확인해 주세요.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const removeMaterial = async (materialId: string) => {
    setPendingMaterialDelete(null);
    await runMutation(() => fetch(`/api/admin/materials/${materialId}`, { method: 'DELETE' }));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('차시 명칭을 입력해 주세요.');
      return;
    }
    const ok = await runMutation(() =>
      fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          titleKo: title,
          chapterIndex,
          chapterTitleKo: chapterTitle,
          durationSec: durationMin > 0 ? durationMin * 60 : null,
          isPreview,
        }),
      }),
    );
    if (!ok) return;
    setShowAdd(false);
    setTitle('');
    setChapterTitle('');
    setDurationMin(0);
    setIsPreview(false);
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    await runMutation(() =>
      fetch(`/api/admin/lessons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  };

  const remove = async (id: string) => {
    setPendingLessonDelete(null);
    await runMutation(() => fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' }));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= lessons.length) return;
    const ids = lessons.map((l) => l.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await runMutation(() =>
      fetch('/api/admin/lessons/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, orderedIds: ids }),
      }),
    );
  };

  return (
    <div className="bg-cream py-10 px-4 sm:px-8 max-w-5xl mx-auto min-h-screen">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs font-semibold text-brown-medium hover:text-terracotta mb-4"
      >
        <ArrowLeft size={14} /> 대시보드로
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-gold tracking-wider uppercase block">
            CURRICULUM
          </span>
          <h1 className="font-serif text-2xl font-bold text-brown">{courseTitle}</h1>
          <p className="text-xs text-brown-medium mt-1">
            차시 등록·수정·순서 변경 (총 {lessons.length}개)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 bg-terracotta hover:bg-terracotta-deep text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
        >
          <Plus size={14} /> 차시 추가
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs font-semibold text-terracotta-deep"
        >
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={create}
          className="bg-white rounded-2xl border border-brown-light shadow-sm p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-bold text-brown-medium uppercase mb-1">
                차시 명칭 (한국어)
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-brown-light rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-brown-medium uppercase mb-1">
                챕터 번호
              </span>
              <input
                type="number"
                min={1}
                value={chapterIndex}
                onChange={(e) => setChapterIndex(Number(e.target.value))}
                className="w-full px-3 py-2 border border-brown-light rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-brown-medium uppercase mb-1">
                챕터 제목 (선택)
              </span>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                className="w-full px-3 py-2 border border-brown-light rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-brown-medium uppercase mb-1">
                재생시간 (분)
              </span>
              <input
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-brown-light rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={isPreview}
                onChange={(e) => setIsPreview(e.target.checked)}
              />
              <span className="text-xs font-semibold text-brown-medium">무료 미리보기 차시</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-cream border border-brown-light text-xs font-semibold rounded-lg text-brown-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-terracotta text-white text-xs font-bold rounded-lg hover:bg-terracotta-deep disabled:opacity-50"
            >
              등록
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-brown-light shadow-sm overflow-hidden">
        {lessons.length === 0 ? (
          <div className="py-16 text-center text-sm text-brown-medium">
            아직 차시가 없습니다. “차시 추가”로 커리큘럼을 구성하세요.
          </div>
        ) : (
          <ul className="divide-y divide-brown-light/60">
            {lessons.map((l, i) => {
              const up = uploads[l.id];
              return (
                <li key={l.id} className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={busy || i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="위로 이동"
                        className="text-brown-medium hover:text-terracotta disabled:opacity-30"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy || i === lessons.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="아래로 이동"
                        className="text-brown-medium hover:text-terracotta disabled:opacity-30"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    <span className="font-mono text-xs text-brown-medium/60 w-6 shrink-0">
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-brown truncate">
                        {l.titleKo || '(제목 없음)'}
                      </span>
                      <span className="text-[11px] text-brown-medium/70">
                        챕터 {l.chapterIndex}
                        {l.chapterTitleKo ? ` · ${l.chapterTitleKo}` : ''} · {clock(l.durationSec)}
                      </span>
                    </div>

                    {l.hasVideo ? (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <Video size={11} /> 영상
                      </span>
                    ) : (
                      <span className="hidden sm:inline text-[10px] font-bold text-brown-medium/50 bg-brown-medium/5 px-2 py-0.5 rounded">
                        영상 없음
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={busy || !!up}
                      onClick={() => pickFile(l.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded text-terracotta bg-terracotta/10 hover:bg-terracotta hover:text-cream transition-colors disabled:opacity-50"
                    >
                      <Upload size={11} /> {l.hasVideo ? '교체' : '업로드'}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => patch(l.id, { isPreview: !l.isPreview })}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                        l.isPreview
                          ? 'text-gold bg-gold/10'
                          : 'text-brown-medium bg-brown-medium/10'
                      }`}
                      aria-pressed={l.isPreview}
                    >
                      <Eye size={11} /> {l.isPreview ? '미리보기' : '잠금'}
                    </button>

                    <button
                      type="button"
                      disabled={busy || !!up}
                      onClick={() => setPendingLessonDelete(l.id)}
                      aria-label="차시 삭제"
                      className="text-brown-medium/60 hover:text-terracotta disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {up && (
                    <div className="mt-3 pl-9">
                      {up.phase === 'error' ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-terracotta-deep">
                            {up.message ?? '업로드에 실패했습니다.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => pickFile(l.id)}
                            className="text-[10px] font-bold text-terracotta underline shrink-0"
                          >
                            다시 시도
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-brown-medium">
                              {up.phase === 'uploading'
                                ? '업로드 중…'
                                : '인코딩 중… (완료까지 대기)'}
                            </span>
                            <span className="text-[11px] font-mono text-brown-medium">
                              {up.phase === 'uploading' ? `${up.progress}%` : ''}
                            </span>
                          </div>
                          <div className="h-1.5 bg-cream rounded-full overflow-hidden border border-brown-light">
                            <div
                              className={`h-full rounded-full ${up.phase === 'encoding' ? 'bg-gold animate-pulse w-full' : 'bg-terracotta'}`}
                              style={
                                up.phase === 'uploading' ? { width: `${up.progress}%` } : undefined
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* DC-58 · 차시 레시피 자료(PDF) 관리 */}
                  <div className="mt-3 pl-9 space-y-1">
                    {l.materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 text-[11px] text-brown-medium"
                      >
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <FileText size={11} className="shrink-0 text-gold" />
                          <span className="truncate">{m.title}</span>
                          <span className="font-mono text-brown-medium/60 shrink-0">
                            {formatBytes(m.sizeBytes)}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingMaterialDelete(m.id)}
                          aria-label={`자료 ${m.title} 삭제`}
                          className="text-brown-medium/60 hover:text-terracotta disabled:opacity-50 shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {materialFormLessonId === l.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={materialTitle}
                          onChange={(e) => setMaterialTitle(e.target.value)}
                          placeholder="자료 제목 (비우면 파일명)"
                          aria-label="자료 제목"
                          className="flex-1 min-w-0 px-2 py-1 border border-brown-light rounded text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                        <button
                          type="button"
                          disabled={busy || materialUploading === l.id}
                          onClick={() => pickMaterial(l.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded text-terracotta bg-terracotta/10 hover:bg-terracotta hover:text-cream transition-colors disabled:opacity-50 shrink-0"
                        >
                          {materialUploading === l.id ? '업로드 중…' : 'PDF 선택'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaterialFormLessonId(null)}
                          className="text-[10px] text-brown-medium/70 hover:text-terracotta shrink-0"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || materialUploading === l.id}
                        onClick={() => openMaterialForm(l.id)}
                        className="text-[10px] font-bold text-gold hover:text-terracotta underline disabled:opacity-50"
                      >
                        {materialUploading === l.id ? '자료 업로드 중…' : '+ PDF 자료 추가'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 업로드용 숨김 파일 입력(차시 공용) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileSelected}
      />
      <input
        ref={materialInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onMaterialSelected}
      />

      <ConfirmDialog
        open={pendingLessonDelete !== null}
        title="차시를 삭제할까요?"
        description="되돌릴 수 없습니다. 업로드된 영상과 자료 연결도 함께 사라집니다."
        confirmLabel="삭제"
        destructive
        busy={busy}
        onConfirm={() => pendingLessonDelete && remove(pendingLessonDelete)}
        onCancel={() => setPendingLessonDelete(null)}
      />

      <ConfirmDialog
        open={pendingMaterialDelete !== null}
        title="자료를 삭제할까요?"
        description="되돌릴 수 없습니다. 수강생은 더 이상 이 파일을 다운로드할 수 없습니다."
        confirmLabel="삭제"
        destructive
        busy={busy}
        onConfirm={() => pendingMaterialDelete && removeMaterial(pendingMaterialDelete)}
        onCancel={() => setPendingMaterialDelete(null)}
      />
    </div>
  );
}
