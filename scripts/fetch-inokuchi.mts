/**
 * 井ノ口商店（駄菓子問屋）から商品名と希望小売価格を取得する。
 *
 *   npm run fetch:inokuchi           キャッシュがあればそれを使う
 *   npm run fetch:inokuchi -- --refresh   サイトから取り直す
 *
 * ★このスクリプトは lib/data.ts を一切触らない。
 *   data/sources/inokuchi.json を書くだけ。反映は npm run build:data で行う。
 *   取得と生成を分けることで、解析を直すたびにサイトへ再アクセスせずに済む。
 *
 * ★サーバーへの配慮:
 *   - リクエスト間隔を 1.5 秒あける
 *   - User-Agent に用途を明記する
 *   - 取得したHTMLを data/.cache/ に保存し、2回目以降は取りに行かない
 *   - 画像と商品説明文は取得しない（事実情報である商品名と価格のみ）
 *
 * robots.txt は /inokuchi_admin/wp-admin/ のみ Disallow で、商品ページは対象外
 * （2026-09-02 時点で確認）。
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CATEGORIES, type Category } from "../lib/types.ts";
import { resolveFetchedAt } from "./source-file.mts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(ROOT, "data/.cache/inokuchi");
const OUTPUT_PATH = path.join(ROOT, "data/sources/inokuchi.json");

const BASE_URL = "https://www.inokuchi.net/item/dagashibyprice/";
const USER_AGENT =
  "dagashi-simulator/1.0 (personal hobby project; fetching product names and list prices)";
const DELAY_MS = 1500;
/** 想定外の構造変更で延々と取りに行かないための上限。 */
const MAX_PAGES = 20;

const refresh = process.argv.includes("--refresh");
/** 実際にサイト/APIを叩いたか。取得日時を更新してよいかの判定に使う。 */
let fetchedFromNetwork = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** キャッシュがあればそれを返し、無ければ取得して保存する。 */
async function fetchPage(pageNumber: number): Promise<string> {
  const cachePath = path.join(CACHE_DIR, `page-${pageNumber}.html`);

  if (!refresh && existsSync(cachePath)) {
    console.log(`  ページ${pageNumber}: キャッシュを使用`);
    return readFileSync(cachePath, "utf8");
  }

  const url = pageNumber === 1 ? BASE_URL : `${BASE_URL}page/${pageNumber}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`ページ${pageNumber} の取得に失敗: HTTP ${res.status}`);

  const html = await res.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, html, "utf8");
  fetchedFromNetwork = true;
  console.log(`  ページ${pageNumber}: 取得 (${(html.length / 1024).toFixed(0)}KB)`);

  await sleep(DELAY_MS);
  return html;
}

/** ページネーションから最終ページ番号を読む。 */
function readLastPage(html: string): number {
  const numbers = [...html.matchAll(/\/item\/dagashibyprice\/page\/(\d+)/g)].map((m) =>
    Number(m[1]),
  );
  return numbers.length > 0 ? Math.max(...numbers) : 1;
}

type RawItem = {
  /** 例: "inokuchi-49941" */
  id: string;
  /** 「＃50」や「(30入)」を取り除いた商品名 */
  name: string;
  /** 「＃NN」から読んだ希望小売価格 */
  price: number;
  /** 「(30入)」から読んだ入数。取れなければ null */
  packSize: number | null;
  sourceUrl: string;
  /** 味違いを束ねるシリーズ。判定できなければ null */
  seriesId: string | null;
  /** 推定したカテゴリ。判定できなければ "その他" */
  category: Category;
  /** カテゴリ推定の根拠にしたキーワード（確認用） */
  categoryHint: string | null;
};

/**
 * カテゴリ推定のキーワードの強さ。小さいほど優先。
 *
 * ★以前は配列の並び順だけで決めていたため、事故が起きていた。
 *   「うまい棒 たこ焼味」が味の「たこ」に引っかかって せんべい・おつまみ に、
 *   「うまい棒 スパイシービーフカレー味」が「ビーフ」で同じく せんべい・おつまみ に
 *   落ちていた。せんべいのルールがスナックより前に置いてあったというだけの理由で、
 *   意図したものではない。
 *
 *   かといって単純な最長一致にもできない。並び順には意味のある優先度が
 *   混ざっているため。「ねり水あめ大当て」は "水あめ"(3文字) の方が
 *   "当て"(2文字) より長いので、最長一致だと当たり付きだと分からなくなる。
 *
 *   そこで強さを明示し、同じ強さの中でだけ長いキーワードを優先する。
 *   こうすると配列の並び順は結果に影響しなくなる。
 */
const STRENGTH = {
  /** 商品名・シリーズ名。「それが何か」を直接名指しするので最も強い。 */
  productName: 0,
  /** 当たり付きという商品特性。食品の種類を問わず成立するので種類より強い。 */
  attribute: 1,
  /** 食品の種類そのもの。 */
  kind: 2,
  /** 味・原材料。他に手がかりが無いときだけ使う。 */
  flavor: 3,
} as const;

/**
 * 商品名からカテゴリを推定する。
 * 並び順は読みやすさのためのもので、判定には影響しない。
 * 外れたぶんは data/overrides.json で直す想定。
 */
const CATEGORY_RULES: {
  keywords: string[];
  category: Category;
  strength: number;
}[] = [
  // ── 商品名・シリーズ名 ────────────────────────
  { strength: STRENGTH.productName, category: "スナック", keywords: ["うまい棒", "太郎"] },
  // 「太郎」は菓道の商品全般に付く接尾語で、カテゴリを決める力はない
  //（キャベツ太郎＝スナック / さん太郎＝せんべい / 甘いか太郎＝いか）。
  // 種類が違うものはフルネームで名指しして上書きする。
  {
    strength: STRENGTH.productName,
    category: "せんべい・おつまみ",
    keywords: ["さん太郎", "甘いか太郎"],
  },
  {
    strength: STRENGTH.productName,
    category: "チョコ",
    keywords: ["きのこの山", "たけのこの里", "アルフォート"],
  },
  // 商品名がそのままカテゴリを示すもの。いずれも出品タイトルで裏を取ってある。
  //   プリッツ        「スナック菓子」「焼き菓子」「プレッツェル」
  //   コアラのマーチ    チョコ菓子
  //   ヨーチ          「動物クラッカー」「アニマルクッキー」（幼稚園ビスケット）
  //   ミルキー        「飴、ソフトキャンディ」
  { strength: STRENGTH.productName, category: "スナック", keywords: ["プリッツ", "ヨーチ"] },
  { strength: STRENGTH.productName, category: "チョコ", keywords: ["コアラのマーチ"] },
  { strength: STRENGTH.productName, category: "グミ・キャンディ", keywords: ["ミルキー"] },

  // 「さん太郎」は菓道の商品名だが、珍味系（魚肉すり身シート）と
  // スナック系（小麦菓子）にまたがっていて、それだけではカテゴリを決められない。
  //   珍味   蒲焼 / 焼肉 / のし梅 / 酢だこ / 甘いか
  //   スナック ラーメン屋 / やきそば屋 / 玉葱  ← 出品タイトルが「スナック菓子」
  {
    strength: STRENGTH.productName,
    category: "スナック",
    keywords: ["ラーメン屋さん太郎", "やきそば屋さん太郎", "玉葱さん太郎"],
  },
  // わさびのり太郎は「太郎」でスナックに寄っていたが、出品タイトルは一貫して「珍味」。
  {
    strength: STRENGTH.productName,
    category: "せんべい・おつまみ",
    keywords: ["わさびのり太郎"],
  },

  // オリオンの「ミニ」シリーズはラムネ菓子。「ミニコーラ」は飲料ではない。
  // 裏付け: Yahoo!の検索結果（data/.cache/yahoo/inokuchi-18841.json ほか）が
  //   「オリオン 7種 バラエティ ラムネ 缶 ミニコーラ ミニサワー…」
  //   「オリオン ミニラムネ コーラ ３０入 駄菓子」
  // と、どちらもラムネとして扱っている。
  {
    strength: STRENGTH.productName,
    category: "ラムネ・タブレット",
    keywords: ["オリオン ミニ"],
  },

  // ── 商品特性 ────────────────────────────────
  {
    strength: STRENGTH.attribute,
    category: "くじ・当たり付き",
    // 「当て」は「大当て」「連続当て」の形で使われる当たり付き商品の表記。
    keywords: ["くじ", "当り", "当たり", "あたり", "当て", "抽選"],
  },

  // ── 食品の種類 ──────────────────────────────
  {
    strength: STRENGTH.kind,
    category: "ラムネ・タブレット",
    keywords: ["ラムネ", "ミンツ", "タブレット", "サイダー菓子"],
  },
  { strength: STRENGTH.kind, category: "チョコ", keywords: ["チョコ", "ショコラ"] },
  {
    strength: STRENGTH.kind,
    category: "グミ・キャンディ",
    // 「チュー」は長音・促音のゆれがある（ガブリチュウ / ロングチュー / チューキャン）。
    // コンペイ糖・マシュマロも出品タイトルで「飴、ソフトキャンディ」「金平糖」の裏が取れている。
    keywords: ["グミ", "キャンディ", "キャンデー", "飴", "あめ", "ガム", "チュウ", "チュー", "ゼリー", "ボー", "水あめ", "マシュマロ", "ましゅろ", "コンペイ糖", "こんぺい", "金平糖"],
  },
  // 「飲料」カテゴリは廃止した。駄菓子屋に飲み物そのものはほぼ無く、
  // コーラ・サイダー・ヨーグルはいずれも「味」か「菓子の名前」だった。
  // （ヨーグル＝ポット入りの練り菓子、パウダージュース＝水に溶かす粉）
  {
    strength: STRENGTH.kind,
    category: "せんべい・おつまみ",
    keywords: ["せんべい", "煎餅", "あられ", "おかき", "するめ", "こんぶ", "昆布", "カルパス", "珍味"],
  },
  {
    strength: STRENGTH.kind,
    category: "スナック",
    keywords: ["スナック", "ポテト", "ラーメン", "フライ", "クッキー", "ビスケット", "ドーナ", "パフ"],
  },

  // ── 味・原材料 ──────────────────────────────
  //    単体では商品の種類を決められない語。他に何も当たらなかったときだけ効く。
  {
    strength: STRENGTH.flavor,
    category: "せんべい・おつまみ",
    keywords: ["イカ", "いか", "するめ", "梅", "たこ", "肉", "ビーフ", "カツ"],
  },
  { strength: STRENGTH.flavor, category: "スナック", keywords: ["コーン"] },
];

/**
 * 同じ強さのキーワードが複数当たったときの決め方。
 *
 * ★終わりが右にあるものを採る。日本語の複合語は後ろが主役だから。
 *     「ドーナッツグミ」→ グミ（ドーナツではない）
 *     「サワーコーラグミ」→ グミ（飲料ではない）
 *   長さで決めると "ドーナ" が "グミ" に勝ってしまい、逆になる。
 *
 * ★終わりが同じなら長い方を採る。片方がもう片方を含んでいる関係なので、
 *   長い方がより具体的に名指ししている。
 *     「甘いか太郎」→ 太郎 ではなく 甘いか太郎
 *     「さん太郎」  → 太郎 ではなく さん太郎
 */
function isBetterMatch(
  a: { end: number; keyword: string; strength: number },
  b: { end: number; keyword: string; strength: number } | null,
): boolean {
  if (b === null) return true;
  if (a.strength !== b.strength) return a.strength < b.strength;
  if (a.end !== b.end) return a.end > b.end;
  return a.keyword.length > b.keyword.length;
}

function inferCategory(name: string): { category: Category; hint: string | null } {
  let best:
    | { category: Category; keyword: string; strength: number; end: number }
    | null = null;

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      const at = name.lastIndexOf(keyword);
      if (at === -1) continue;

      const candidate = { keyword, strength: rule.strength, end: at + keyword.length };
      if (isBetterMatch(candidate, best)) {
        best = { ...candidate, category: rule.category };
      }
    }
  }

  // 判定できなければ「その他」に寄せる（除外はしない）
  return best === null
    ? { category: "その他", hint: null }
    : { category: best.category, hint: best.keyword };
}

/**
 * 商品名から問屋都合の表記を取り除く。
 *
 * 井ノ口の商品名には「＃15 うまい棒 チーズ味（３０本入り）第一＆第二工場」のように、
 * 価格・販売単位・製造工場が混ざっている。表示に使うのは商品名だけなので落とす。
 *
 * ただし「(当り付き)」のような商品特性は残す。
 * 括弧を落とすのは中に数字が入っているもの（＝販売単位）に限定している。
 */
/**
 * 商品名に埋まっている希望小売価格を読み、名前から取り除く。
 *
 * 井ノ口の表記は4通りある（179商品の実測）。
 *   ＃15 うまい棒 チーズ味            先頭に # または ＃ + 数字   153件
 *   ♯20 キャラメルの魔法（28入）       先頭に ♯ + 数字              5件
 *   40すっぱいぶどうにご用心（20入）    先頭が記号なしの数字          6件
 *   3本きなこ飴棒(15袋入り）#35        末尾に #NN                   2件
 * 残り12件は名前に価格が無く（価格欄に「148ｇ入1袋」のような単位しか無い）、
 * 取り込めない。チロルチョコバラエティパックもこれに当たる。
 *
 * ★末尾を先に見ること。
 *   「3本きなこ飴棒(15袋入り）#35」の先頭「3」は本数で、価格は末尾の 35。
 *   先頭から読むと 3円になる。
 *
 * ★♯ は U+266F（音楽の嬰記号）で、# (U+0023) とも ＃ (U+FF03) とも別の文字。
 *   見た目がほぼ同じなので、文字クラスに入れ忘れると静かに5件落ちる。
 */
function extractPrice(rawName: string): { price: number; rest: string } | null {
  const tail = rawName.match(/[#＃♯]\s*(\d+)\s*$/);
  if (tail) return { price: Number(tail[1]), rest: rawName.slice(0, tail.index).trim() };

  const head = rawName.match(/^[#＃♯]\s*(\d+)\s*/);
  if (head) return { price: Number(head[1]), rest: rawName.slice(head[0].length) };

  // 記号なし。数字の直後が数字以外であることを確かめて、入数と取り違えないようにする。
  const bare = rawName.match(/^(\d+)\s*(?=\D)/);
  if (bare) return { price: Number(bare[1]), rest: rawName.slice(bare[0].length) };

  return null;
}

function cleanName(raw: string): string {
  return (
    raw
      // 価格表記は extractPrice が先に取り除いてある
      .replace(/^特価\s*/, "")
      // 「第一工場」「第二工場」「第一＆第二工場」
      .replace(/第[一二三四五六七八九十]+(?:\s*[＆&]\s*第[一二三四五六七八九十]+)?工場/g, "")
      // 括弧内に数字を含む販売単位「（３０本入り）」「(20袋入り)」「（１８０ｇ入）」
      .replace(/[（(][^）)]*[0-9０-９][^）)]*[入付][^）)]*[)）]/g, "")
      // 括弧なしの販売単位「30入」「20入り1袋」
      .replace(/[0-9０-９]+\s*[入付][りイ]?\s*[0-9０-９]*\s*[袋箱本個]?\s*$/, "")
      // 末尾の内容量「34g」「22.5g」「11g」
      .replace(/[0-9０-９.．]+\s*[gｇ]\s*$/, "")
      .replace(/[\s　]+/g, " ")
      .trim()
  );
}

/**
 * 味違いを束ねるシリーズの判定。
 * 商品名にキーワードを含めば、そのシリーズに属するとみなす。
 *
 * ガチャの重みをシリーズ内の件数で割るためのもので、束ね漏れがあると
 * そのシリーズだけ排出率を占有してしまう。実際うまい棒は15件ある。
 */
const SERIES_RULES: { keyword: string; seriesId: string }[] = [
  { keyword: "うまい棒", seriesId: "umaibo" },
  { keyword: "東豊ポテトフライ", seriesId: "toho-potato-fry" },
  { keyword: "オリオン ミニ", seriesId: "orion-mini" },
  // 明治チューインガムの「すっぱい○○にご用心」。ぶどう / ソーダ / レモンの味違い。
  // 「用心」を含む商品は他に無いので、この語だけで取り違えは起きない。
  { keyword: "にご用心", seriesId: "suppai-goyoujin" },
];

function inferSeriesId(name: string): string | null {
  for (const rule of SERIES_RULES) {
    if (name.includes(rule.keyword)) return rule.seriesId;
  }
  return null;
}

function parsePage(html: string): RawItem[] {
  const blocks = [...html.matchAll(/<div class="itemThumBox">([\s\S]*?)<\/div>\s*<\/div>/g)];
  const items: RawItem[] = [];

  for (const block of blocks) {
    const m = block[1].match(/<p><a href="([^"]+)">([^<]+)<\/a><\/p>/);
    if (!m) continue;

    const sourceUrl = m[1];
    const rawName = m[2].replace(/[\s　]+/g, " ").trim();

    const extracted = extractPrice(rawName);
    if (!extracted) continue; // 価格表記が無い商品は対象外
    const price = extracted.price;

    const idMatch = sourceUrl.match(/\/(\d+)\.html$/);
    if (!idMatch) continue;

    // 販売単位は全角数字と「本/個/袋」を挟む表記があるので幅広く拾う
    const packMatch = extracted.rest.match(/[（(]?\s*([0-9０-９]+)\s*[^）)]{0,2}[入付]/);
    const name = cleanName(extracted.rest);
    // カテゴリ推定は掃除前の名前に対して行う（「当り付き」などの手がかりが残っているため）
    const { category, hint } = inferCategory(rawName);

    items.push({
      id: `inokuchi-${idMatch[1]}`,
      name,
      price,
      packSize: packMatch ? Number(packMatch[1].replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))) : null,
      sourceUrl,
      seriesId: inferSeriesId(name),
      category,
      categoryHint: hint,
    });
  }

  return items;
}

async function main(): Promise<void> {
  console.log(`井ノ口商店から取得します${refresh ? "（キャッシュを無視）" : ""}`);

  const firstPage = await fetchPage(1);
  const lastPage = Math.min(readLastPage(firstPage), MAX_PAGES);
  console.log(`  全${lastPage}ページ`);

  const pages = [firstPage];
  for (let n = 2; n <= lastPage; n++) {
    pages.push(await fetchPage(n));
  }

  const byId = new Map<string, RawItem>();
  for (const html of pages) {
    for (const item of parsePage(html)) {
      byId.set(item.id, item); // 同じ商品が複数ページに出ても1件にまとめる
    }
  }
  const items = [...byId.values()];

  // カテゴリ推定の結果を見せる（外れを直せるように）
  const byCategory = new Map<string, number>();
  for (const item of items) {
    const key = item.categoryHint === null ? "その他（推定できず）" : item.category;
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }

  console.log(`\n取得できた商品: ${items.length}件`);
  console.log("カテゴリ推定:");
  for (const category of [...CATEGORIES, "その他（推定できず）"]) {
    const count = byCategory.get(category) ?? 0;
    if (count > 0) console.log(`  ${String(category).padEnd(12)} ${String(count).padStart(4)}件`);
  }

  const bySeries = new Map<string, number>();
  for (const item of items) {
    if (item.seriesId) bySeries.set(item.seriesId, (bySeries.get(item.seriesId) ?? 0) + 1);
  }
  if (bySeries.size > 0) {
    console.log("シリーズ判定:");
    for (const [id, count] of bySeries) console.log(`  ${id.padEnd(18)} ${String(count).padStart(4)}件`);
  }

  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  console.log(
    `価格帯: ${prices[0]}円 〜 ${prices[prices.length - 1]}円 ` +
      `（中央値 ${prices[Math.floor(prices.length / 2)]}円）`,
  );

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        source: "inokuchi",
        sourceName: "井ノ口商店（希望小売価格）",
        sourceUrl: BASE_URL,
        fetchedAt: resolveFetchedAt(OUTPUT_PATH, fetchedFromNetwork),
        items,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`\n✓ data/sources/inokuchi.json を書きました`);
  console.log("  反映するには npm run build:data を実行してください。");
}

await main();
