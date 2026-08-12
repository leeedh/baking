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
  const suspects = routeFiles().filter((rel) => {
    const src = read(rel);
    return hasMutatingHandler(src) && writesCatalogTable(src);
  });

  it('감시 대상 라우트를 실제로 찾아낸다', () => {
    // 스캐너가 0건을 반환하면 아래 검사가 통째로 무의미해진다(항상 통과하는 검사 금지).
    expect(suspects.length).toBeGreaterThanOrEqual(5);
  });

  it.each(suspects)(
    '%s — course_catalog 반영 테이블에 쓰면 revalidateTag(CATALOG_TAG)를 호출한다',
    (rel) => {
      const src = read(rel);
      expect(src, `${rel}: revalidateTag import 누락`).toContain('revalidateTag');
      expect(src, `${rel}: CATALOG_TAG로 무효화하지 않음`).toContain('revalidateTag(CATALOG_TAG)');
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
