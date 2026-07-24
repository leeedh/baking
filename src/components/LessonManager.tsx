'use client';

import { Link } from '@/i18n/navigation';
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

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}

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
    const res = await fetch('/api/admin/materials', { method: 'POST', body: form });
    setMaterialUploading(null);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    setMaterialFormLessonId(null);
    setMaterialTitle('');
    router.refresh();
  };

  const removeMaterial = async (materialId: string) => {
    if (!confirm('이 자료를 삭제할까요? 되돌릴 수 없습니다.')) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/materials/${materialId}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    router.refresh();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('차시 명칭을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/lessons', {
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
    });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    setShowAdd(false);
    setTitle('');
    setChapterTitle('');
    setDurationMin(0);
    setIsPreview(false);
    router.refresh();
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/lessons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('이 차시를 삭제할까요? 되돌릴 수 없습니다.')) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    router.refresh();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= lessons.length) return;
    const ids = lessons.map((l) => l.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/lessons/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, orderedIds: ids }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    router.refresh();
  };

  return (
    <div className="bg-[#FAF4EA] py-10 px-4 sm:px-8 max-w-5xl mx-auto min-h-screen">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5F4E43] hover:text-[#B65538] mb-4"
      >
        <ArrowLeft size={14} /> 대시보드로
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-[#B0863C] tracking-wider uppercase block">
            CURRICULUM
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#2A211B]">{courseTitle}</h1>
          <p className="text-xs text-[#5F4E43] mt-1">
            차시 등록·수정·순서 변경 (총 {lessons.length}개)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 bg-[#B65538] hover:bg-[#A14328] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
        >
          <Plus size={14} /> 차시 추가
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[#B65538]/30 bg-[#B65538]/10 px-4 py-3 text-xs font-semibold text-[#A14328]"
        >
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={create}
          className="bg-white rounded-2xl border border-[#EFE8DC] shadow-sm p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                차시 명칭 (한국어)
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs focus:ring-1 focus:ring-[#B65538] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                챕터 번호
              </span>
              <input
                type="number"
                min={1}
                value={chapterIndex}
                onChange={(e) => setChapterIndex(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs focus:ring-1 focus:ring-[#B65538] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                챕터 제목 (선택)
              </span>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs focus:ring-1 focus:ring-[#B65538] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                재생시간 (분)
              </span>
              <input
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs focus:ring-1 focus:ring-[#B65538] focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={isPreview}
                onChange={(e) => setIsPreview(e.target.checked)}
              />
              <span className="text-xs font-semibold text-[#5F4E43]">무료 미리보기 차시</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-[#FAF4EA] border border-[#EFE8DC] text-xs font-semibold rounded-lg text-[#5F4E43]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-[#B65538] text-white text-xs font-bold rounded-lg hover:bg-[#A14328] disabled:opacity-50"
            >
              등록
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-[#EFE8DC] shadow-sm overflow-hidden">
        {lessons.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#5F4E43]">
            아직 차시가 없습니다. “차시 추가”로 커리큘럼을 구성하세요.
          </div>
        ) : (
          <ul className="divide-y divide-[#EFE8DC]/60">
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
                        className="text-[#5F4E43] hover:text-[#B65538] disabled:opacity-30"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy || i === lessons.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="아래로 이동"
                        className="text-[#5F4E43] hover:text-[#B65538] disabled:opacity-30"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    <span className="font-mono text-xs text-[#5F4E43]/60 w-6 shrink-0">
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#2A211B] truncate">
                        {l.titleKo || '(제목 없음)'}
                      </span>
                      <span className="text-[11px] text-[#5F4E43]/70">
                        챕터 {l.chapterIndex}
                        {l.chapterTitleKo ? ` · ${l.chapterTitleKo}` : ''} · {clock(l.durationSec)}
                      </span>
                    </div>

                    {l.hasVideo ? (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <Video size={11} /> 영상
                      </span>
                    ) : (
                      <span className="hidden sm:inline text-[10px] font-bold text-[#5F4E43]/50 bg-[#5F4E43]/5 px-2 py-0.5 rounded">
                        영상 없음
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={busy || !!up}
                      onClick={() => pickFile(l.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded text-[#B65538] bg-[#B65538]/10 hover:bg-[#B65538] hover:text-[#FAF4EA] transition-colors disabled:opacity-50"
                    >
                      <Upload size={11} /> {l.hasVideo ? '교체' : '업로드'}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => patch(l.id, { isPreview: !l.isPreview })}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                        l.isPreview
                          ? 'text-[#B0863C] bg-[#B0863C]/10'
                          : 'text-[#5F4E43] bg-[#5F4E43]/10'
                      }`}
                      aria-pressed={l.isPreview}
                    >
                      <Eye size={11} /> {l.isPreview ? '미리보기' : '잠금'}
                    </button>

                    <button
                      type="button"
                      disabled={busy || !!up}
                      onClick={() => remove(l.id)}
                      aria-label="차시 삭제"
                      className="text-[#5F4E43]/60 hover:text-[#B65538] disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {up && (
                    <div className="mt-3 pl-9">
                      {up.phase === 'error' ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-[#A14328]">
                            {up.message ?? '업로드에 실패했습니다.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => pickFile(l.id)}
                            className="text-[10px] font-bold text-[#B65538] underline shrink-0"
                          >
                            다시 시도
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-[#5F4E43]">
                              {up.phase === 'uploading'
                                ? '업로드 중…'
                                : '인코딩 중… (완료까지 대기)'}
                            </span>
                            <span className="text-[11px] font-mono text-[#5F4E43]">
                              {up.phase === 'uploading' ? `${up.progress}%` : ''}
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#FAF4EA] rounded-full overflow-hidden border border-[#EFE8DC]">
                            <div
                              className={`h-full rounded-full ${up.phase === 'encoding' ? 'bg-[#B0863C] animate-pulse w-full' : 'bg-[#B65538]'}`}
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
                        className="flex items-center justify-between gap-2 text-[11px] text-[#5F4E43]"
                      >
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <FileText size={11} className="shrink-0 text-[#B0863C]" />
                          <span className="truncate">{m.title}</span>
                          <span className="font-mono text-[#5F4E43]/60 shrink-0">
                            {formatBytes(m.sizeBytes)}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeMaterial(m.id)}
                          aria-label={`자료 ${m.title} 삭제`}
                          className="text-[#5F4E43]/60 hover:text-[#B65538] disabled:opacity-50 shrink-0"
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
                          className="flex-1 min-w-0 px-2 py-1 border border-[#EFE8DC] rounded text-[11px] focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={busy || materialUploading === l.id}
                          onClick={() => pickMaterial(l.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded text-[#B65538] bg-[#B65538]/10 hover:bg-[#B65538] hover:text-[#FAF4EA] transition-colors disabled:opacity-50 shrink-0"
                        >
                          {materialUploading === l.id ? '업로드 중…' : 'PDF 선택'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaterialFormLessonId(null)}
                          className="text-[10px] text-[#5F4E43]/70 hover:text-[#B65538] shrink-0"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || materialUploading === l.id}
                        onClick={() => openMaterialForm(l.id)}
                        className="text-[10px] font-bold text-[#B0863C] hover:text-[#B65538] underline disabled:opacity-50"
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
    </div>
  );
}
