import { BOOKS, type BookSource } from '@/lib/books-data';
import { pickLocale } from '@/lib/i18n-json';

/**
 * 도서는 **외부 커머스(쿠팡)에서 판매**한다 — 자체 주문·결제·배송이 없다. 데이터는 정적
 * 큐레이션 상수(`books-data.ts`)에서 오며, 화면은 정보 노출 + 외부 링크 이동만 담당한다.
 */
export interface BookView {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  /** "이 책에서 배우는 것" 목록(로케일 적용). */
  chapters: string[];
  thumbnail: string;
  price: number;
  listPrice: number;
  /** price/listPrice에서 파생한 할인율(정수 %). listPrice가 없거나 더 작으면 0. */
  discountPercent: number;
  externalPurchaseUrl: string;
  /** 판매 URL이 준비된 경우만 CTA 활성화(플레이스홀더/빈값이면 비활성). */
  isPurchaseUrlReady: boolean;
}

function toBookView(book: BookSource, locale: string): BookView {
  const { price, listPrice } = book;
  const discountPercent =
    listPrice > price && listPrice > 0 ? Math.round((1 - price / listPrice) * 100) : 0;
  const url = book.externalPurchaseUrl ?? '';
  return {
    slug: book.slug,
    title: pickLocale(book.title, locale),
    subtitle: pickLocale(book.subtitle, locale),
    description: pickLocale(book.description, locale),
    chapters: book.highlights.map((h) => pickLocale(h, locale)).filter((s) => s.length > 0),
    thumbnail: book.thumbnail,
    price,
    listPrice,
    discountPercent,
    externalPurchaseUrl: url,
    isPurchaseUrlReady: url.length > 0 && !url.includes('PLACEHOLDER'),
  };
}

/**
 * 추천 도서 목록 — 정적 큐레이션 상수를 현재 로케일로 매핑해 반환한다.
 * (async 시그니처 유지: 서버 컴포넌트 페이지가 그대로 await 하도록.)
 */
export async function getBooks(locale: string): Promise<BookView[]> {
  return BOOKS.map((book) => toBookView(book, locale));
}
