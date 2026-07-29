import { redirect } from 'next/navigation';

// DC-96 (PRD-F-20) · 강사 소개는 /about로 통합됐다. 기존 링크 유실을 막기 위한 리다이렉트.
export default async function InstructorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/about`);
}
