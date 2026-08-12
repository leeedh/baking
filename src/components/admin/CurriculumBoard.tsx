'use client';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { readError } from '@/lib/api/read-error';
import type { AdminLesson } from '@/types';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FolderPlus, Plus, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LessonCard from './LessonCard';

/**
 * 커리큘럼 구성 — 영상 다중 업로드 → 보관함 → 챕터 배치.
 *
 * 챕터는 별도 테이블이 아니라 lessons.chapter_index/chapter_title의 파생 그룹이다.
 * **chapter_index 0 = 미분류 보관함**: 영상만 올려두고 아직 챕터에 넣지 않은 차시.
 * 이 약속은 DB가 강제하지 않으므로 게시 전 경고(CourseEditor)와 함께 지켜야 한다.
 *
 * 저장은 순서와 챕터 소속을 한 번에 확정하는 POST /api/admin/lessons/arrange 하나다 —
 * 둘로 나누면 순서만 반영된 중간 상태가 화면에 보인다.
 */
const INBOX = 'inbox';

type Chapter = { key: string; titleKo: string; lessonIds: string[] };

/** 서버 상태(lessons) → 화면 모델(보관함 + 챕터들). */
function derive(lessons: AdminLesson[]): Chapter[] {
  const sorted = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const inbox: Chapter = { key: INBOX, titleKo: '', lessonIds: [] };
  const byIndex = new Map<number, Chapter>();

  for (const l of sorted) {
    if (l.chapterIndex === 0) {
      inbox.lessonIds.push(l.id);
      continue;
    }
    const existing = byIndex.get(l.chapterIndex);
    if (existing) {
      existing.lessonIds.push(l.id);
      if (!existing.titleKo) existing.titleKo = l.chapterTitleKo;
    } else {
      byIndex.set(l.chapterIndex, {
        key: `ch-${l.chapterIndex}`,
        titleKo: l.chapterTitleKo,
        lessonIds: [l.id],
      });
    }
  }

  const ordered = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  return [inbox, ...ordered];
}

/** 서버에서 다시 그릴 때, 아직 차시가 없어 저장되지 않은 챕터(클라이언트 전용)를 지킨다. */
function keepEmptyChapters(next: Chapter[], prev: Chapter[]): Chapter[] {
  const known = new Set(next.map((c) => c.key));
  const orphans = prev.filter((c) => c.key !== INBOX && c.lessonIds.length === 0 && !known.has(c.key));
  return [...next, ...orphans];
}

export default function CurriculumBoard({
  courseId,
  lessons,
  onError,
}: {
  courseId: string;
  lessons: AdminLesson[];
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const { busy, runMutation } = useAdminMutation();

  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const [chapters, setChapters] = useState<Chapter[]>(() => derive(lessons));

  // 서버 상태가 바뀌면(추가·삭제·순서 저장 후 refresh) 화면 모델을 다시 만든다.
  const signature = lessons.map((l) => `${l.id}:${l.chapterIndex}:${l.orderIndex}`).join('|');
  // biome-ignore lint/correctness/useExhaustiveDependencies: signature가 lessons의 의미상 지문이다.
  useEffect(() => {
    setChapters((prev) => keepEmptyChapters(derive(lessons), prev));
  }, [signature]);

  const refresh = useCallback(() => router.refresh(), [router]);
  const { uploads, upload, resume } = useVideoUpload(refresh);

  // 인코딩 도중 화면을 떠났던 업로드를 재진입 시 이어서 확인한다(웹훅이 없어 폴링이 유일한 경로).
  const resumedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const l of lessons) {
      if (l.pendingUploadId && !resumedRef.current.has(l.id)) {
        resumedRef.current.add(l.id);
        resume(l.id, l.pendingUploadId);
      }
    }
  }, [lessons, resume]);

  const [pendingLessonDelete, setPendingLessonDelete] = useState<string | null>(null);
  const [pendingMaterialDelete, setPendingMaterialDelete] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** 화면 모델을 그대로 서버에 확정한다(보관함=0, 나머지는 표시 순서대로 1..N). */
  const save = useCallback(
    async (next: Chapter[]) => {
      const payload = next
        .map((c, i) => ({
          index: c.key === INBOX ? 0 : i,
          titleKo: c.titleKo,
          lessonIds: c.lessonIds,
        }))
        .filter((c) => c.lessonIds.length > 0);
      if (payload.length === 0) return;
      await runMutation(() =>
        fetch('/api/admin/lessons/arrange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, chapters: payload }),
        }),
      );
    },
    [courseId, runMutation],
  );

  /** 낙관적 반영 후 저장 — 드래그는 즉시 반응해야 한다. */
  const applyAndSave = (next: Chapter[]) => {
    setChapters(next);
    void save(next);
  };

  const findChapter = (list: Chapter[], lessonId: string) =>
    list.findIndex((c) => c.lessonIds.includes(lessonId));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const next = chapters.map((c) => ({ ...c, lessonIds: [...c.lessonIds] }));
    const from = findChapter(next, activeId);
    if (from === -1) return;

    // 드롭 대상은 다른 차시(그 자리에 끼움)이거나 챕터 컨테이너(맨 끝에 붙임)다.
    const containerKey = overId.startsWith('container:') ? overId.slice('container:'.length) : null;
    const to = containerKey
      ? next.findIndex((c) => c.key === containerKey)
      : findChapter(next, overId);
    if (to === -1) return;

    next[from].lessonIds = next[from].lessonIds.filter((id) => id !== activeId);
    const insertAt = containerKey
      ? next[to].lessonIds.length
      : Math.max(0, next[to].lessonIds.indexOf(overId));
    next[to].lessonIds.splice(insertAt, 0, activeId);

    applyAndSave(next);
  };

  /**
   * 키보드·클릭 대체 수단. 커리큘럼 전체 순서 기준으로 한 칸 움직이며,
   * 이웃이 다른 챕터면 그 챕터로 옮겨간다(평면 목록처럼 자연스럽게).
   */
  const move = (lessonId: string, dir: -1 | 1) => {
    const next = chapters.map((c) => ({ ...c, lessonIds: [...c.lessonIds] }));
    const ci = findChapter(next, lessonId);
    if (ci === -1) return;
    const li = next[ci].lessonIds.indexOf(lessonId);
    const target = li + dir;

    if (target >= 0 && target < next[ci].lessonIds.length) {
      // 같은 챕터 안에서 자리 교환.
      [next[ci].lessonIds[li], next[ci].lessonIds[target]] = [
        next[ci].lessonIds[target],
        next[ci].lessonIds[li],
      ];
      applyAndSave(next);
      return;
    }

    // 챕터 경계 — 이웃 챕터의 끝(위로) 또는 앞(아래로)으로 넘어간다.
    const neighbor = ci + dir;
    if (neighbor < 0 || neighbor >= next.length) return;
    next[ci].lessonIds.splice(li, 1);
    if (dir === -1) next[neighbor].lessonIds.push(lessonId);
    else next[neighbor].lessonIds.unshift(lessonId);
    applyAndSave(next);
  };

  const patch = async (lessonId: string, body: Record<string, unknown>) => {
    await runMutation(() =>
      fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  };

  const removeLesson = async (lessonId: string) => {
    setPendingLessonDelete(null);
    await runMutation(() => fetch(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' }), {
      successMessage: '차시를 삭제했습니다.',
    });
  };

  const removeMaterial = async (materialId: string) => {
    setPendingMaterialDelete(null);
    await runMutation(() => fetch(`/api/admin/materials/${materialId}`, { method: 'DELETE' }), {
      successMessage: '자료를 삭제했습니다.',
    });
  };

  /**
   * 영상 파일 N개 → 보관함 차시 N개를 만들고 각각 업로드를 건다.
   *
   * 차시 행을 먼저 만드는 이유: Direct Upload 발급이 lessonId를 요구하고, 진행 상태(uploadId)도
   * 그 행에 기록해 두어야 화면을 떠났다 돌아와도 이어볼 수 있다.
   */
  const addVideos = async (files: File[]) => {
    if (files.length === 0) return;
    setCreating(true);
    try {
      for (const file of files) {
        const res = await fetch('/api/admin/lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            titleKo: file.name.replace(/\.[^.]+$/, '').slice(0, 200) || '새 차시',
            chapterIndex: 0, // 보관함
          }),
        });
        if (!res.ok) {
          onError(await readError(res));
          return;
        }
        const { id } = (await res.json()) as { id: string };
        upload(id, file);
      }
      router.refresh();
    } catch {
      onError('차시를 만들지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setCreating(false);
    }
  };

  const addEmptyLesson = async () => {
    const ok = await runMutation(() =>
      fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, titleKo: '새 차시', chapterIndex: 0 }),
      }),
    );
    if (!ok) return;
  };

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      { key: `new-${crypto.randomUUID()}`, titleKo: '새 챕터', lessonIds: [] },
    ]);
  };

  const renameChapter = (key: string, titleKo: string) => {
    setChapters((prev) => prev.map((c) => (c.key === key ? { ...c, titleKo } : c)));
  };

  const commitChapterTitle = () => {
    void save(chapters);
  };

  const dropChapter = (key: string) => {
    setChapters((prev) => prev.filter((c) => c.key !== key));
  };

  // 커리큘럼 전체 순번(보관함 차시는 순번을 주지 않는다 — 아직 커리큘럼이 아니다).
  let counter = 0;
  const positions = new Map<string, number>();
  for (const c of chapters) {
    for (const id of c.lessonIds) {
      positions.set(id, c.key === INBOX ? 0 : ++counter);
    }
  }
  const flat = chapters.flatMap((c) => c.lessonIds);

  return (
    <div className="space-y-4">
      {/* 영상 다중 업로드 드롭존 */}
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          setDropActive(false);
          const files = Array.from(e.dataTransfer.files ?? []).filter((f) =>
            f.type.startsWith('video/'),
          );
          if (files.length === 0) {
            onError('영상 파일만 등록할 수 있습니다.');
            return;
          }
          void addVideos(files);
        }}
        className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dropActive ? 'border-terracotta bg-terracotta/5' : 'border-brown-light bg-white'
        }`}
      >
        <p className="text-xs font-semibold text-brown-medium mb-1">
          영상 파일을 이곳에 끌어다 놓으세요 — 여러 개를 한 번에 올릴 수 있습니다.
        </p>
        <p className="text-[11px] text-brown-medium/70 mb-3">
          올린 영상은 아래 <strong>보관함</strong>에 차시로 쌓이고, 챕터로 끌어다 배치하면 됩니다.
          재생시간은 인코딩이 끝나면 자동으로 채워집니다.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={creating}
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-2 bg-terracotta text-white text-[11px] font-bold rounded-lg hover:bg-terracotta-deep disabled:opacity-50 cursor-pointer"
          >
            <Upload size={12} aria-hidden /> {creating ? '등록 중…' : '영상 선택 (다중)'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={addEmptyLesson}
            className="inline-flex items-center gap-1 px-3 py-2 bg-cream border border-brown-light text-brown-medium text-[11px] font-bold rounded-lg hover:border-terracotta disabled:opacity-50 cursor-pointer"
          >
            <Plus size={12} aria-hidden /> 빈 차시 추가
          </button>
          <button
            type="button"
            onClick={addChapter}
            className="inline-flex items-center gap-1 px-3 py-2 bg-cream border border-brown-light text-brown-medium text-[11px] font-bold rounded-lg hover:border-terracotta cursor-pointer"
          >
            <FolderPlus size={12} aria-hidden /> 챕터 추가
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="space-y-4">
          {chapters.map((chapter, index) => (
            <ChapterColumn
              key={chapter.key}
              chapter={chapter}
              order={index}
              busy={busy}
              onRename={renameChapter}
              onCommitTitle={commitChapterTitle}
              onDrop={dropChapter}
            >
              <SortableContext items={chapter.lessonIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {chapter.lessonIds.map((id) => {
                    const lesson = byId.get(id);
                    if (!lesson) return null;
                    const flatIndex = flat.indexOf(id);
                    return (
                      <LessonCard
                        key={id}
                        lesson={lesson}
                        position={positions.get(id) ?? 0}
                        upload={uploads[id]}
                        busy={busy}
                        canMoveUp={flatIndex > 0}
                        canMoveDown={flatIndex < flat.length - 1}
                        onMove={move}
                        onPickVideo={(lessonId) => {
                          replaceTargetRef.current = lessonId;
                          replaceInputRef.current?.click();
                        }}
                        onPatch={patch}
                        onDelete={setPendingLessonDelete}
                        onDeleteMaterial={setPendingMaterialDelete}
                        onError={onError}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </ChapterColumn>
          ))}
        </div>
      </DndContext>

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ''; // 같은 파일 재선택 허용
          void addVideos(files);
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const lessonId = replaceTargetRef.current;
          e.target.value = '';
          if (file && lessonId) upload(lessonId, file);
        }}
      />

      <ConfirmDialog
        open={pendingLessonDelete !== null}
        title="차시를 삭제할까요?"
        description="되돌릴 수 없습니다. 업로드된 영상과 자료 연결도 함께 사라집니다."
        confirmLabel="삭제"
        destructive
        busy={busy}
        onConfirm={() => pendingLessonDelete && removeLesson(pendingLessonDelete)}
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

/** 챕터 한 칸 — 비어 있어도 드롭 대상이어야 하므로 컨테이너 자체를 droppable로 둔다. */
function ChapterColumn({
  chapter,
  order,
  busy,
  onRename,
  onCommitTitle,
  onDrop,
  children,
}: {
  chapter: Chapter;
  order: number;
  busy: boolean;
  onRename: (key: string, title: string) => void;
  onCommitTitle: () => void;
  onDrop: (key: string) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `container:${chapter.key}` });
  const isInbox = chapter.key === INBOX;

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition-colors ${
        isOver ? 'border-terracotta bg-terracotta/5' : 'border-brown-light bg-cream/60'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isInbox ? (
          <h3 className="text-xs font-bold text-brown-medium uppercase tracking-wider">
            보관함 · 미배치 영상 ({chapter.lessonIds.length})
          </h3>
        ) : (
          <>
            <span className="text-xs font-bold text-gold-deep shrink-0">챕터 {order}</span>
            <input
              type="text"
              value={chapter.titleKo}
              onChange={(e) => onRename(chapter.key, e.target.value)}
              onBlur={onCommitTitle}
              aria-label={`챕터 ${order} 제목`}
              disabled={busy}
              className="min-w-0 flex-1 px-2 py-1 text-sm font-bold text-brown bg-transparent border border-transparent hover:border-brown-light rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            {chapter.lessonIds.length === 0 && (
              <button
                type="button"
                onClick={() => onDrop(chapter.key)}
                aria-label={`빈 챕터 ${order} 제거`}
                className="text-brown-medium/60 hover:text-terracotta shrink-0"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            )}
          </>
        )}
      </div>

      {chapter.lessonIds.length === 0 ? (
        <p className="text-[11px] text-brown-medium/60 py-4 text-center">
          {isInbox
            ? '미배치 영상이 없습니다.'
            : '이 챕터로 차시를 끌어다 놓으세요. (비어 있으면 저장되지 않습니다)'}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
