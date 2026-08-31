/**
 * 駄菓子シミュレータの中核となる型定義。
 *
 * 将来やりたいこと（スクレイピング / レア度システム / 商品画像）の受け皿を
 * 最初からフィールドとして用意してある。今は null が入るだけだが、
 * 後から値を入れるだけで機能が繋がるようにしておくことで、
 * 型やエンジンを書き換えずに拡張できる。
 */

export const CATEGORIES = [
  "スナック",
  "チョコ",
  "グミ・キャンディ",
  "ラムネ・タブレット",
  "せんべい・おつまみ",
  "飲料",
  "くじ・当たり付き",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** 将来のレア度システム用。今は未使用（全商品 null）。 */
export type Rarity = "N" | "R" | "SR" | "SSR";

export type Dagashi = {
  id: string;
  name: string;
  maker: string;
  /** 税込・円・整数。10円20円の世界なので端数を持たない。 */
  price: number;
  category: Category;
  /** 販売単位。"1本" "1袋(4個入)" など。 */
  unit: string;

  // --- 将来のレア度システム用 ---
  /** 今は全て null。値を入れるとガチャの抽選で価格ベースより優先される。 */
  rarity: Rarity | null;
  /** ガチャ重みの手動上書き。★今から有効。null なら 1/price^2 が使われる。 */
  weight: number | null;

  // --- 将来のスクレイピング / 画像用 ---
  /** null ならカテゴリ絵文字にフォールバックする。 */
  imageUrl: string | null;
  sourceUrl: string | null;
  source: "dummy" | "yahoo";
  /** JAN コード / 商品コード。 */
  sourceId: string | null;
  /** 価格を取得した日時 (ISO8601)。値上げ追跡用。 */
  fetchedAt: string | null;
};

/** 予算モードのカゴの中身1行（同一商品をまとめた単位）。 */
export type CartLine = {
  item: Dagashi;
  qty: number;
  /** item.price * qty */
  subtotal: number;
};

export type CartResult = {
  lines: CartLine[];
  /** 買った合計金額。必ず budget 以下になる。 */
  totalPrice: number;
  /** 買った合計個数（種類数ではない）。 */
  totalCount: number;
  /** おつり。totalPrice + change === budget が常に成立する。 */
  change: number;
};

export type BudgetOptions = {
  /** 同一商品の個数上限。0 で無制限。 */
  maxPerItem: number;
  /** 対象カテゴリ。空配列は「全カテゴリ」を意味する。 */
  categories: Category[];
};

export type GachaResult = {
  /** 排出順の配列。重複あり。 */
  items: Dagashi[];
  /** 排出された駄菓子を全部買った場合の金額。 */
  totalPrice: number;
};

/** 今は未使用。将来の確定枠・天井の受け皿。 */
export type GachaOptions = {
  guaranteedRarity?: Rarity;
  pityCount?: number;
};
