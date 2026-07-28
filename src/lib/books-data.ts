/**
 * 추천 도서 큐레이션 — **아틀리에 크렘 자체 저서가 아니라**, 클래스와 함께 보면 좋은 실전
 * 레시피 도서를 골라 소개한다. 구매·결제·배송은 전부 외부 커머스(쿠팡)에서 이뤄지며,
 * 링크는 **쿠팡 파트너스** 제휴 링크다(수수료 수취). 자체 주문/결제/배송이 없어 DB
 * orders/enrollments와 무관하므로, 소수·정적 데이터는 이 앱 상수로 관리한다.
 *
 * ⚠️ externalPurchaseUrl 은 파트너스 트래킹 파라미터를 포함하므로 **쿼리스트링까지 원본 그대로**
 * 유지할 것(임의 정규화·삭제 금지).
 */
export interface BookSource {
  slug: string;
  title: { ko: string; en: string };
  /** 저자·구성 등 한 줄 소개. */
  subtitle: { ko: string; en: string };
  /** 왜 추천하는지 — 실제 상품 기준의 정직한 소개(2~3문장). */
  description: { ko: string; en: string };
  /** "이 책에서 배우는 것" 목록. */
  highlights: { ko: string; en: string }[];
  /** 중립 테마 이미지 — 쿠팡 CDN 핫링크는 불안정/ToS 이슈로 회피. */
  thumbnail: string;
  price: number;
  listPrice: number;
  /** 쿠팡 파트너스 제휴 링크(원본 쿼리스트링 보존). */
  externalPurchaseUrl: string;
}

export const BOOKS: BookSource[] = [
  {
    slug: 'meringue-cookie',
    title: {
      ko: '머랭 쿠키 (Meringue Cookie)',
      en: 'Meringue Cookie',
    },
    subtitle: {
      ko: '오븐만 있으면 되는, 바삭하게 녹는 머랭 쿠키 레시피 북',
      en: 'A crisp, melt-in-your-mouth meringue cookie recipe book',
    },
    description: {
      ko: '클래스에서 다루는 머랭의 원리를 집에서 반복 연습하기 좋은 입문 레시피 도서입니다. 흰자 거품의 안정화와 건조(굽기) 온도 조절을 사진과 함께 단계별로 설명해, 처음 만드는 분도 실패를 줄일 수 있게 구성됐습니다.',
      en: 'An entry-level recipe book to practice the meringue fundamentals covered in class at home. It walks through egg-white foam stabilization and drying (baking) temperature step by step with photos, so first-timers can reduce failures.',
    },
    highlights: [
      { ko: '흰자 거품 안정화의 기본 원리', en: 'The basics of stabilizing egg-white foam' },
      { ko: '건조·굽기 온도와 시간 잡기', en: 'Setting drying/baking temperature and time' },
      { ko: '색·향 배합 응용 아이디어', en: 'Ideas for color and flavor variations' },
    ],
    // 실제 표지 — 도서 『머랭 쿠키』 김소우, 더테이블(2019). 로컬 자산(public/books).
    thumbnail: '/books/meringue-cookie.jpg',
    price: 17100,
    listPrice: 19000,
    externalPurchaseUrl:
      'https://www.coupang.com/vp/products/262219576?itemId=820942703&src=1139000&spec=10799999&addtag=400&ctag=262219576&lptag=AF8221698&itime=20260728151340&pageType=PRODUCT&pageValue=262219576&wPcid=17479757096435718653253&wRef=&wTime=20260728151340&redirect=landing&traceid=V0-101-f4202dcdb979d3e0&mcid=e8dbc8cdc1f7460f8fecfcbcac0be936&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  },
  {
    slug: 'no-oven-marshmallow',
    title: {
      ko: '마시멜로 (Marshmallow): 노 오븐 디저트',
      en: 'Marshmallow: No-Oven Dessert',
    },
    subtitle: {
      ko: '오븐 없이 만드는 폭신한 수제 마시멜로 레시피 북',
      en: 'A fluffy handmade marshmallow recipe book made without an oven',
    },
    description: {
      ko: '오븐이 없어도 도전할 수 있는 노 오븐 디저트 레시피 도서입니다. 젤라틴·시럽 온도 조절로 폭신한 식감을 내는 과정을 사진과 함께 담아, 홈베이킹 장비가 단출한 분께 특히 잘 맞습니다.',
      en: 'A no-oven dessert recipe book you can try even without an oven. It captures, with photos, how to achieve a fluffy texture by controlling gelatin and syrup temperatures — a great fit for those with minimal home-baking equipment.',
    },
    highlights: [
      { ko: '젤라틴·시럽 온도로 식감 만들기', en: 'Building texture via gelatin/syrup temperature' },
      { ko: '오븐 없이 완성하는 공정', en: 'A process completed without an oven' },
      { ko: '보관·커팅·데코 팁', en: 'Storage, cutting, and decorating tips' },
    ],
    // 실제 표지 — 도서 『마시멜로』 김소우, 더테이블(2020). 로컬 자산(public/books).
    thumbnail: '/books/no-oven-marshmallow.jpg',
    price: 16200,
    listPrice: 18000,
    externalPurchaseUrl:
      'https://www.coupang.com/vp/products/2251751747?itemId=3849749502&src=1139000&spec=10799999&addtag=400&ctag=2251751747&lptag=AF8221698&itime=20260728151405&pageType=PRODUCT&pageValue=2251751747&wPcid=17479757096435718653253&wRef=&wTime=20260728151405&redirect=landing&traceid=V0-101-1b08e2c6d6f31470&mcid=56511bcd94d144abab737f83012efe58&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  },
];
