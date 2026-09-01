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
 * 商品名からカテゴリを推定する。
 * 上から順に見て、最初に当たったものを採用する（並び順に意味がある）。
 * 外れたぶんは data/overrides.json で直す想定。
 */
const CATEGORY_RULES: { keywords: string[]; category: Category }[] = [
  { keywords: ["ラムネ", "ミンツ", "タブレット", "サイダー菓子"], category: "ラムネ・タブレット" },
  { keywords: ["くじ", "当り", "当たり", "あたり", "抽選"], category: "くじ・当たり付き" },
  {
    keywords: ["チョコ", "ショコラ", "きのこの山", "たけのこの里", "アルフォート"],
    category: "チョコ",
  },
  {
    keywords: ["グミ", "キャンディ", "キャンデー", "飴", "あめ", "ガム", "チュウ", "ゼリー", "ボー", "水あめ"],
    category: "グミ・キャンディ",
  },
  {
    keywords: ["ジュース", "コーラ", "サイダー", "ドリンク", "飲料", "牛乳", "ヨーグル"],
    category: "飲料",
  },
  {
    keywords: ["せんべい", "煎餅", "あられ", "おかき", "イカ", "いか", "するめ", "こんぶ", "昆布", "カルパス", "珍味", "さん太郎", "梅", "たこ", "肉", "ビーフ", "カツ"],
    category: "せんべい・おつまみ",
  },
  {
    keywords: ["スナック", "ポテト", "コーン", "うまい棒", "太郎", "ラーメン", "フライ", "クッキー", "ビスケット", "ドーナ", "パフ"],
    category: "スナック",
  },
];

function inferCategory(name: string): { category: Category; hint: string | null } {
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (name.includes(keyword)) return { category: rule.category, hint: keyword };
    }
  }
  // 判定できなければ「その他」に寄せる（除外はしない）
  return { category: "その他", hint: null };
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
function cleanName(raw: string): string {
  return (
    raw
      // 先頭の価格表記「＃15」「#220」
      .replace(/^[#＃]\s*[0-9０-９]+\s*/, "")
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

    // 「＃50」または「#50」から希望小売価格を読む
    const priceMatch = rawName.match(/^[#＃]\s*(\d+)/);
    if (!priceMatch) continue; // 価格表記が無い商品は対象外
    const price = Number(priceMatch[1]);

    const idMatch = sourceUrl.match(/\/(\d+)\.html$/);
    if (!idMatch) continue;

    // 販売単位は全角数字と「本/個/袋」を挟む表記があるので幅広く拾う
    const packMatch = rawName.match(/[（(]?\s*([0-9０-９]+)\s*[^）)]{0,2}[入付]/);
    const name = cleanName(rawName);
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
        fetchedAt: new Date().toISOString(),
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
