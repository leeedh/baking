// 진도 저장 판정 정책 (코드리뷰 M-6).
//
// 기존에는 클라이언트가 보낸 watchedSec·completed를 그대로 저장했다. 진도는 되돌릴 경로가
// 없는 sticky 값이라, 위조된 완강이 한 번 들어가면 영구히 남는다. 그래서 두 값 모두
// **서버가 차시 길이(duration_sec)로 되짚어 확인**한다.
//
// 라우트(app/api/progress/route.ts)와 분리된 순수 모듈이다 — 라우트는 Supabase 클라이언트에
// 묶여 단위 테스트에서 import할 수 없어서, 자동 검증이 필요한 판정만 따로 뺐다(X-5).
// lib/mux/ttl.ts와 같은 이유·같은 형태다.

/**
 * 완강 판정 임계 — 시청 길이가 차시 길이의 이 비율을 넘으면 완주로 본다.
 * 1.0이 아닌 것은 엔딩 크레딧·마지막 몇 초를 남기고 이탈하는 정상 시청을 완주로 인정하기 위함.
 */
export const COMPLETION_RATIO = 0.9;

/**
 * 시청 위치를 [0, duration]으로 clamp한다.
 * duration을 모르면(null·0) 상한을 알 수 없으므로 음수만 걷어낸다.
 */
export function clampWatchedSec(
  watchedSec: number,
  durationSec: number | null | undefined,
): number {
  const nonNegative = Math.max(0, watchedSec);
  if (!durationSec || durationSec <= 0) return nonNegative;
  return Math.min(nonNegative, durationSec);
}

export type CompletionInput = {
  /** clamp가 끝난 시청 위치(초). */
  watchedSec: number;
  durationSec: number | null | undefined;
  /** 클라이언트가 주장한 완강 여부. duration을 알면 무시된다. */
  clientCompleted: boolean | undefined;
  /** DB에 이미 저장된 완강 여부. */
  previousCompleted: boolean;
};

/**
 * 완강 여부를 판정한다.
 *
 * · duration을 알면 clamp된 watchedSec으로 **서버가 도출**하고 클라이언트 주장은 버린다.
 *   (watchedSec 자체가 duration으로 clamp되므로 부풀린 값으로 완강을 살 수 없다.)
 * · duration을 모르면 도출 근거가 없어 클라이언트 값을 받아들인다 — 차시에 duration_sec가
 *   채워지기 전 업로드 직후 상태에서 진도 저장이 아예 막히지 않도록 한 폴백이다.
 * · 어느 경우든 sticky: 한 번 true면 재시청·되감기로 false가 되지 않는다(완주 취소 경로 없음).
 */
export function deriveCompleted({
  watchedSec,
  durationSec,
  clientCompleted,
  previousCompleted,
}: CompletionInput): boolean {
  if (previousCompleted) return true;
  if (!durationSec || durationSec <= 0) return clientCompleted ?? false;
  return watchedSec >= durationSec * COMPLETION_RATIO;
}
