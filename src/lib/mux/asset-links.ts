import { muxDurationToSec } from './duration';

/** Mux 자산에서 우리가 보는 부분만. SDK 타입에 묶이지 않게 구조만 받는다(테스트 가능). */
export type MuxAssetLike = {
  id?: string;
  status?: string;
  duration?: number;
  passthrough?: string;
  playback_ids?: Array<{ id?: string; policy?: string }> | null;
};

export type MuxAssetLink = {
  lessonId: string;
  assetId: string;
  playbackId: string;
  durationSec: number | null;
};

/**
 * 자산 목록에서 "차시에 이어 붙일 수 있는 것"만 고른다.
 *
 * 조건이 셋이다 — ① `passthrough`에 차시 id가 있고 ② 인코딩이 끝났고(`ready`)
 * ③ **서명(signed) 재생 ID가 있다.** 마지막이 특히 중요하다: 공개(public) 재생 ID를 저장하면
 * 서명 토큰 없이도 재생되는 차시가 조용히 생겨 재생 토큰 라우트의 방어가 무의미해진다
 * (코드리뷰 M-5와 같은 이유로 여기서도 fail-closed).
 *
 * 같은 차시에 자산이 여럿이면(영상 교체) **먼저 오는 것**을 쓴다 — Mux 목록은 최신순이다.
 */
export function pickAssetLinks(assets: readonly MuxAssetLike[]): MuxAssetLink[] {
  const seen = new Set<string>();
  const links: MuxAssetLink[] = [];

  for (const asset of assets) {
    const lessonId = asset.passthrough?.trim();
    if (!lessonId || seen.has(lessonId)) continue;
    if (asset.status !== 'ready' || !asset.id) continue;

    const signed = asset.playback_ids?.find((p) => p.policy === 'signed');
    if (!signed?.id) continue;

    seen.add(lessonId);
    links.push({
      lessonId,
      assetId: asset.id,
      playbackId: signed.id,
      durationSec: muxDurationToSec(asset.duration),
    });
  }

  return links;
}
