'use client';

import { useRouter } from '@/i18n/navigation';
import type { EnrolledCourse } from '@/lib/catalog';
import {
  Award,
  BookOpen,
  FolderLock,
  Layers,
  Play,
  PlusCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

interface MyClassesScreenProps {
  /** 서버에서 조회한 활성 수강권 코스 (카탈로그 메타 + 진도율). */
  courses: EnrolledCourse[];
}

export default function MyClassesScreen({ courses: purchasedClasses }: MyClassesScreenProps) {
  const router = useRouter();
  const t = useTranslations('myclasses');
  // 목록 본체는 /classes다 — 홈은 브랜드 게이트웨이라 그리드가 없다(DC-96, 코드리뷰 M-9).
  const onNavigateToCatalog = () => router.push('/classes');
  const onResumeClass = (classId: string) => router.push(`/learn/${classId}`);
  return (
    <div
      id="my-classes-screen"
      className="bg-cream py-12 px-4 sm:px-8 max-w-7xl mx-auto min-h-[70vh]"
    >
      {/* Title */}
      <div className="mb-10 text-center sm:text-left">
        <span className="text-xs font-bold text-gold tracking-widest uppercase block mb-1">
          {t('eyebrow')}
        </span>
        <h1 className="font-serif text-3xl font-bold text-brown flex flex-col sm:flex-row items-center gap-2">
          {t('title')}
          <span className="text-xs font-sans font-semibold bg-terracotta text-white px-2.5 py-0.5 rounded-full">
            {t('countBadge', { count: purchasedClasses.length })}
          </span>
        </h1>
        <p className="text-xs text-brown-medium mt-1">
          {t('subtitle')}
        </p>
      </div>

      {purchasedClasses.length === 0 ? (
        /* 1. GORGEOUS EMPTY STATE CASE */
        <div
          id="empty-classes-card"
          className="max-w-xl mx-auto bg-white rounded-2xl border border-brown-light p-10 text-center space-y-6 shadow-md transform hover:scale-[1.01] transition-transform duration-300"
        >
          <div className="w-16 h-16 rounded-full bg-cream text-gold flex items-center justify-center mx-auto border border-brown-light">
            <FolderLock size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-brown">
              {t('emptyTitle')}
            </h3>
            <p className="text-xs text-brown-medium leading-relaxed max-w-md mx-auto">
              {t('emptyBody')}
            </p>
          </div>

          <div className="h-px bg-brown-light my-4" />

          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-terracotta block tracking-widest">
              {t('recommendTitle')}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="bg-cream p-3 rounded-lg text-left border border-brown-light cursor-pointer hover:border-terracotta transition-colors"
                onClick={onNavigateToCatalog}
              >
                <span className="text-[10px] text-gold font-semibold block">{t('recommend1Tag')}</span>
                <span className="text-xs font-bold text-brown block truncate">
                  {t('recommend1Name')}
                </span>
              </div>
              <div
                className="bg-cream p-3 rounded-lg text-left border border-brown-light cursor-pointer hover:border-gold transition-colors"
                onClick={onNavigateToCatalog}
              >
                <span className="text-[10px] text-terracotta font-semibold block">
                  {t('recommend2Tag')}
                </span>
                <span className="text-xs font-bold text-brown block truncate">
                  {t('recommend2Name')}
                </span>
              </div>
            </div>
          </div>

          <button
            id="empty-go-baking"
            onClick={onNavigateToCatalog}
            className="w-full sm:w-auto px-8 py-3 bg-terracotta hover:bg-terracotta-deep text-cream font-semibold text-xs rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} /> {t('emptyCta')}
          </button>
        </div>
      ) : (
        /* 2. INSTALLED OWNED CLASS CARDS */
        <div
          id="owned-grid-wrapper"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {purchasedClasses.map((cls) => {
            const progress = cls.progressPercent;

            return (
              <div
                id={`my-class-card-${cls.id}`}
                key={cls.id}
                className="bg-white rounded-2xl border-2 border-brown-light overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group hover:border-terracotta"
              >
                <div className="relative aspect-[16/10] bg-cream overflow-hidden">
                  <img
                    referrerPolicy="no-referrer"
                    src={cls.thumbnail}
                    alt={cls.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />

                  {/* Category overlay */}
                  <span className="absolute top-3 left-3 bg-brown text-cream text-[9px] font-bold px-2 py-0.5 rounded tracking-wide">
                    {cls.category}
                  </span>

                  {/* LIFETIME GUARANTEE BADGE (영구소장 배지) */}
                  <span className="absolute top-3 right-3 bg-terracotta text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow border border-cream/40">
                    {t('lifetimeBadge')}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Instructor Info */}
                    <div className="text-xs text-brown-medium">
                      <span>{t('instructorPrefix')}</span>
                      <strong className="text-terracotta font-bold">
                        {t('chefName', { name: cls.instructor })}
                      </strong>
                    </div>

                    {/* Class Title */}
                    <h3 className="font-serif text-base font-bold text-brown line-clamp-2">
                      {cls.title}
                    </h3>

                    {/* PROGRESS BAR WIDGET (진도율 바) */}
                    <div className="space-y-1 bg-cream p-3 rounded-xl border border-brown-light">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-brown-medium">{t('progressLabel')}</span>
                        <span className="text-terracotta font-mono">
                          {t('progressPercent', { percent: progress })}
                        </span>
                      </div>
                      <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-brown-light/60">
                        <div
                          className="bg-terracotta h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-brown-medium/60 pt-0.5">
                        <span>{progress === 0 ? t('statusNotStarted') : t('statusInProgress')}</span>
                        <span>{cls.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER CTA RESUME WATCH LIST */}
                  <div className="pt-4 mt-4 border-t border-brown-light flex items-center justify-between">
                    <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded font-semibold">
                      {t('pdfBadge')}
                    </span>

                    <button
                      id={`btn-resume-${cls.id}`}
                      onClick={() => onResumeClass(cls.id)}
                      className="px-4 py-2 bg-brown hover:bg-terracotta text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Play size={12} className="fill-white" />
                      {progress === 0 ? t('ctaStart') : t('ctaResume')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
