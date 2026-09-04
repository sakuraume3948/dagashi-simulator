/**
 * data/sources/*.json と data/overrides.json をマージして lib/data.ts を生成する。
 *
 *   node --experimental-strip-types scripts/build-data.mts
 *   （npm run build:data）
 *
 * ★このスクリプトは data/overrides.json を絶対に書き換えない。
 *   自動取得を何度やり直しても、手で決めた価格や seriesId が消えないようにするため。
 *
 * 価格が確定しない商品は出力せず、警告として一覧表示する
 * （「価格が分からない駄菓子は使わない」という方針のため）。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { CATEGORIES, type Category } from "../lib/types.ts";
import { hasValidCheckDigit, isJapaneseJan } from "./jan.mts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES_DIR = path.join(ROOT, "data/sources");
const OVERRIDES_PATH = path.join(ROOT, "data/overrides.json");
const OUTPUT_PATH = path.join(ROOT, "lib/data.ts");

/**
 * 情報源の優先順位。後ろにあるものが勝つ。
 *
 * yahoo と rakuten は maker と sourceId だけを持つ補完用の情報源なので後ろに置く。
 * rakuten を yahoo より後にしているのは、楽天プロダクトの makerName が
 * 製品マスタ由来の会社名であり、Yahoo! の brand（店舗が付けたブランド名）より
 * 構造的に正確なため。
 * 価格を持たないため、井ノ口の希望小売価格を上書きすることはない
 * （assignDefined が undefined のキーを無視するため）。
 *
 * さらに強い上書きが必要なら data/overrides.json を使う。
 */
const SOURCE_PRIORITY = ["inokuchi", "yahoo", "rakuten"];

type SourceItem = {
  id: string;
  name?: string;
  maker?: string;
  price?: number;
  category?: string;
  unit?: string;
  seriesId?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
};

type SourceFile = {
  source: string;
  sourceName?: string;
  fetchedAt: string | null;
  items: SourceItem[];
};

type Override = Partial<SourceItem> & { weight?: number | null; exclude?: boolean };

/**
 * マージ途中の商品。
 *
 * ★覚えるのは「価格を出した情報源」であって、最後に書いた情報源ではない。
 *   lib/types.ts が fetchedAt を「価格を取得した日時（値上げ追跡用）」と
 *   定義しているため、後から maker だけを足した rakuten の取得日を
 *   入れてしまうと意味がずれる。
 */
type Merged = SourceItem & {
  weight?: number | null;
  exclude?: boolean;
  /** 価格を供給した情報源。 */
  origin: string;
  /** その情報源が価格を取得した日時。 */
  fetchedAt: string | null;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function loadSources(): SourceFile[] {
  if (!existsSync(SOURCES_DIR)) return [];

  const files = readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".json"));
  const loaded = files.map((f) => readJson<SourceFile>(path.join(SOURCES_DIR, f)));

  // 優先順位の配列に載っていない情報源は先頭（最も弱い）に置く。
  return loaded.sort(
    (a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source),
  );
}

/**
 * 値が undefined のキーは上書きに使わない（「未指定」と「消したい」を区別するため）。
 * "_" で始まるキーは人間向けの注釈（_reason など）なので取り込まない。
 */
function assignDefined(target: Merged, patch: Partial<Merged>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith("_")) continue;
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
}

function merge(sources: SourceFile[], overrides: Record<string, Override>): Merged[] {
  const byId = new Map<string, Merged>();

  for (const source of sources) {
    for (const item of source.items) {
      const existing = byId.get(item.id);
      if (existing) {
        assignDefined(existing, item);
        // 価格を持ってきた情報源だけが「取得元」を名乗る。
        if (item.price !== undefined) {
          existing.origin = source.source;
          existing.fetchedAt = source.fetchedAt;
        }
      } else {
        byId.set(item.id, {
          ...item,
          origin: source.source,
          fetchedAt: item.price !== undefined ? source.fetchedAt : null,
        });
      }
    }
  }

  // overrides は常に最後、常に最強。
  for (const [id, patch] of Object.entries(overrides)) {
    const existing = byId.get(id);
    if (!existing) {
      console.warn(`  ⚠ overrides に未知のID: ${id}（どの情報源にも無い）`);
      continue;
    }
    assignDefined(existing, patch as Partial<Merged>);
    // 手で価格を決めた商品は、自動取得の取得日を名乗ってはいけない。
    if (patch.price !== undefined) {
      existing.origin = "overrides";
      existing.fetchedAt = null;
    }
  }

  return [...byId.values()];
}

type Rejected = { id: string; name: string; reason: string };

function validate(items: Merged[]): { valid: Merged[]; rejected: Rejected[] } {
  const valid: Merged[] = [];
  const rejected: Rejected[] = [];
  for (const item of items) {
    const name = item.name ?? "(名前なし)";
    const reject = (reason: string) => rejected.push({ id: item.id, name, reason });

    if (item.exclude === true) {
      reject("overrides で exclude: true が指定されている");
      continue;
    }
    // ★必須なのは name と price だけ。
    //   maker / unit は取得できない情報源があるため、無ければ null のまま通す。
    if (!item.name) {
      reject("商品名が空");
      continue;
    }
    // カテゴリが決まらないものは「その他」に寄せる（除外はしない）
    // カテゴリが決まらないものは「その他」に寄せる（除外はしない）。
    // ★書いてあるのに定義に無い場合は警告する。overrides.json のカテゴリ名を
    //   打ち間違えたとき、黙って「その他」になると気づけないため。
    if (item.category && !(CATEGORIES as readonly string[]).includes(item.category)) {
      console.warn(`  ⚠ ${item.id} のカテゴリが未定義: ${item.category} → その他に変更`);
    }
    if (!item.category || !(CATEGORIES as readonly string[]).includes(item.category)) {
      item.category = "その他";
    }
    // ★価格が決まらない商品は使わない
    if (item.price === undefined || item.price === null) {
      reject("価格が未確定");
      continue;
    }
    if (!Number.isInteger(item.price) || item.price < 1) {
      reject(`価格が1以上の整数でない: ${item.price}`);
      continue;
    }
    // ★JANが壊れていても商品自体は捨てない（価格さえあれば成立するため）。
    //   JANだけを落として警告する。overrides.json に手で書いた値の打ち間違いも
    //   ここで止まる。
    if (item.sourceId) {
      if (!hasValidCheckDigit(item.sourceId)) {
        console.warn(`  ⚠ ${item.id} のJANが検査数字を通らない: ${item.sourceId} → 破棄`);
        item.sourceId = null;
      } else if (!isJapaneseJan(item.sourceId)) {
        console.warn(`  ⚠ ${item.id} のJANが日本(45/49)以外: ${item.sourceId} → 破棄`);
        item.sourceId = null;
      }
    }

    valid.push(item);
  }

  return { valid, rejected };
}

function quote(value: string): string {
  return JSON.stringify(value);
}

/** 最も多く出てくる値。行ごとに同じ文字列が143回並ぶのを避けるための既定値に使う。 */
function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function generateTypeScript(items: Merged[], sources: SourceFile[]): string {
  // 価格の取得元と取得日時は情報源ごとに一定なので、多数派を d() の既定値にして
  // 各行から省く。情報源が増えて値が割れたら、割れた行だけが値を持つ。
  const defaultSource = mostCommon(items.map((i) => i.origin)) ?? "inokuchi";
  const defaultFetchedAt = mostCommon(items.map((i) => i.fetchedAt)) ?? null;

  const byCategory = new Map<Category, Merged[]>();
  for (const category of CATEGORIES) byCategory.set(category, []);
  for (const item of items) byCategory.get(item.category as Category)!.push(item);

  const sourceLines = sources.map((s) => {
    const label = s.sourceName ?? s.source;
    const when = s.fetchedAt ? ` / 取得日: ${s.fetchedAt.slice(0, 10)}` : "";
    return ` *   - ${label}（${s.items.length}件${when}）`;
  });

  const tierOf = (p: number) =>
    p <= 20 ? "10〜20円" : p <= 50 ? "30〜50円" : p <= 100 ? "60〜100円" : "101円〜";
  const tierCounts = new Map<string, number>();
  for (const item of items) {
    const tier = tierOf(item.price!);
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
  }
  const tierLine = [...tierCounts.entries()].map(([t, c]) => `${t}: ${c}件`).join(" / ");

  const blocks: string[] = [];
  for (const category of CATEGORIES) {
    const group = byCategory.get(category)!;
    if (group.length === 0) continue;

    const header = `  // ── ${category} (${group.length}件) ${"─".repeat(Math.max(2, 34 - category.length * 2))}`;
    const rows = group.map((item) => {
      const args = [
        quote(item.id),
        quote(item.name!),
        item.maker ? quote(item.maker) : "null",
        String(item.price),
        quote(item.category!),
        item.unit ? quote(item.unit) : "null",
      ];

      // 由来は数が多く、大半の商品で同じ値になる。位置引数を増やすと
      // d(...) が読めなくなるので、埋まっているものだけをオブジェクトで渡す。
      const from: string[] = [];
      if (item.sourceId) from.push(`jan: ${quote(item.sourceId)}`);
      if (item.sourceUrl) from.push(`url: ${quote(item.sourceUrl)}`);
      if (item.origin !== defaultSource) from.push(`source: ${quote(item.origin)}`);
      if (item.fetchedAt !== defaultFetchedAt) {
        from.push(`at: ${item.fetchedAt ? quote(item.fetchedAt) : "null"}`);
      }

      // seriesId は位置引数なので、由来を渡すときは省略できない
      if (item.seriesId || from.length > 0) {
        args.push(item.seriesId ? quote(item.seriesId) : "null");
      }
      if (from.length > 0) args.push(`{ ${from.join(", ")} }`);

      return `  d(${args.join(", ")}),`;
    });
    blocks.push([header, ...rows].join("\n"));
  }

  return `import type { Category, Dagashi, DataSource } from "./types";

/**
 * 駄菓子マスタ。
 *
 * ★このファイルは scripts/build-data.mts が生成しています。直接編集しないでください。
 *   編集しても次回の \`npm run build:data\` で失われます。
 *
 *   商品を足す/直す場合:
 *     - 自動取得の結果   → data/sources/*.json
 *     - 手で決めた値     → data/overrides.json
 *
 * 情報源:
${sourceLines.join("\n")}
 *
 * 価格帯の分布: ${tierLine}
 * （ガチャの重みは 1/price^2 なので、価格帯が偏ると「高いものが出にくい」が成立しない）
 */

/**
 * 価格の取得元。全商品で同じなので定数にしてある。
 * 価格を持つ情報源が増えたら、違う値の商品だけが d() の第8引数で上書きする。
 */
const SOURCE: DataSource = ${quote(defaultSource)};
const FETCHED_AT = ${defaultFetchedAt ? quote(defaultFetchedAt) : "null"};

/** 全フィールドを毎回書くと読めなくなるので、可変部分だけ受け取る。 */
function d(
  id: string,
  name: string,
  maker: string | null,
  price: number,
  category: Category,
  unit: string | null,
  /** 味違いで束ねるシリーズ。省略すれば単独商品扱い。 */
  seriesId: string | null = null,
  /** 由来。埋まっているものだけを渡す。 */
  from: { jan?: string; url?: string; source?: DataSource; at?: string | null } = {},
): Dagashi {
  return {
    id,
    name,
    maker,
    price,
    category,
    unit,
    seriesId,
    rarity: null,
    weight: null,
    imageUrl: null,
    sourceUrl: from.url ?? null,
    source: from.source ?? SOURCE,
    sourceId: from.jan ?? null,
    fetchedAt: from.at !== undefined ? from.at : FETCHED_AT,
  };
}

export const DAGASHI_DATA: Dagashi[] = [
${blocks.join("\n\n")}
];
`;
}

function main(): void {
  const sources = loadSources();
  if (sources.length === 0) {
    console.error("data/sources/ に情報源がありません。");
    process.exit(1);
  }

  console.log("情報源:");
  for (const s of sources) {
    console.log(`  ${s.source.padEnd(10)} ${String(s.items.length).padStart(4)}件`);
  }

  const overridesFile = readJson<{ items?: Record<string, Override> }>(OVERRIDES_PATH);
  const overrides = overridesFile.items ?? {};
  console.log(`  overrides  ${String(Object.keys(overrides).length).padStart(4)}件`);

  const merged = merge(sources, overrides);
  const { valid, rejected } = validate(merged);

  if (rejected.length > 0) {
    console.log(`\n⚠ 除外した商品 (${rejected.length}件):`);
    for (const r of rejected) {
      console.log(`   ${r.id.padEnd(22)} ${r.name.padEnd(28)} ${r.reason}`);
    }
    console.log("   → data/overrides.json に価格を書けば復活します。");
  }

  writeFileSync(OUTPUT_PATH, generateTypeScript(valid, sources), "utf8");
  console.log(`\n✓ lib/data.ts を生成しました (${valid.length}件)`);
}

main();
