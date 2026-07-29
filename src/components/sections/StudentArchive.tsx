'use client';

import { useRouter } from '@/i18n/navigation';
import { Star } from 'lucide-react';
import { useState } from 'react';

// Mock Student Baked Masterpieces Data
const STUDENT_WORKS = [
  {
    id: 'sw-1',
    title: '로즈골드 빛 카라멜 오리지널 마들렌',
    studentName: '최지원 수강생',
    classTitle: '카라멜 테라코타 구움과자 클래스',
    classNameId: 'class-cookies',
    comment:
      '탄 버터 온도를 정확하게 시각적으로 비교해 주는 덕분에 생전 처음으로 배꼽이 예쁘게 올라오고 버터 풍미 가득한 마들렌이 상업 오븐 없이도 완벽하게 완성됐어요!',
    imageUrl:
      'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&q=80&w=600',
    tag: '클래식 구움과자',
  },
  {
    id: 'sw-2',
    title: '영롱한 할로우 프리 꼬끄 & 무화과 가나슈 마카롱',
    studentName: '이지연 수강생',
    classTitle: '피에르 마카롱 마스터 클래스',
    classNameId: 'class-macarons',
    comment:
      '동영상 일시정지 해가며 습도 분석을 고수했더니, 그동안 골머리 썩히던 마카로나쥬 꼬끄 과건조나 오븐 불균형 구정이 드디어 정복됐어요. 대만족!',
    imageUrl:
      'https://images.unsplash.com/photo-1558961309-dbdf71799f14?auto=format&fit=crop&q=80&w=600',
    tag: '정통 프렌치 디저트',
  },
  {
    id: 'sw-3',
    title: '계절 과일 가득 사블레 파트 생또노레',
    studentName: 'Marcia Liu (대만 수강생)',
    classTitle: '타르트 에디토리얼 마르탱 클래스',
    classNameId: 'class-tart',
    comment:
      '폰사주 과정이 가이드라인 덕에 매우 단단하게 완성되어 구워도 무너지지 않았습니다! 크레뫼 바닐라 크림의 고급스러운 맛은 단연 현지 디저트 숍 이상입니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1464305795204-6f5bdf7f8141?auto=format&fit=crop&q=80&w=600',
    tag: '모던 타르트',
  },
  {
    id: 'sw-4',
    title: '쫀득함이 살아있는 골든 피스톤 쿠키 컬렉션',
    studentName: '황시현 카페 대표',
    classTitle: '카라멜 테라코타 구움과자 클래스',
    classNameId: 'class-cookies',
    comment:
      '구움과자 라인에 솔티드 오리지널 쿠키를 추가하자마자 매장 배달 및 현장 판매량이 150% 가량 수직 신장했습니다. 원가 계산 전용 PDF 엑셀이 아주 요긴했어요.',
    imageUrl:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600',
    tag: '클래식 구움과자',
  },
];

const ARCHIVE_CATEGORIES = ['All', '정통 프렌치 디저트', '클래식 구움과자', '모던 타르트'];

// DC-96 · 수강생 실습 아카이브. 홈(게이트웨이)의 신뢰 형성 섹션.
export default function StudentArchive() {
  const router = useRouter();
  const [activeArchiveCategory, setActiveArchiveCategory] = useState('All');

  const filteredStudentWorks = STUDENT_WORKS.filter(
    (work) => activeArchiveCategory === 'All' || work.tag === activeArchiveCategory,
  );

  return (
    <section className="py-20 px-6 sm:px-12 bg-white/70 border-t border-b border-[#EFE8DC]/60">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#B1863C] tracking-widest uppercase">
              Student Achievements
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A211B] tracking-tight">
              수강생 실습 아카이브
            </h2>
            <p className="text-xs sm:text-sm text-[#5F4E43] font-light">
              Atelier Crème 오리지널 교육과정을 수강하고 가내 스튜디오 및 상업 오븐에서 직접 구워낸
              리얼 포토 후기입니다.
            </p>
          </div>

          {/* Sub category filter tabs simple state */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            {ARCHIVE_CATEGORIES.map((fTag) => (
              <button
                type="button"
                key={fTag}
                onClick={() => setActiveArchiveCategory(fTag)}
                className={`px-3 py-2 min-h-[36px] rounded-lg transition-all font-medium cursor-pointer ${
                  activeArchiveCategory === fTag
                    ? 'bg-[#B0863C] text-white'
                    : 'bg-[#FAF4EA] text-[#5F4E43] hover:bg-gray-100'
                }`}
              >
                {fTag === 'All' ? '전체 실습작' : fTag}
              </button>
            ))}
          </div>
        </div>

        {/* Student Work Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStudentWorks.map((work) => (
            <div
              key={work.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#EFE8DC] shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Photo frame with zoom */}
              <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF4EA]">
                <img
                  referrerPolicy="no-referrer"
                  src={work.imageUrl}
                  alt={work.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-[#FAF4EA] text-[9px] font-medium px-2 py-0.5 rounded">
                  {work.tag}
                </span>
              </div>

              {/* Info and commentary */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-[#2A211B]">
                      {work.studentName}
                    </span>
                    <div className="flex text-[#B0863C]">
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                    </div>
                  </div>
                  <span className="block text-[10px] text-[#B0863C] font-semibold">
                    {work.classTitle}
                  </span>
                  <h4 className="font-serif text-sm font-semibold text-[#2A211B] line-clamp-1 pt-1">
                    {work.title}
                  </h4>
                  <p className="text-[11.5px] text-[#5F4E43] leading-relaxed font-light line-clamp-4 pt-1">
                    “{work.comment}”
                  </p>
                </div>

                <div className="pt-2 border-t border-[#FAF4EA] flex items-center justify-between text-[10px] text-[#5F4E43]/50">
                  <span>Atelier Verified student</span>
                  <button
                    type="button"
                    onClick={() => router.push(`/classes/${work.classNameId}`)}
                    className="text-[#B65538] hover:underline font-bold"
                  >
                    강의 구경
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
