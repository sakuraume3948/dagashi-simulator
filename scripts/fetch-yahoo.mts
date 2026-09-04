/**
 * Yahoo!ショッピング商品検索APIで、既存商品にメーカー名とJANコードを補う。
 *
 *   npm run fetch:yahoo              キャッシュがあればそれを使う
 *   npm run fetch:yahoo -- --refresh APIに問い合わせ直す
 *
 * ★このスクリプトは新しい商品を増やさない。
 *   data/sources/inokuchi.json にある商品に対して、
 *   メーカー名とJANコードの「候補」を出すだけ。
 *   ECの価格はまとめ売り価格なので取り込まない。
 *
 * ★このスクリプト単独では何も確定させない。
 *   出力するキーは _makerCandidate と _janCandidate で、どちらも "_" 始まり。
 *   build-data は "_" 始まりのキーを商品データに取り込まないため、
 *   Yahoo!だけの判断が lib/data.ts に届くことはない。
 *   採否は scripts/fetch-rakuten.mts が両APIを突き合わせて決める。
 *
 * ★取得するのは事実情報のみ。商品画像と商品説明文は取得しない。
 *
 * ★公開されるアプリはこのAPIを呼ばない。
 *   取得は開発者の手元でのみ行い、結果を data/sources/yahoo.json に保存する。
 *   訪問者が何人来てもAPIアクセスは発生しない。
 *
 * ★レート制限: 1クエリ/秒、アプリケーションIDごとに1分30リクエスト。
 *   余裕を見て 2.5 秒間隔にしている。
 *
 * 事前に .env.local に YAHOO_CLIENT_ID を設定しておくこと。
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { acceptableJan } from "./jan.mts";
import { majority } from "./majority.mts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(ROOT, "data/.cache/yahoo");
const INPUT_PATH = path.join(ROOT, "data/sources/inokuchi.json");
const OUTPUT_PATH = path.join(ROOT, "data/sources/yahoo.json");
const REPORT_PATH = path.join(ROOT, "data/.cache/yahoo-review.txt");

const ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const DELAY_MS = 2500;
/** 多数決に使う検索結果の件数。 */
const RESULTS_PER_QUERY = 10;
/** brand に入っていても意味が無い値。 */
const BRAND_NOISE = ["ブランド登録なし", "ノーブランド", "-", ""];

/**
 * メーカー名として採用する最低一致率（検索結果10件中、何件が同じブランドを返したか）。
 *
 * 実測では 1〜2件しか一致しないものは誤マッチがほとんどだった。
 *   ちゅるりんジェリー → カミオジャパン (1/10)
 *   ココナッツクッキー → WINGRAM       (1/10)   ← 1位が海外製の別商品
 *   マカロンクッキー   → わらいみらい   (1/10)
 * 間違ったメーカー名を表示するより、空欄のままの方が害が小さいと判断した。
 */
const MIN_BRAND_AGREEMENT = 3;

/**
 * Yahoo!の brand は「メーカー」ではなく「ブランド」なので、
 * 商品ブランド名がそのまま入ってくることがある。
 * これらはメーカー名ではないので採用しない。
 *
 *   うまい棒 → 正しくは やおきん
 *   PRETZ    → 正しくは 江崎グリコ
 */
const NOT_A_MAKER = [
  // 商品ブランド名。一致率が高くても誤りなので、しきい値では弾けない
  "うまい棒", // 正しくは やおきん
  "ブタメン", // 正しくは おやつカンパニー
  "ガブリチュウ", // 正しくは 明治チューインガム
  "ミルメーク", // 正しくは 大島食品工業
  "ミルキー", // 正しくは 不二家
  "PRETZ", // 正しくは 江崎グリコ
  "プリッツ",
  "HIーCHEW", // 正しくは 森永製菓
  "カップヌードル", // 誤マッチ。1位が別商品
  // 明らかに菓子と無関係の業種。検索が別ジャンルに流れた結果
  "Wpc.", // 日傘ブランド
  "LITHON", // 家電メーカー
  "nippn", // 製粉会社。パスタ商品に引っ張られた
];

/**
 * Yahoo!のブランド名には分類の括弧書きが付くことがある。
 *   「オリオン（お菓子）」→「オリオン」
 *   「Pine（食品）」      →「Pine」
 */
function normalizeMaker(raw: string): string {
  return raw
    .replace(/[（(][^）)]*[)）]\s*$/, "")
    .replace(/[\s　]+/g, " ")
    .trim();
}

const refresh = process.argv.includes("--refresh");

const CLIENT_ID = process.env.YAHOO_CLIENT_ID;
if (!CLIENT_ID) {
  console.error("YAHOO_CLIENT_ID が設定されていません。");
  console.error(".env.local に YAHOO_CLIENT_ID=... を書いてください。");
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Hit = {
  name?: string;
  janCode?: string | number;
  brand?: { name?: string };
  genreCategory?: { name?: string };
};

/** APIを叩く。キャッシュがあればそれを返す。 */
async function search(id: string, query: string): Promise<Hit[]> {
  const cachePath = path.join(CACHE_DIR, `${id}.json`);
  if (!refresh && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as Hit[];
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("appid", CLIENT_ID!);
  url.searchParams.set("query", query);
  url.searchParams.set("results", String(RESULTS_PER_QUERY));

  const res = await fetch(url);
  if (!res.ok) {
    // 429（レート超過）は待って諦める。次回実行で取り直せる。
    console.warn(`  ! ${query}: HTTP ${res.status}`);
    await sleep(DELAY_MS * 2);
    return [];
  }

  const json = (await res.json()) as { hits?: Hit[] };
  // 必要な項目だけを残して保存する（画像・説明文は保持しない）
  const hits: Hit[] = (json.hits ?? []).map((h) => ({
    name: h.name,
    janCode: h.janCode,
    brand: h.brand?.name ? { name: h.brand.name } : undefined,
    genreCategory: h.genreCategory?.name ? { name: h.genreCategory.name } : undefined,
  }));

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(hits, null, 2), "utf8");
  await sleep(DELAY_MS);
  return hits;
}

type Enriched = {
  id: string;
  /** 楽天との突き合わせ材料。"_" 始まりなので最終データには入らない。 */
  _makerCandidate?: string;
  /**
   * JANコードの候補。★これも "_" 始まりで、最終データには入らない。
   *
   * メーカー名と同じ理由で、Yahoo!単独ではJANを確定させない。
   * 検索は商品名の曖昧一致なので、上位10件に単品が1つも入らないことがある
   * （「ココナッツクッキー」で10件すべて別商品だった実績がある）。
   * 採否は scripts/fetch-rakuten.mts が両者を突き合わせて決める。
   */
  _janCandidate?: string;
  /** 上位10件のうち何件が同じJANを返したか。採否の判定に使う。 */
  _janAgreed?: number;
  source: "yahoo";
  /** 人間が確認するための情報。build-data は "_" 始まりのキーを無視する。 */
  _review: {
    query: string;
    topName: string | null;
    janAgreement: string;
    brandAgreement: string;
    /** APIが返した生のブランド名。判定基準を変えて再評価するときに使う。 */
    brandRaw: string | null;
    /** メーカー名として採用しなかった理由。採用したなら null。 */
    brandRejected: string | null;
    genre: string | null;
  };
};

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync(INPUT_PATH, "utf8")) as {
    items: { id: string; name: string }[];
  };

  console.log(`Yahoo!ショッピングAPIで ${input.items.length}件を照会します`);
  if (!refresh) console.log("（キャッシュがあるものは問い合わせません）");

  const enriched: Enriched[] = [];
  const reportLines: string[] = [];
  let done = 0;
  let makerFound = 0;
  let janFound = 0;

  for (const item of input.items) {
    const hits = await search(item.id, item.name);
    done++;

    const jan = majority(hits.map((h) => acceptableJan(h.janCode)));
    const usableBrand = (h: Hit): string | undefined =>
      h.brand?.name && !BRAND_NOISE.includes(h.brand.name) ? h.brand.name : undefined;

    // ★正規化は多数決の「前」に行う。
    //   「オリオン（お菓子）」と「オリオン」を別の値として数えると票が割れ、
    //   本当は多数派なのに MIN_BRAND_AGREEMENT を下回って捨てられてしまう。
    const brand = majority(
      hits.map((h) => {
        const raw = usableBrand(h);
        return raw === undefined ? undefined : normalizeMaker(raw);
      }),
    );
    // 判定には使わない、人間が確認するための生の値。
    const brandRaw = majority(hits.map(usableBrand));
    const genre = majority(hits.map((h) => h.genreCategory?.name));

    // メーカー名として採用するか判定する。
    // 一致率が低いもの、商品ブランド名にすぎないものは捨てる。
    const normalized = brand.value;
    let maker: string | null = null;
    let rejectReason = "";
    if (!normalized) {
      rejectReason = "brand なし";
    } else if (brand.agreed < MIN_BRAND_AGREEMENT) {
      rejectReason = `一致率が低い (${brand.agreed}/${brand.total})`;
    } else if (NOT_A_MAKER.includes(normalized)) {
      rejectReason = "商品ブランド名でありメーカーではない";
    } else {
      maker = normalized;
    }

    if (maker) makerFound++;
    if (jan.value) janFound++;

    // ★maker は最終データに出さない。楽天との突き合わせ材料としてのみ使う。
    //   単独の情報源だけでメーカー名を決めると誤りが混入するため
    //   （HIーCHEW を 9/10 の一致率で誤採用した実績がある）。
    //   採用の判断は scripts/fetch-rakuten.mts が両者の一致を見て行う。
    enriched.push({
      id: item.id,
      // "_" 始まりなので build-data はこれを商品データに取り込まない。
      ...(maker ? { _makerCandidate: maker } : {}),
      ...(jan.value ? { _janCandidate: jan.value, _janAgreed: jan.agreed } : {}),
      source: "yahoo",
      _review: {
        query: item.name,
        topName: hits[0]?.name ?? null,
        janAgreement: `${jan.agreed}/${jan.total}`,
        brandAgreement: `${brand.agreed}/${brand.total}`,
        brandRaw: brandRaw.value,
        brandRejected: rejectReason || null,
        genre: genre.value,
      },
    });

    reportLines.push(
      [
        item.id.padEnd(18),
        item.name.slice(0, 24).padEnd(26),
        `maker=${(maker ?? "-").slice(0, 14).padEnd(16)}(${brand.agreed}/${brand.total})`,
        `jan=${(jan.value ?? "-").padEnd(14)}(${jan.agreed}/${jan.total})`,
        rejectReason ? `[不採用:${rejectReason} raw=${brand.value ?? "-"}]` : "",
      ].join(" "),
    );

    if (done % 20 === 0) console.log(`  ${done}/${input.items.length} 件`);
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        source: "yahoo",
        sourceName: "Yahoo!ショッピング商品検索API（メーカー名・JANコードの補完）",
        fetchedAt: new Date().toISOString(),
        items: enriched,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, reportLines.join("\n") + "\n", "utf8");

  console.log(`\n照会完了: ${done}件`);

  const rejectCounts = new Map<string, number>();
  for (const e of enriched) {
    const reason = e._review.brandRejected;
    if (!reason) continue;
    // 「一致率が低い (2/10)」のような個別の数字はまとめて数える
    const key = reason.startsWith("一致率") ? "一致率が低い" : reason;
    rejectCounts.set(key, (rejectCounts.get(key) ?? 0) + 1);
  }

  console.log(`  メーカー名が取れた: ${makerFound}件 (${((makerFound / done) * 100).toFixed(0)}%)`);
  for (const [reason, count] of [...rejectCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`    └ 不採用 ${reason.padEnd(26)} ${String(count).padStart(3)}件`);
  }
  console.log(`  JANコードの候補が取れた: ${janFound}件 (${((janFound / done) * 100).toFixed(0)}%)`);
  console.log("    ※候補どまり。採否は fetch:rakuten が両APIを突き合わせて決める。");
  console.log(`\n✓ data/sources/yahoo.json を書きました`);
  console.log(`  一致率つきの一覧: data/.cache/yahoo-review.txt`);
  console.log("  反映するには npm run build:data を実行してください。");
}

await main();
