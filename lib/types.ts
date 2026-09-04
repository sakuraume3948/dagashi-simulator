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
  "くじ・当たり付き",
  /** 分類が付けられなかった商品の受け皿。自動取得で推定に失敗したものが入る。 */
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** 将来のレア度システム用。今は未使用（全商品 null）。 */
export type Rarity = "N" | "R" | "SR" | "SSR";

/**
 * 価格の取得元。
 *
 * "overrides" は data/overrides.json で人が価格を決めたもの。
 * yahoo / rakuten は価格を持たない補完用の情報源だが、将来
 * 価格を取れるようになったときのために型としては受け入れる。
 */
export type DataSource = "inokuchi" | "yahoo" | "rakuten" | "overrides";

/**
 * 必須なのは id / name / price / category の4つだけ。
 *
 * price は予算モードもガチャも成立しなくなるため絶対に必要。
 * maker と unit は「分かれば嬉しい」程度なので、取得できない情報源
 * （井ノ口商店など、商品名と価格しか持たないサイト）からのデータも
 * 受け入れられるよう null を許容する。
 */
export type Dagashi = {
  id: string;
  name: string;
  /** メーカー名。取得できない情報源があるため null 許容。 */
  maker: string | null;
  /** 税込・円・整数。10円20円の世界なので端数を持たない。 */
  price: number;
  category: Category;
  /** 販売単位。"1本" "1袋(4個入)" など。取得できない場合は null。 */
  unit: string | null;
  /**
   * 同一シリーズ（味違い・バリエーション違い）の識別子。単独商品は null。
   *
   * 「うまい棒 めんたい味」と「うまい棒 チーズ味」は seriesId: "umaibo" で束ねる。
   * ガチャの重みをシリーズ内の件数で割ることで、フレーバーが何種類増えても
   * シリーズ全体の出現率が変わらないようにするために使う。
   *
   * ベビースター「ミニ」と「ドデカイ」のようなサイズ違いは、
   * 味違いではなく別商品なので束ねない。
   */
  seriesId: string | null;

  // --- 将来のレア度システム用 ---
  /** 今は全て null。値を入れるとガチャの抽選で価格ベースより優先される。 */
  rarity: Rarity | null;
  /** ガチャ重みの手動上書き。★今から有効。null なら 1/price^2 が使われる。 */
  weight: number | null;

  // --- 将来のスクレイピング / 画像用 ---
  /** null ならカテゴリ絵文字にフォールバックする。 */
  imageUrl: string | null;
  sourceUrl: string | null;
  /** 価格を取得した情報源。 */
  source: DataSource;
  /**
   * JANコード。8桁(JAN-8)か13桁(EAN-13)で、検査数字を通ったものだけが入る。
   *
   * 商品名の曖昧検索で拾うため、確度が足りないものは埋めずに null にしてある。
   * 採否の基準は scripts/fetch-rakuten.mts を参照。
   */
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
  /** 同一商品（味単位）の個数上限。0 で無制限。 */
  maxPerItem: number;
  /**
   * 同一シリーズ（味を問わない）の個数上限。0 で無制限。
   *
   * seriesId を持たない単独商品は「自分1人だけのシリーズ」として扱う。
   * そうしないと、商品上限を無制限にしたときに
   * 単独商品だけ無限に買えてシリーズ商品だけ制限される、という
   * ちぐはぐな挙動になるため。
   *
   * 両方が有限のとき maxPerItem <= maxPerSeries であることを想定する
   * （逆だとシリーズ上限が先に効いて商品上限が意味を持たなくなる）。
   */
  maxPerSeries: number;
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
