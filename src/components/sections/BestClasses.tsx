'use client';

import { Link } from '@/i18n/navigation';
import { ChevronRight } from 'lucide-react';
import type { ClassItem } from '../../types';
import ClassCard from './ClassCard';

interface BestClassesProps {
  classes: ClassItem[];
}

// DC-96 · 홈 게이트웨이의 "베스트 클래스" 블록. 평점 상위 3개만 보여주고 /classes로 넘긴다.
export default function BestClasses({ classes }: BestClassesProps) {
  const best = [...classes].sort((a, b) => b.rating - a.rating).slice(0, 3);

  if (best.length === 0) return null;

  return (
    <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-brown-light/70 pb-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-gold tracking-widest uppercase">
            Best Selection
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brown">
            지금 가장 사랑받는 클래스
          </h2>
          <p className="text-xs sm:text-sm text-brown-medium font-light">
            수강생 평점이 가장 높은 세 개의 마스터 코스입니다. 전체 라인업은 온라인 클래스에서
            확인하세요.
          </p>
        </div>

        <Link
          href="/classes"
          className="inline-flex items-center gap-1 px-5 py-3 bg-brown hover:bg-terracotta text-cream text-xs font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
        >
          <span>전체 클래스 보기</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {best.map((cls) => (
          <ClassCard key={cls.id} cls={cls} />
        ))}
      </div>
    </section>
  );
}
