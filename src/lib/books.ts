import { BOOKS, type BookSource } from '@/lib/books-data';
import { BOOKS_TAG } from '@/lib/cache-tags';
import { pickLocale } from '@/lib/i18n-json';
import { createPublicClient } from '@/lib/supabase/public';
import { unstable_cache } from 'next/cache';

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

function toBookView(book: BookSource, locale: string, overrideUrl?: string): BookView {
  const { price, listPrice } = book;
  const discountPercent =
    listPrice > price && listPrice > 0 ? Math.round((1 - price / listPrice) * 100) : 0;
  const url = overrideUrl ?? book.externalPurchaseUrl ?? '';
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
 * 운영자가 화면에서 고친 판매 링크(slug → URL).
 *
 * 도서의 소개 문구·표지·가격은 계속 정적 상수다(큐레이션이라 코드로 관리하는 편이 낫다).
 * **판매 링크만** DB에 둔다 — 쿠팡 파트너스 링크는 가장 자주 끊기고 파라미터가 바뀌는데,
 * 그때마다 배포를 기다릴 수는 없기 때문이다.
 *
 * 캐시 안에서는 쿠키를 읽으면 안 되므로 `createPublicClient()`만 쓴다(CLAUDE.md).
 */
const getPurchaseUrlOverrides = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('books')
      .select('slug, external_purchase_url')
      .eq('status', 'published');
    // 오버라이드는 부가 기능이다 — 조회가 실패해도 상점을 비우지 않고 정적 링크로 돌아간다.
    if (error || !data) return {};
    return Object.fromEntries(
      data.filter((row) => !!row.external_purchase_url).map((row) => [row.slug, row.external_purchase_url]),
    );
  },
  ['book-purchase-urls'],
  { tags: [BOOKS_TAG], revalidate: 3600 },
);

/**
 * 추천 도서 목록 — 정적 큐레이션 상수를 현재 로케일로 매핑하고, 운영자가 고친 판매 링크가
 * 있으면 그 URL로 갈아 끼워 반환한다.
 */
export async function getBooks(locale: string): Promise<BookView[]> {
  const overrides = await getPurchaseUrlOverrides();
  return BOOKS.map((book) => toBookView(book, locale, overrides[book.slug]));
}
