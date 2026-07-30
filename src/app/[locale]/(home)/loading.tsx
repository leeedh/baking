/*
 * 라우트 그룹 안에 두어 이 스켈레톤이 형제 동적 경로를 감싸지 않게 한다.
 * loading.tsx의 Suspense 셸이 즉시 flush되면 이후 notFound()가 404 상태를
 * 세팅할 수 없다(Docs/UXGuide.md §8.6).
 */
import PageSkeleton from '@/components/skeletons/PageSkeleton';

export default function Loading() {
  return <PageSkeleton variant="grid" />;
}
