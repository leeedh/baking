import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  /** 랜드마크 라벨링용. 부모 <section>의 aria-labelledby가 이 id를 가리킨다. */
  id?: string;
  /** 대문자 트래킹 라벨. 헤딩이 아니라 <p>다 — 이전에는 <h2>로 두어 헤딩 순서가 역전됐다. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** 우측 액션(주로 "전체 보기" 링크). */
  action?: ReactNode;
  /** 하단 구분선 표시 여부. */
  divider?: boolean;
  className?: string;
}

/** BestClasses·ClassCatalogGrid·StudentArchive가 각자 복붙하던 섹션 헤딩 블록. */
export default function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  divider = true,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12',
        divider && 'border-b border-brown-light/70 pb-6',
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-bold text-gold tracking-widest uppercase">{eyebrow}</p>
        )}
        <h2 id={id} className="font-serif text-3xl sm:text-4xl font-bold text-brown break-keep">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-brown-medium font-light break-keep">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
