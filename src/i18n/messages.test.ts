import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';

// =============================================================================
// EPIC-K · i18n 회귀 방지 (Jira DC-10)
//
// messages/*.json은 사람이 손으로 늘리는 파일이라 드리프트가 필연이다. 그리고 화면에
// 한글을 그대로 박아 넣어도 타입 검사·린트는 아무 말을 하지 않는다 — /en에서 한국어가
// 나오는 결함이 조용히 다시 들어올 수 있다. 그 둘을 여기서 기계적으로 막는다.
// =============================================================================

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** 중첩 객체를 'a.b.c' 키로 평탄화. 배열은 인덱스를 키에 포함해 길이까지 비교된다. */
function flatten(value: Json, prefix = ''): Record<string, Json> {
  if (Array.isArray(value)) {
    return Object.assign({}, ...value.map((v, i) => flatten(v, `${prefix}[${i}]`)));
  }
  if (value !== null && typeof value === 'object') {
    return Object.assign(
      {},
      ...Object.entries(value).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)),
    );
  }
  return { [prefix]: value };
}

describe('messages/{ko,en}.json 정합성', () => {
  const koKeys = Object.keys(flatten(ko as Json)).sort();
  const enKeys = Object.keys(flatten(en as Json)).sort();

  it('키 집합이 정확히 일치한다 — 한쪽에만 있는 키는 /en에서 빈 화면이 된다', () => {
    const onlyKo = koKeys.filter((k) => !enKeys.includes(k));
    const onlyEn = enKeys.filter((k) => !koKeys.includes(k));
    expect({ onlyKo, onlyEn }).toEqual({ onlyKo: [], onlyEn: [] });
  });

  it('빈 문자열 값이 없다 — 번역을 빠뜨린 채 키만 채운 상태를 잡는다', () => {
    const flatEn = flatten(en as Json);
    const empty = Object.entries(flatEn)
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('참조되지 않는 네임스페이스가 없다 — 화면이 사라져도 키는 남는다', () => {
    // DC-96 정보구조 개편 때 단일 랜딩(CatalogScreen)이 sections/*로 쪼개지면서
    // pillars·grid·btn 네임스페이스가 통째로 사장된 채 남아 있었다. 같은 일이 반복되지 않게 잠근다.
    const src = readdirSync(join(process.cwd(), 'src'), { recursive: true, encoding: 'utf-8' })
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map((f) => readFileSync(join(process.cwd(), 'src', f), 'utf-8'))
      .join('\n');
    const unused = Object.keys(ko as Record<string, unknown>).filter(
      (ns) =>
        !src.includes(`useTranslations('${ns}')`) &&
        !src.includes(`getTranslations('${ns}')`) &&
        !src.includes(`'${ns}.`) &&
        !src.includes(`"${ns}.`) &&
        !src.includes(`\`${ns}.`),
    );
    expect(unused).toEqual([]);
  });

  it('en 값에 한글이 남아 있지 않다 — 번역 누락이 값에 그대로 복사된 경우', () => {
    const flatEn = flatten(en as Json);
    const leftover = Object.entries(flatEn)
      .filter(([, v]) => typeof v === 'string' && /[가-힣]/.test(v))
      .map(([k]) => k);
    expect(leftover).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// 하드코딩 한글 스캐너
//
// 아래 목록은 **i18n이 끝난 파일**이다. 여기 오른 파일에 한글 문자열이 다시 들어오면
// 이 테스트가 깨진다. EPIC-K의 각 단계가 끝날 때마다 해당 파일을 목록에 추가한다 —
// 즉 이 배열이 곧 진행률이자 잠금장치다.
//
// 운영자 콘솔(DashboardScreen·LessonManager)은 **의도적으로 범위 밖**이다. 운영자는
// 한국어 단일 사용자이고 Jira DC-62·63·64도 고객 화면만 지정한다.
// -----------------------------------------------------------------------------
const I18N_DONE: string[] = [
  'AboutScreen.tsx',
  'DetailScreen.tsx', // DC-62
  'PaymentScreen.tsx', // DC-63
  'PlayerScreen.tsx', // DC-63
  'LoginScreen.tsx', // DC-64
  'InquiriesScreen.tsx', // DC-10 (DC-97 이후 신설 화면)
  'MyClassesScreen.tsx', // DC-10 (DC-96 이후 신설 화면)
  // Phase 5a — 공통 UI·소형 컴포넌트
  'Header.tsx',
  'BooksScreen.tsx',
  'ClassesScreen.tsx',
  'ReviewForm.tsx',
  'skeletons/PageSkeleton.tsx',
  'player/SecureVideoPlayer.tsx',
  'sections/AnnouncementBar.tsx',
  'sections/BestClasses.tsx',
  'ui/ConfirmDialog.tsx',
  'ui/Modal.tsx',
  // Phase 5b-1 — 기능성 UI(히어로 슬로건·푸터·카드·카탈로그 필터)
  'MeringueHero.tsx',
  'Footer.tsx',
  'sections/ClassCard.tsx',
  'sections/ClassCatalogGrid.tsx',
  // Phase 5b-2 — 브랜드 산문 섹션
  'sections/ChefBanner.tsx',
  'sections/PhilosophyPillars.tsx',
  'sections/FaqAccordion.tsx',
  'sections/NewsletterCTA.tsx',
  'sections/RecommendationQuiz.tsx',
  'sections/StudentArchive.tsx',
  //  Phase 5 → sections/*, 'ClassesScreen.tsx', 'Header.tsx', 'MeringueHero.tsx', 'BooksScreen.tsx'
];

/**
 * 주석을 걷어낸다 — 코드 주석은 한국어가 정본이라 검사 대상이 아니다.
 * 줄 끝 주석(`foo; // 설명`)까지 지우되, `https://`처럼 `:` 뒤의 `//`는 건드리지 않는다.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/[^\n]*/g, '');
}

function findComponent(fileName: string): string {
  const root = join(process.cwd(), 'src', 'components');
  const walk = (dir: string): string | null => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        const found = walk(full);
        if (found) return found;
        // 목록은 'sections/Foo.tsx'처럼 POSIX 구분자로 적는다 — Windows의 `\`와 맞춘다.
      } else if (full.replaceAll('\\', '/').endsWith(fileName)) {
        return full;
      }
    }
    return null;
  };
  const path = walk(root);
  if (!path) throw new Error(`컴포넌트를 찾지 못했다: ${fileName}`);
  return path;
}

describe('i18n 완료 화면에 하드코딩 한글이 없다', () => {
  it.each(I18N_DONE)('%s', (fileName) => {
    const src = stripComments(readFileSync(findComponent(fileName), 'utf-8'));
    const offending = src
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => /[가-힣]/.test(line));
    expect(offending).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// 키 유효성
//
// 한글 스캐너는 "한글이 사라졌는지"만 본다. 존재하지 않는 키를 참조해도 통과한다 —
// 실제로 BooksScreen이 useTranslations('books')로 스코프된 채 t('books.listAria')를 불러
// books.books.listAria를 찾고 있었다(Codex 리뷰 P2). 화면에는 키 문자열이 그대로 나온다.
// 정적으로 판정 가능한 형태(리터럴 키 + 파일 상단의 단일 useTranslations 스코프)만 검사한다.
// -----------------------------------------------------------------------------
describe('t() 호출이 존재하는 키를 가리킨다', () => {
  const koFlat = flatten(ko as Json);
  /** 배열 키는 `a.b[0]`로 평탄화되므로, t.raw('a.b')를 위해 접두어 집합도 만든다. */
  const known = new Set(Object.keys(koFlat));
  for (const k of Object.keys(koFlat)) {
    const base = k.replace(/\[\d+\].*$/, '');
    if (base !== k) known.add(base);
    const parts = base.split('.');
    for (let i = 1; i < parts.length; i++) known.add(parts.slice(0, i).join('.'));
  }

  it.each(I18N_DONE)('%s', (fileName) => {
    const src = stripComments(readFileSync(findComponent(fileName), 'utf-8'));
    const scope = src.match(/useTranslations\(\s*'([^']+)'\s*\)/)?.[1] ?? '';
    const multiScope = (src.match(/useTranslations\(/g) ?? []).length > 1;

    const calls = [...src.matchAll(/\b(?:t|tq|tc)(?:\.raw)?\(\s*'([^'`$]+)'/g)].map((m) => m[1]);
    const missing = calls.filter((key) => {
      // 스코프가 여럿이면 어느 t인지 정적으로 못 가리므로, 어느 스코프에든 있으면 통과시킨다.
      if (multiScope) return !known.has(key) && ![...known].some((k) => k.endsWith(`.${key}`));
      return !known.has(scope ? `${scope}.${key}` : key);
    });
    expect(missing).toEqual([]);
  });
});
