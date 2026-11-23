// 貼文 → 元素：關鍵字規則表，依序比對標題，先命中先贏；都不中 → sign。
// 規則要誠實：對不到元素的就是告示牌，不用 topic 當第二層兜底（設計決定，見 spec）。
//
// 比對分兩輪：先用所有規則的 keywords 比標題（先命中先贏），都不中再用 placeKinds 比
// 貼文主要地名的 kind（places.json）。kind 只當弱兜底，因為「台北港土方車輛」的地點是港口，
// 但標題若有「公車」就該是 transit，不該因為規則順序被港口搶走。
//
// 議會順序理由：
// - council-hall 最前：「預算審查：營養午餐」是在議會審預算，不是餐盤。
// - suitcase 在 shield / coin 之前：考察文常提到「警」「補助」字眼。
// - coin 在 flag 之前：「民進黨團成功爭取…費增至 4100 元」講的是錢。
export const COUNCIL_RULES = [
  { element: 'council-hall', keywords: ['質詢', '總預算', '預算審查', '預算', '定期會', '臨時會', '施政報告', '專案報告', '決算', '議會'] },
  { element: 'lunch-tray', keywords: ['營養午餐', '午餐', '餐點', '毒油', '廚工'] },
  { element: 'milk', keywords: ['鮮奶', '鮮乳', '牛奶'] },
  { element: 'elder-card', keywords: ['敬老', '長輩', '高齡', '銀髮', '長者'] },
  { element: 'baby', keywords: ['好孕', '生育', '托嬰', '公托', '幼兒', '兒少', '托育', '育兒', '凍卵', '親子'] },
  { element: 'suitcase', keywords: ['考察', '拜會', '世博', '東京', '日本', '參訪', '大阪'] },
  { element: 'shield', keywords: ['治安', '槍', '毒駕', '毒品', '噪音車', '性侵', '詐騙', '警', '安置'] },
  { element: 'coin', keywords: ['稅', '補助', '普發', '獎勵金', '貸款', '統籌分配', '津貼', '經費', '費增'] },
  { element: 'flag', keywords: ['黨團', '黨務', '民進黨', '台灣是', '國家', '青年局', '罷免'] },
];

// 地方島（淡水／八里／三芝／石門）順序理由：
// - 災害型 repair 最前：「颱風後 XX 國小坍方」是在修災，不是學校；關鍵字只收災害字眼，
//   「修復／工程／完工」這類泛工程字放最後一條 repair，讓學校、公園、圖書館先搶。
// - bridge 不用單字「橋」（會吃到板橋、台北橋）；用大橋／新橋／高架橋／陸橋和 kind:橋。
// - transit 在 crosswalk 之前：「捷運站標線型人行道」重點是站；公車路線代號（F137、882、紅13）也算。
// - hall 在 event 之前：「活動中心」含「活動」。
// - school 在 crosswalk 之前：「XX 國小前人行道」算學校周邊工程，和原始估計（school 最多）一致。
// - crosswalk 收所有路面／號誌／側溝字和單字「路／街／巷」，kind:路、kind:線（淡北道路、105 線）。
// - event 收課程／講座／體驗／比賽／說明會這類有日期的場次。
// - 不中的：停水／污水、衛生所／醫院、警消、地方島上的總質詢、遊客中心、海域——沒有對應元素，誠實留 sign。
export const LOCAL_RULES = [
  { element: 'repair', keywords: ['颱風', '災情', '災後', '災害', '災區', '風災', '水災', '農損', '坍方', '搶通', '護岸', '土石', '淹水', '積水', '倒塌', '崩塌', '搶修', '漏水', '剝落', '邊坡'] },
  { element: 'bridge', keywords: ['大橋', '新橋', '高架橋', '陸橋', '環橋', '橋梁', '關渡橋', '老梅橋', '江厝橋'], placeKinds: ['橋'] },
  { element: 'port', keywords: ['漁港', '碼頭'], placeKinds: ['港口'] },
  { element: 'transit', keywords: ['公車', '候車', '站牌', 'youbike', '輕軌', '捷運', '新北捷', '客運', '公共運輸', '轉運', '接駁', '巴士', 'f137', '882', '紅13', '計程車', '專車'], placeKinds: ['車站'] },
  { element: 'library', keywords: ['圖書館', '分館', '書屋', '閱覽室', '圖書'], placeKinds: ['圖書館'] },
  { element: 'market', keywords: ['市場'], placeKinds: ['市場'] },
  { element: 'hall', keywords: ['活動中心'], placeKinds: ['活動中心'] },
  { element: 'parking', keywords: ['停車'] },
  { element: 'playground', keywords: ['遊戲場', '公園', '溜滑梯', '鞦韆', '遊具', '共融', '健身房', '體健設施'], placeKinds: ['公園'] },
  { element: 'school', keywords: ['國小', '國中', '高中', '幼兒園', '校園', '跑道', '操場', '學校', '大學', '高職', '商工', '實中', '球場', '公托', '校隊', '體育班', '學童'], placeKinds: ['學校', '運動場'] },
  { element: 'crosswalk', keywords: ['人行道', '號誌', '斑馬線', '標線', '路口', '道路', '拓寬', '路面', '車道', '柏油', '鋪面', '路燈', '紅綠燈', '側溝', '排水', '匝道', '路段', '巷', '街', '路'], placeKinds: ['路', '線'] },
  { element: 'event', keywords: ['課程', '講座', '活動', '圓滿', '體驗', '夏令營', '冬令營', '音樂', '市集', '園遊會', '表演', '比賽', '邀請賽', '友誼賽', '特展', '開打', '結訓', '落幕', '說明會', '座談會', '聽證會', '淨灘', '巡禮'] },
  { element: 'repair', keywords: ['修復', '整修', '翻新', '工程', '完工', '動土', '動工', '開工', '施工', '修建', '重建', '改建', '新建'] },
];

/** 這篇貼文該用哪張規則表。 */
export function rulesFor(island) {
  return island === '議會' ? COUNCIL_RULES : LOCAL_RULES;
}

/**
 * @param {{ island: string; title: string; placeKind?: string | null }} post
 * @returns {{ element: string; matched: string | null }}  matched 是命中的關鍵字或 `kind:學校`
 */
export function classify(post) {
  const rules = rulesFor(post.island);
  const title = post.title.toLowerCase();
  for (const rule of rules) {
    const hit = rule.keywords.find((k) => title.includes(k.toLowerCase()));
    if (hit) return { element: rule.element, matched: hit };
  }
  if (post.placeKind) {
    for (const rule of rules) {
      if (rule.placeKinds?.includes(post.placeKind)) return { element: rule.element, matched: `kind:${post.placeKind}` };
    }
  }
  return { element: 'sign', matched: null };
}
