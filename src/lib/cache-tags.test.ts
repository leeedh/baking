import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG_TAG } from './cache-tags';

// =============================================================================
// DC-51 · 카탈로그 캐시 무효화 회귀 방지
//
// getCatalog / getPublicCourseDetail은 Data Cache에 얹혀 있고, 정확성은 전적으로
// 쓰기 라우트의 revalidateTag(CATALOG_TAG) 호출에 달려 있다. 그 호출을 빠뜨려도
// 타입 검사도 린트도 아무 말을 하지 않는다 — 운영자가 가격을 고쳤는데 최대 1시간
// 동안 옛 가격이 그대로 팔리는 결함이 조용히 들어온다.
//
// 그래서 "course_catalog 뷰에 반영되는 테이블을 쓰는 라우트는 반드시 무효화한다"를
// 소스 스캔으로 잠근다. 새 라우트가 늘어도 자동으로 감시 대상이 된다.
// =============================================================================

const API_DIR = join(process.cwd(), 'src', 'app', 'api');

/** course_catalog 뷰(집계 포함)에 반영되는 테이블 — 이 테이블을 쓰면 카탈로그가 낡는다. */
const CATALOG_BACKED_TABLES = ['courses', 'lessons', 'reviews'];

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

/**
 * 카탈로그 반영 테이블에 대신 써 주는 공용 헬퍼.
 *
 * DC-111에서 영상 연결 저장을 세 경로(폴링·수동 복구·웹훅)가 공유하는 함수로 모으자,
 * 라우트 본문에서 .from('lessons').update( 가 사라져 **감시 대상에서 조용히 빠졌다**
 * (11건 → 9건). 검사는 계속 통과하는데 지켜보던 경로만 줄어드는, 이 게이트가 가장
 * 경계해야 할 실패 방식이다. 그래서 헬퍼 경유도 쓰기로 셈하고, 무효화 책임은 헬퍼
 * 모듈 쪽에서 따로 확인한다.
 *
 * 여기 올릴 것은 **카탈로그에 반영되는 컬럼**을 쓰는 헬퍼뿐이다. 예컨대
 * markLessonVideoFailed는 lessons를 쓰지만 mux_error·mux_upload_id만 건드려
 * course_catalog 뷰에 나가지 않으므로 대상이 아니다.
 */
const CATALOG_WRITE_HELPERS = [{ fn: 'linkLessonVideo', module: 'src/lib/mux/link-lesson.ts' }];

function callsCatalogWriteHelper(src: string): boolean {
  return CATALOG_WRITE_HELPERS.some((h) => src.includes(`${h.fn}(`));
}

/** src/app/api 아래 모든 route.ts를 리포 상대경로로. */
function routeFiles(): string[] {
  return readdirSync(API_DIR, { recursive: true, encoding: 'utf-8' })
    .filter((f) => f.endsWith('route.ts'))
    .map((f) => join('src', 'app', 'api', f));
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf-8');
}

/**
 * 카탈로그 반영 테이블에 **쓰기**를 하는가.
 *
 * 테이블 등장과 쓰기 호출을 따로 보면 오탐이 난다 — progress·materials 라우트는 lessons를
 * 검증용으로 **읽기만** 하는데도 걸렸다. Supabase는 쓰기가 .from() 바로 다음 체인이므로
 * 그 인접성까지 함께 본다.
 */
function writesCatalogTable(src: string): boolean {
  const tables = CATALOG_BACKED_TABLES.join('|');
  return new RegExp(`\\.from\\('(?:${tables})'\\)\\s*\\.(insert|update|upsert|delete)\\(`).test(src);
}

function hasMutatingHandler(src: string): boolean {
  return MUTATING_METHODS.some((m) => src.includes(`export async function ${m}(`));
}

describe('카탈로그 캐시 무효화 (DC-51)', () => {
  const routes = routeFiles().map((rel) => ({ rel, src: read(rel) }));
  const direct = routes.filter((r) => hasMutatingHandler(r.src) && writesCatalogTable(r.src));
  const viaHelper = routes.filter(
    (r) => hasMutatingHandler(r.src) && !writesCatalogTable(r.src) && callsCatalogWriteHelper(r.src),
  );
  const suspects = [...direct, ...viaHelper].map((r) => r.rel);

  it('감시 대상 라우트를 실제로 찾아낸다', () => {
    // 스캐너가 0건을 반환하면 아래 검사가 통째로 무의미해진다(항상 통과하는 검사 금지).
    expect(suspects.length).toBeGreaterThanOrEqual(11);
  });

  it('헬퍼로 위임한 라우트도 감시 대상에 남는다', () => {
    // 이 분기가 0건이 되면 헬퍼 경유 경로가 통째로 사각지대가 된다.
    expect(viaHelper.length).toBeGreaterThanOrEqual(3);
  });

  it.each(CATALOG_WRITE_HELPERS)('$module — 헬퍼 자신이 무효화 책임을 진다', ({ module }) => {
    // 라우트에 리터럴이 없어도 되는 근거가 바로 이것이다. 헬퍼에서 무효화가 사라지면
    // 위임한 라우트 전부가 조용히 낡은 캐시를 팔게 된다.
    expect(read(module)).toContain('revalidateTag(CATALOG_TAG)');
  });

  it.each(suspects)(
    '%s — course_catalog 반영 테이블에 쓰면 revalidateTag(CATALOG_TAG)를 호출한다',
    (rel) => {
      const src = read(rel);
      // 직접 쓰면 라우트가, 헬퍼로 위임하면 헬퍼가 무효화한다(위 헬퍼 검사와 한 쌍).
      const invalidates =
        src.includes('revalidateTag(CATALOG_TAG)') || callsCatalogWriteHelper(src);
      expect(invalidates, `${rel}: CATALOG_TAG로 무효화하지 않음`).toBe(true);
    },
  );

  it('태그 상수는 캐시를 붙이는 쪽과 지우는 쪽이 같은 문자열을 쓴다', () => {
    // catalog.ts가 상수를 우회해 리터럴을 직접 쓰면 무효화가 조용히 어긋난다.
    const catalogSrc = read(join('src', 'lib', 'catalog.ts'));
    expect(catalogSrc).toContain('tags: [CATALOG_TAG]');
    expect(CATALOG_TAG).toBe('catalog');
  });

  it('캐시 대상 조회는 쿠키 클라이언트를 쓰지 않는다', () => {
    // unstable_cache 블록 안에서 세션을 읽으면 한 사용자의 판정이 캐시에 얼어붙어
    // 다른 사용자에게 그대로 나간다. 캐시된 함수는 createPublicClient만 쓴다.
    const src = read(join('src', 'lib', 'catalog.ts'));
    const cachedBlocks = src.split('unstable_cache(').slice(1);
    expect(cachedBlocks.length).toBeGreaterThanOrEqual(3);
    for (const block of cachedBlocks) {
      // 각 unstable_cache 호출의 인자 목록 끝(태그 옵션)까지를 대략의 본문으로 본다.
      const body = block.split('  { tags:')[0];
      expect(body).not.toContain('getUser(');
      expect(body).not.toContain('await createClient(');
      expect(body).not.toContain('cookies(');
    }
  });
});
