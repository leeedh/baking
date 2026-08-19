'use client';

import { useAdminMutation } from '@/hooks/useAdminMutation';
import { COURSE_CATEGORIES } from '@/lib/course-categories';
import type { AdminCourseInfo } from '@/types';
import { useState } from 'react';

const INPUT =
  'w-full px-3 py-2 border border-brown-light rounded-lg text-xs bg-white ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const LABEL = 'block text-[11px] font-bold text-brown-medium uppercase mb-1';

const LEVELS = ['초급', '중급', '상급'] as const;

/**
 * 클래스 기본 정보 편집. 예전에는 등록 모달에서 제목·직함·가격만 받고 그 뒤로는
 * 고칠 화면이 아예 없었다(설명·카테고리·난이도는 seed로만 들어갔다).
 *
 * en 입력란을 함께 두는 이유: PATCH가 jsonb {ko,en}을 병합 저장하므로 여기서 en을 비워두면
 * 기존 번역이 남는다. 강좌 콘텐츠 영문화 자체는 별건이다(DC-108).
 */
export default function CourseInfoForm({ course }: { course: AdminCourseInfo }) {
  const { busy, error, setError, runMutation } = useAdminMutation();

  const [form, setForm] = useState({
    titleKo: course.titleKo,
    titleEn: course.titleEn,
    descriptionKo: course.descriptionKo,
    descriptionEn: course.descriptionEn,
    instructorTitleKo: course.instructorTitleKo,
    category: course.category,
    level: course.level,
    // 가격은 문자열로 들고 있는다 — number state면 Number('')가 0이 되어 필드를 비울 수
    // 없고, 화면에 남은 0 뒤로 타이핑하게 된다(500 입력이 0500이 되던 결함).
    priceKrw: String(course.priceKrw),
    listPriceKrw: course.listPriceKrw ? String(course.listPriceKrw) : '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titleKo.trim()) {
      setError('클래스 명칭을 입력해 주세요.');
      return;
    }

    const priceKrw = Number(form.priceKrw);
    if (form.priceKrw.trim() === '' || !Number.isInteger(priceKrw) || priceKrw < 0) {
      setError('판매가를 0 이상의 정수로 입력해 주세요.');
      return;
    }

    // 빈 값 = 정가 표시 안 함. 값이 있으면 숫자여야 한다.
    const hasListPrice = form.listPriceKrw.trim() !== '';
    const listPriceKrw = hasListPrice ? Number(form.listPriceKrw) : null;
    if (listPriceKrw !== null && (!Number.isInteger(listPriceKrw) || listPriceKrw < 0)) {
      setError('정가를 0 이상의 정수로 입력해 주세요.');
      return;
    }

    await runMutation(
      () =>
        fetch(`/api/admin/courses/${course.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titleKo: form.titleKo.trim(),
            titleEn: form.titleEn.trim(),
            descriptionKo: form.descriptionKo.trim(),
            descriptionEn: form.descriptionEn.trim(),
            instructorTitleKo: form.instructorTitleKo.trim(),
            // 빈 문자열은 "선택 안 함" → null로 저장해야 카탈로그 필터에 걸리지 않는다.
            category: form.category || null,
            level: form.level || null,
            priceKrw,
            listPriceKrw: listPriceKrw && listPriceKrw > 0 ? listPriceKrw : null,
          }),
        }),
      { successMessage: '클래스 정보를 저장했습니다.' },
    );
  };

  return (
    <form onSubmit={save} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs font-semibold text-terracotta-deep"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={LABEL}>클래스 명칭 (한국어)</span>
          <input
            type="text"
            value={form.titleKo}
            onChange={(e) => set('titleKo', e.target.value)}
            required
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className={LABEL}>클래스 명칭 (English)</span>
          <input
            type="text"
            value={form.titleEn}
            onChange={(e) => set('titleEn', e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={LABEL}>클래스 소개 (한국어)</span>
          <textarea
            value={form.descriptionKo}
            onChange={(e) => set('descriptionKo', e.target.value)}
            rows={4}
            className={INPUT}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>클래스 소개 (English)</span>
          <textarea
            value={form.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
            rows={3}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>강사 직함</span>
          <input
            type="text"
            value={form.instructorTitleKo}
            onChange={(e) => set('instructorTitleKo', e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>카테고리</span>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className={INPUT}
          >
            <option value="">선택 안 함</option>
            {COURSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>난이도</span>
          <select
            value={form.level}
            onChange={(e) => set('level', e.target.value)}
            className={INPUT}
          >
            <option value="">선택 안 함</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>판매가 (KRW ₩)</span>
          <input
            type="number"
            min={0}
            value={form.priceKrw}
            onChange={(e) => set('priceKrw', e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>정가 (비워두면 표시 안 함)</span>
          <input
            type="number"
            min={0}
            value={form.listPriceKrw}
            onChange={(e) => set('listPriceKrw', e.target.value)}
            className={INPUT}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="px-4 py-2 bg-terracotta text-white text-xs font-bold rounded-lg hover:bg-terracotta-deep disabled:opacity-50 cursor-pointer"
      >
        {busy ? '저장 중…' : '클래스 정보 저장'}
      </button>
    </form>
  );
}
