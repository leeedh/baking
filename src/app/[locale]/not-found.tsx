import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { Croissant } from 'lucide-react';

/**
 * 브랜드 404. notFound()를 호출하는 페이지(classes/[id]·checkout/[id]·
 * admin/courses/[id]·layout)가 여기로 떨어진다.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 text-gold flex items-center justify-center">
          <Croissant size={26} />
        </div>
        <p className="text-xs font-bold text-gold tracking-[0.3em] uppercase">404</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brown break-keep">
          찾으시는 페이지가 없습니다
        </h1>
        <p className="text-xs sm:text-sm text-brown-medium font-light leading-relaxed break-keep">
          주소가 바뀌었거나 판매가 종료된 클래스일 수 있습니다. 전체 라인업에서 다시 찾아보세요.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
          <Link href="/classes" className={buttonClasses()}>
            온라인 클래스 보기
          </Link>
          <Link href="/" className={buttonClasses('outline')}>
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
