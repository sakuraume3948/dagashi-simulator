/**
 * 楽天プロダクト（商品価格ナビ製品検索）APIで、既存商品にメーカー名とJANコードを補う。
 *
 *   npm run fetch:rakuten              キャッシュがあればそれを使う
 *   npm run fetch:rakuten -- --refresh APIに問い合わせ直す
 *
 * ★Yahoo!ではなく楽天プロダクトを使う理由
 *   Yahoo!商品検索が返す brand は「店舗が付けたブランド名」で、
 *   メーカーと製品ブランドが区別されていない（うまい棒→「うまい棒」、
 *   ハイチュウ→「HIーCHEW」のように商品名が入ってくる）。
 *   楽天プロダクトは製品マスタなので makerName（会社名）が独立しており、
 *   構造的に正しいメーカー名が得られる。
 *
 * ★このスクリプトは新しい商品を増やさない。
 *   data/sources/inokuchi.json にある商品に maker と sourceId を足すだけ。
 *   ECの価格は取り込まない。商品画像と商品説明文も取得しない。
 *
 * ★メーカー名とJANコードの「採否を決める」のはこのスクリプト。
 *   fetch-yahoo.mts は候補（_makerCandidate / _janCandidate）を出すだけで、
 *   最終データには届かない。ここで両APIを突き合わせて確定させる。
 *
 * ★公開されるアプリはこのAPIを呼ばない。
 *   取得は開発者の手元でのみ行い、結果を data/sources/rakuten.json に保存する。
 *
 * ★Referer が必須（2026年2月のインフラ刷新以降）
 *   楽天は Referer / Origin ヘッダーを検査する。付けないと
 *   403 REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING になる。
 *   アプリ登録時の「許可されたWebサイト」と一致していないと 503 になる。
 *
 * 事前に .env.local に RAKUTEN_APPLICATION_ID と RAKUTEN_ACCESS_KEY を設定しておくこと。
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { acceptableJan } from "./jan.mts";
import { majority } from "./majority.mts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(ROOT, "data/.cache/rakuten");
const INPUT_PATH = path.join(ROOT, "data/sources/inokuchi.json");
const YAHOO_PATH = path.join(ROOT, "data/sources/yahoo.json");
const OUTPUT_PATH = path.join(ROOT, "data/sources/rakuten.json");
const REPORT_PATH = path.join(ROOT, "data/.cache/rakuten-review.txt");

const ENDPOINT = "https://openapi.rakuten.co.jp/ichibaproduct/api/Product/Search/20250801";

/**
 * アプリ登録時の「許可されたWebサイト」に合わせる必要がある。
 * ここが一致しないと 503 Authentication service error になる。
 */
const ALLOWED_SITE = "https://github.com";

/** 申告した予想QPSは1。余裕を見て2秒間隔にする。 */
const DELAY_MS = 2000;
const RESULTS_PER_QUERY = 10;

/**
 * 片方のAPIしかJANを返さなかったときに要求する最低一致率
 * （検索結果10件中、何件が同じJANを返したか）。
 *
 * fetch-yahoo.mts の MIN_BRAND_AGREEMENT と同じ考え方・同じ値。
 * 実測では、両APIが一致した36件はいずれもYahoo!側で2件以上が同じJANを返しており、
 * 1件しか一致していないものは1つも含まれていなかった。
 * 逆に不一致だった36件には1〜2件しか一致していないものが12件含まれる。
 * 一致率の低さと誤マッチは実際に相関している。
 */
const MIN_JAN_AGREEMENT = 3;

const refresh = process.argv.includes("--refresh");

const APP_ID = process.env.RAKUTEN_APPLICATION_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
if (!APP_ID || !ACCESS_KEY) {
  console.error("RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY が設定されていません。");
  console.error(".env.local に両方を書いてください。");
  process.exit(1);
}

/**
 * 製品マスタには食品以外のグッズが大量に混ざる。
 * 「うまい棒 めんたい味」で検索すると1位が「エコバッグ うまい棒 めんたい味」になる。
 * ジャンル名か商品名にこれらを含むものは、メーカー名の判定から除外する。
 */
const NOT_FOOD_KEYWORDS = [
  "ステッカー",
  "シール",
  "キーホルダー",
  "バッジ",
  "バッチ",
  "エコバッグ",
  "ハンドクリーム",
  "タオル",
  "Tシャツ",
  "ぬいぐるみ",
  "マスコット",
  "文具",
  "雑貨",
  "ポーチ",
  "クッション",
  "スマホケース",
  "コスプレ",
  "ガチャ",
];

/**
 * Yahoo! と楽天で表記が違うだけの同一メーカー。
 * 突き合わせる前に片方へ寄せる。
 *
 * ローマ字とカタカナの相互変換は機械的にできないため、
 * 実際に食い違ったものだけを明示的に列挙している。
 */
const MAKER_ALIASES: Record<string, string> = {
  BANDAI: "バンダイ",
  Pine: "パイン",
  Kanro: "カンロ",
  SEIKA: "セイカ食品",
  ORIHIRO: "オリヒロ",
  オリヒロプランデュ: "オリヒロ",
  マルタ: "マルタ食品",
};

/** 比較用に表記を揃える。採用する表示名は正規化後の値を使う。 */
function canonicalMaker(raw: string): string {
  const trimmed = raw
    .replace(/株式会社|㈱|\(株\)|有限会社/g, "")
    .replace(/[\s　]+/g, "")
    .trim();
  return MAKER_ALIASES[trimmed] ?? MAKER_ALIASES[raw] ?? trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RakutenProduct = {
  productName?: string;
  productCode?: string;
  makerName?: string;
  brandName?: string;
  genreName?: string;
};

/** APIを叩く。キャッシュがあればそれを返す。 */
async function search(id: string, query: string): Promise<RakutenProduct[]> {
  const cachePath = path.join(CACHE_DIR, `${id}.json`);
  if (!refresh && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as RakutenProduct[];
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("applicationId", APP_ID!);
  url.searchParams.set("accessKey", ACCESS_KEY!);
  url.searchParams.set("format", "json");
  url.searchParams.set("keyword", query);
  url.searchParams.set("hits", String(RESULTS_PER_QUERY));

  const res = await fetch(url, {
    headers: {
      "User-Agent": "dagashi-simulator/1.0 (personal hobby project)",
      Referer: `${ALLOWED_SITE}/`,
      Origin: ALLOWED_SITE,
    },
  });

  if (!res.ok) {
    console.warn(`  ! ${query}: HTTP ${res.status}`);
    await sleep(DELAY_MS * 2);
    return [];
  }

  const json = (await res.json()) as { Products?: { Product: RakutenProduct }[] };
  // 必要な項目だけ残す（画像URL・説明文・アフィリエイトURLは保持しない）
  const products: RakutenProduct[] = (json.Products ?? []).map((w) => ({
    productName: w.Product.productName,
    productCode: w.Product.productCode,
    makerName: w.Product.makerName ?? undefined,
    brandName: w.Product.brandName ?? undefined,
    genreName: w.Product.genreName ?? undefined,
  }));

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(products, null, 2), "utf8");
  await sleep(DELAY_MS);
  return products;
}

/** グッズ（食品でないもの）かどうか。 */
function looksLikeMerchandise(p: RakutenProduct): boolean {
  const text = `${p.genreName ?? ""} ${p.productName ?? ""}`;
  return NOT_FOOD_KEYWORDS.some((k) => text.includes(k));
}

type Enriched = {
  id: string;
  maker?: string;
  sourceId?: string;
  source: "rakuten";
  _review: {
    query: string;
    hits: number;
    /** グッズを除いた食品の件数 */
    foodHits: number;
    topFoodName: string | null;
    genre: string | null;
    makerAgreement: string;
    /** Yahoo!が返したメーカー名。一致すれば信頼度が高い */
    yahooMaker: string | null;
    agreesWithYahoo: boolean | null;
    janAgreement: string;
    /** Yahoo!が返したJAN候補。 */
    yahooJan: string | null;
    /** JANを採用した（またはしなかった）理由。 */
    janBasis: string;
  };
};

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync(INPUT_PATH, "utf8")) as {
    items: { id: string; name: string }[];
  };

  // Yahoo!の結果があれば突き合わせる
  const yahooMakers = new Map<string, string>();
  const yahooJans = new Map<string, { jan: string; agreed: number }>();
  if (existsSync(YAHOO_PATH)) {
    const y = JSON.parse(readFileSync(YAHOO_PATH, "utf8")) as {
      items: {
        id: string;
        _makerCandidate?: string;
        _janCandidate?: string;
        _janAgreed?: number;
      }[];
    };
    for (const it of y.items) {
      if (it._makerCandidate) yahooMakers.set(it.id, it._makerCandidate);
      if (it._janCandidate) {
        yahooJans.set(it.id, { jan: it._janCandidate, agreed: it._janAgreed ?? 0 });
      }
    }
  }

  console.log(`楽天プロダクトAPIで ${input.items.length}件を照会します`);
  if (!refresh) console.log("（キャッシュがあるものは問い合わせません）");

  const enriched: Enriched[] = [];
  const reportLines: string[] = [];
  let done = 0;
  let makerFound = 0;
  let janFound = 0;
  let noHit = 0;

  for (const item of input.items) {
    const all = await search(item.id, item.name);
    done++;

    const food = all.filter((p) => !looksLikeMerchandise(p));
    if (all.length === 0) noHit++;

    const maker = majority(food.map((p) => p.makerName));
    const jan = majority(food.map((p) => acceptableJan(p.productCode)));
    const genre = majority(food.map((p) => p.genreName));

    const yahooMaker = yahooMakers.get(item.id) ?? null;

    // ★メーカー名は Yahoo! と楽天が一致したときだけ採用する。
    //
    //   検索1件だけを頼りにすると誤マッチを拾う。実測では両方がメーカー名を
    //   返した20件のうち12件が食い違い、しかもどちらが正しいかは商品による。
    //     クッピーラムネ → yahoo=カクダイ製菓(正) / rakuten=ジェイズプランニング(誤)
    //     餅太郎・塩     → yahoo=カルビー(誤)     / rakuten=菓道(正)
    //   独立した2つの情報源が同じ答えを出したものだけを信用する。
    const canonicalRakuten = maker.value ? canonicalMaker(maker.value) : null;
    const canonicalYahoo = yahooMaker ? canonicalMaker(yahooMaker) : null;
    const agreesWithYahoo =
      canonicalRakuten && canonicalYahoo ? canonicalRakuten === canonicalYahoo : null;

    const adoptedMaker = agreesWithYahoo ? canonicalRakuten : null;

    // ★JANコードの採否。メーカー名と同じく、単独の情報源では確定させない。
    //
    //   両方がJANを返した72件のうち36件（50%）が食い違った。しかも
    //   食い違いの中身は「まったく別の商品」ではなく、末尾が近い隣接SKU
    //   （味違い・入数違い）が大半で、商品名だけではどちらが井ノ口の
    //   売っている単品なのか機械的に決められない。
    //     カンロ ザ・ストロンググミ ソーダ  yahoo=...26793 / rakuten=...26786
    //     ポリッキー                      yahoo=...246556 / rakuten=...246563
    //   そのため食い違ったものは推測せず、両方とも捨てる。
    //
    //   片方しかJANを持たない場合は、メーカー名の MIN_BRAND_AGREEMENT と
    //   同じ考え方で一致率のしきい値を課す。楽天は検索ヒット0件が153件中77件
    //   あり、「楽天の製品マスタに無いだけ」で Yahoo! 側の答えが
    //   悪いわけではないため、ここで捨てると根拠なく件数を失う。
    const yahooJan = yahooJans.get(item.id) ?? null;
    let adoptedJan: string | null = null;
    let janBasis = "どちらも取得できず";
    if (yahooJan && jan.value) {
      if (yahooJan.jan === jan.value) {
        adoptedJan = jan.value;
        janBasis = "両API一致";
      } else {
        janBasis = `両APIが不一致 (yahoo=${yahooJan.jan} / rakuten=${jan.value})`;
      }
    } else if (yahooJan) {
      if (yahooJan.agreed >= MIN_JAN_AGREEMENT) {
        adoptedJan = yahooJan.jan;
        janBasis = `Yahoo!のみ (一致率 ${yahooJan.agreed})`;
      } else {
        janBasis = `Yahoo!のみだが一致率が低い (${yahooJan.agreed})`;
      }
    } else if (jan.value) {
      if (jan.agreed >= MIN_JAN_AGREEMENT) {
        adoptedJan = jan.value;
        janBasis = `楽天のみ (一致率 ${jan.agreed})`;
      } else {
        janBasis = `楽天のみだが一致率が低い (${jan.agreed})`;
      }
    }

    if (adoptedMaker) makerFound++;
    if (adoptedJan) janFound++;

    enriched.push({
      id: item.id,
      ...(adoptedMaker ? { maker: adoptedMaker } : {}),
      ...(adoptedJan ? { sourceId: adoptedJan } : {}),
      source: "rakuten",
      _review: {
        query: item.name,
        hits: all.length,
        foodHits: food.length,
        topFoodName: food[0]?.productName ?? null,
        genre: genre.value,
        makerAgreement: `${maker.agreed}/${maker.total}`,
        yahooMaker,
        agreesWithYahoo,
        janAgreement: `${jan.agreed}/${jan.total}`,
        yahooJan: yahooJan?.jan ?? null,
        janBasis,
      },
    });

    reportLines.push(
      [
        item.id.padEnd(18),
        item.name.slice(0, 22).padEnd(24),
        `hits=${String(all.length).padStart(2)}/food=${String(food.length).padStart(2)}`,
        `maker=${(adoptedMaker ?? "-").slice(0, 16).padEnd(18)}(rakuten=${maker.value ?? "-"})`,
        `jan=${(adoptedJan ?? "-").padEnd(14)}[${janBasis}]`,
        yahooMaker ? `yahoo=${yahooMaker}${agreesWithYahoo ? " ✓一致" : " ✗不一致"}` : "",
      ].join(" "),
    );

    if (done % 20 === 0) console.log(`  ${done}/${input.items.length} 件`);
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        source: "rakuten",
        sourceName: "楽天プロダクト製品検索API（メーカー名・JANコードの補完）",
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

  const pct = (n: number) => `${((n / done) * 100).toFixed(0)}%`;
  console.log(`\n照会完了: ${done}件`);
  console.log(`  ヒット0件だった商品: ${noHit}件 (${pct(noHit)})`);
  console.log(`  ★メーカー名を採用:   ${makerFound}件 (${pct(makerFound)})  ← Yahoo!と一致したものだけ`);
  console.log(`  ★JANコードを採用:   ${janFound}件 (${pct(janFound)})`);

  const basisCounts = new Map<string, number>();
  for (const e of enriched) {
    // 「両APIが不一致 (yahoo=... / rakuten=...)」のような個別の値はまとめて数える
    const key = e._review.janBasis.replace(/\s*\(.*\)$/, "");
    basisCounts.set(key, (basisCounts.get(key) ?? 0) + 1);
  }
  for (const [basis, count] of [...basisCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`    └ ${basis.padEnd(28)} ${String(count).padStart(3)}件`);
  }
  console.log(`\n✓ data/sources/rakuten.json を書きました`);
  console.log(`  照合結果の一覧: data/.cache/rakuten-review.txt`);
  console.log("  反映するには npm run build:data を実行してください。");
}

await main();
