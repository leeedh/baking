/**
 * RFC 7807 Problem Details 응답에서 사용자에게 보여줄 한국어 메시지를 뽑는다.
 * (기존에 DashboardScreen·ReviewForm·LessonManager에 같은 함수가 따로 있었다.)
 */
export async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}
