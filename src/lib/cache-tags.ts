/**
 * Next Data Cache 태그 (DC-51).
 *
 * 공개 카탈로그 조회(`lib/catalog.ts`)는 `unstable_cache`로 이 태그를 달고 캐시되며,
 * 운영자 쓰기 라우트가 성공 직후 `revalidateTag`로 무효화한다.
 * 태그를 붙이는 곳과 지우는 곳이 문자열로 흩어지면 조용히 어긋나므로 상수로만 참조할 것.
 *
 * 단일 태그로 시작한다 — `course_catalog` 뷰가 차시 수·평점·후기 수를 집계하므로
 * 차시/후기 변경도 결국 목록 카드에 반영돼야 하고, 코스별로 쪼개도 대부분 함께 무효화된다.
 * 클래스 수가 늘어 무효화 비용이 문제되면 그때 `course:${id}` 단위로 세분화한다.
 */
export const CATALOG_TAG = 'catalog';

/**
 * 도서 판매 링크 오버라이드(`lib/books.ts`) 전용 태그.
 *
 * 카탈로그 태그와 섞지 않는다 — 도서는 `course_catalog` 뷰와 아무 관계가 없고, 링크 하나를
 * 고쳤다고 클래스 목록 캐시까지 버릴 이유가 없다.
 */
export const BOOKS_TAG = 'books';
