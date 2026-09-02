import type { Category, Dagashi } from "./types";

/**
 * 駄菓子マスタ。
 *
 * ★このファイルは scripts/build-data.ts が生成しています。直接編集しないでください。
 *   編集しても次回の `npm run build:data` で失われます。
 *
 *   商品を足す/直す場合:
 *     - 自動取得の結果   → data/sources/*.json
 *     - 手で決めた値     → data/overrides.json
 *
 * 情報源:
 *   - 井ノ口商店（希望小売価格）（153件 / 取得日: 2026-09-01）
 *   - Yahoo!ショッピング商品検索API（メーカー名・JANコードの補完）（153件 / 取得日: 2026-09-01）
 *
 * 価格帯の分布: 30〜50円: 67件 / 101円〜: 3件 / 60〜100円: 22件 / 10〜20円: 51件
 * （ガチャの重みは 1/price^2 なので、価格帯が偏ると「高いものが出にくい」が成立しない）
 */

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
    sourceUrl: null,
    source: "dummy",
    sourceId: null,
    fetchedAt: null,
  };
}

export const DAGASHI_DATA: Dagashi[] = [
  // ── スナック (34件) ──────────────────────────
  d("inokuchi-49742", "ココナッツクッキー", null, 12, "スナック", null),
  d("inokuchi-47544", "プチドーナッツビスケット", null, 13, "スナック", null),
  d("inokuchi-47224", "ミルメーク ムギスナック", null, 10, "スナック", null),
  d("inokuchi-46451", "うま辛パンチみそラーメン", null, 100, "スナック", null),
  d("inokuchi-45410", "中村製菓 ポテトフライ", null, 40, "スナック", null),
  d("inokuchi-18401", "餅太郎・塩", "カルビー", 15, "スナック", null),
  d("inokuchi-19550", "うまい棒 牛タン塩味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-35219", "うまい棒 のり塩味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-44678", "カステラドーナツ太郎", null, 30, "スナック", null),
  d("inokuchi-43273", "ハニーバター太郎", null, 30, "スナック", null),
  d("inokuchi-18429", "もろこし輪太郎", null, 30, "スナック", null),
  d("inokuchi-18428", "キャベツ太郎", null, 30, "スナック", null),
  d("inokuchi-18431", "アメリカンフライドポテト", null, 30, "スナック", null),
  d("inokuchi-24317", "東豊ポテトフライ チキン味", "東豊製菓", 40, "スナック", null, "toho-potato-fry"),
  d("inokuchi-36594", "東豊ポテトフライ カルビ焼きの味", "東豊製菓", 40, "スナック", null, "toho-potato-fry"),
  d("inokuchi-36591", "東豊ポテトフライ じゃが塩バター味", "東豊製菓", 40, "スナック", null, "toho-potato-fry"),
  d("inokuchi-18483", "ヤングドーナツ", "宮田製菓", 58, "スナック", null),
  d("inokuchi-19268", "ど〜ん太郎 うどん", null, 20, "スナック", null),
  d("inokuchi-19272", "わさびのり太郎", null, 15, "スナック", null),
  d("inokuchi-18388", "うまい棒 チーズ味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-28100", "うまい棒コーンポタージュ", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-18387", "うまい棒 めんたい味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-19972", "うまい棒 シュガーラスク味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-21110", "うまい棒 やきとり味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-19959", "うまい棒 なっとう味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-27358", "ぱんだろ〜クッキー", null, 12, "スナック", null),
  d("inokuchi-18390", "うまい棒 とんかつソース味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-20067", "ポップコーン塩味", null, 40, "スナック", null),
  d("inokuchi-29060", "メロンぱんだろ〜クッキー", null, 12, "スナック", null),
  d("inokuchi-18391", "うまい棒 テリヤキバーガー味", null, 15, "スナック", null, "umaibo"),
  d("inokuchi-22560", "うまい棒プレミアム和風ステーキ味", null, 25, "スナック", null, "umaibo"),
  d("inokuchi-21434", "うまい棒プレミアムめんたいこ味", null, 25, "スナック", null, "umaibo"),
  d("inokuchi-21429", "うまい棒プレミアムチーズ味", null, 25, "スナック", null, "umaibo"),
  d("inokuchi-34331", "ガリボリラーメン", null, 30, "スナック", null),

  // ── チョコ (5件) ────────────────────────────
  d("inokuchi-47318", "しみチョココーン全粒粉スティック", "ギンビス", 45, "チョコ", null),
  d("inokuchi-39283", "クリスマスうまい棒チョコレート", null, 12, "チョコ", null, "umaibo"),
  d("inokuchi-18458", "プチプチうらないチョコ", "チーリン製菓", 30, "チョコ", null),
  d("inokuchi-19181", "月の小石チョコ", null, 25, "チョコ", null),
  d("inokuchi-19320", "どらチョコ", null, 50, "チョコ", null),

  // ── グミ・キャンディ (28件) ──────────────────
  d("inokuchi-49575", "サワーペーパーキャンディ ホワイトソーダ", null, 25, "グミ・キャンディ", null),
  d("inokuchi-49528", "サワーペーパーキャンディ", null, 25, "グミ・キャンディ", null),
  d("inokuchi-49526", "プレミアムガブリチュウ 焦がしキャラメル味", null, 50, "グミ・キャンディ", null),
  d("inokuchi-48881", "サンリオキャラクターズ ドーナッツグミ", null, 38, "グミ・キャンディ", null),
  d("inokuchi-45231", "キャンディーボックス", "共親製菓", 50, "グミ・キャンディ", null),
  d("inokuchi-44767", "のむのむゼリー パイン味", null, 45, "グミ・キャンディ", null),
  d("inokuchi-39932", "のむのむゼリー 各種", null, 45, "グミ・キャンディ", null),
  d("inokuchi-44592", "サワーコーラグミ", "Trolli", 20, "グミ・キャンディ", null),
  d("inokuchi-44590", "グレープソーダグミ", null, 20, "グミ・キャンディ", null),
  d("inokuchi-43853", "アンパンマン ペロペロキャンディ", "不二家", 40, "グミ・キャンディ", null),
  d("inokuchi-42585", "ガブリチュウ", null, 30, "グミ・キャンディ", null),
  d("inokuchi-42136", "すみっコぐらし つりグミ", "BANDAI", 80, "グミ・キャンディ", null),
  d("inokuchi-40722", "魚ギョッと釣りグミ", "BANDAI", 70, "グミ・キャンディ", null),
  d("inokuchi-39792", "こんにゃくゼリー", "ORIHIRO", 15, "グミ・キャンディ", null),
  d("inokuchi-39019", "ロールキャンディ", null, 60, "グミ・キャンディ", null),
  d("inokuchi-19337", "森永ハイチュウ", null, 12, "グミ・キャンディ", null),
  d("inokuchi-33775", "うずまきキャンディー", null, 100, "グミ・キャンディ", null),
  d("inokuchi-33767", "りんごあめ", null, 100, "グミ・キャンディ", null),
  d("inokuchi-21426", "ドリコ 棒きなこ飴連続当て", null, 12, "グミ・キャンディ", null),
  d("inokuchi-39984", "鈴ノ屋 棒きなこ飴 連続当て", null, 12, "グミ・キャンディ", null),
  d("inokuchi-18501", "カップ入りねり水飴", null, 80, "グミ・キャンディ", null),
  d("inokuchi-18439", "やおきん きなこ棒飴箱入", null, 30, "グミ・キャンディ", null),
  d("inokuchi-18426", "どんぐりガム", "Pine", 12, "グミ・キャンディ", null),
  d("inokuchi-18440", "あんずボー", null, 30, "グミ・キャンディ", null),
  d("inokuchi-28026", "ダイヤモンドリングキャンディ", null, 40, "グミ・キャンディ", null),
  d("inokuchi-18425", "あわ玉 飴", "Pine", 12, "グミ・キャンディ", null),
  d("inokuchi-19219", "不二家棒付き ポップキャンディ", "不二家", 11, "グミ・キャンディ", null),
  d("inokuchi-23990", "ねり水あめ大当て", null, 40, "グミ・キャンディ", null),

  // ── ラムネ・タブレット (5件) ────────────────
  d("inokuchi-49938", "ラムネもち", "SEIKA", 120, "ラムネ・タブレット", null),
  d("inokuchi-49381", "この人だ～れ？DXミンツ", null, 30, "ラムネ・タブレット", null),
  d("inokuchi-19095", "ビンラムネ（モナカ）", null, 100, "ラムネ・タブレット", null),
  d("inokuchi-19969", "クッピーラムネ", "カクダイ製菓", 30, "ラムネ・タブレット", null),
  d("inokuchi-18423", "あべっ子ラムネアソート", null, 15, "ラムネ・タブレット", null),

  // ── せんべい・おつまみ (21件) ────────────────
  d("inokuchi-49386", "おやつカルパス 旨辛味", "ヤガイ", 15, "せんべい・おつまみ", null),
  d("inokuchi-47227", "ペヤングソース焼きそばカツ", null, 12, "せんべい・おつまみ", null),
  d("inokuchi-19342", "カットよっちゃんいか", "よっちゃん", 50, "せんべい・おつまみ", null),
  d("inokuchi-18847", "おやつカルパス", "ヤガイ", 15, "せんべい・おつまみ", null),
  d("inokuchi-42865", "うまい棒 スパイシービーフカレー味", null, 15, "せんべい・おつまみ", null, "umaibo"),
  d("inokuchi-18430", "玉葱さん太郎", null, 30, "せんべい・おつまみ", null),
  d("inokuchi-18405", "ラーメン屋さん太郎", null, 20, "せんべい・おつまみ", null),
  d("inokuchi-18406", "やきそば屋さん太郎", null, 20, "せんべい・おつまみ", null),
  d("inokuchi-18432", "どんどん焼あられ", null, 30, "せんべい・おつまみ", null),
  d("inokuchi-34423", "梅ジャム タカミ製菓", null, 20, "せんべい・おつまみ", null),
  d("inokuchi-18463", "ビッグカツとんかつソース味", null, 40, "せんべい・おつまみ", null),
  d("inokuchi-18409", "蒲焼さん太郎", null, 15, "せんべい・おつまみ", null),
  d("inokuchi-18410", "焼肉さん太郎", null, 15, "せんべい・おつまみ", null),
  d("inokuchi-18412", "のし梅さん太郎", null, 15, "せんべい・おつまみ", null),
  d("inokuchi-18411", "酢だこさん太郎", null, 15, "せんべい・おつまみ", null),
  d("inokuchi-18394", "うまい棒 たこ焼味", null, 15, "せんべい・おつまみ", null, "umaibo"),
  d("inokuchi-19142", "中村製菓 なつかしカレー味せんべい", null, 40, "せんべい・おつまみ", null),
  d("inokuchi-18479", "ソースせんべい佐藤製菓", null, 50, "せんべい・おつまみ", null),
  d("inokuchi-18435", "甘いか太郎 キムチ味", null, 30, "せんべい・おつまみ", null),
  d("inokuchi-18473", "中村製菓 チーズあられ", null, 40, "せんべい・おつまみ", null),
  d("inokuchi-18437", "ミルクせんべい佐藤製菓", null, 35, "せんべい・おつまみ", null),

  // ── 飲料 (4件) ──────────────────────────────
  d("inokuchi-49773", "コーラスプラッシュ", null, 100, "飲料", null),
  d("inokuchi-46303", "ポット入りフラワーヨーグル", null, 40, "飲料", null),
  d("inokuchi-18842", "オリオン ミニ コーラ", "オリオン", 30, "飲料", null, "orion-mini"),
  d("inokuchi-19644", "フルーツパウダージュース(松山製菓)", null, 22, "飲料", null),

  // ── くじ・当たり付き (6件) ──────────────────
  d("inokuchi-45501", "推しの子フーセンガム 当り付", null, 12, "くじ・当たり付き", null),
  d("inokuchi-19295", "ポケモンガム(当り付き）", null, 12, "くじ・当たり付き", null),
  d("inokuchi-18451", "マルカワ マーブルガム当たり付", "マルカワ", 20, "くじ・当たり付き", null),
  d("inokuchi-19332", "コーラガム(当り付き）", null, 12, "くじ・当たり付き", null),
  d("inokuchi-18418", "フィリックスガム当たり付", "マルカワ", 12, "くじ・当たり付き", null),
  d("inokuchi-18916", "ヤッターめん 金券くじ当て", null, 15, "くじ・当たり付き", null),

  // ── その他 (40件) ────────────────────────────
  d("inokuchi-49941", "ちゅるりんジェリー", null, 50, "その他", null),
  d("inokuchi-49936", "ぶどうのもっちゃん", null, 120, "その他", null),
  d("inokuchi-48874", "マンテンデビュー", "オリオン", 30, "その他", null),
  d("inokuchi-48013", "プリッツ うまサラダ", "グリコ", 100, "その他", null),
  d("inokuchi-48012", "プリッツ", null, 80, "その他", null),
  d("inokuchi-48009", "コアラのマーチ ミニパック", "ロッテ", 60, "その他", null),
  d("inokuchi-47599", "アニマルヨーチ", null, 15, "その他", null),
  d("inokuchi-47443", "チューキャン", "明治", 40, "その他", null),
  d("inokuchi-47221", "ポテコロン", null, 22, "その他", null),
  d("inokuchi-46195", "ポリッキー", null, 25, "その他", null),
  d("inokuchi-32859", "タラタラしてんじゃねーよ", "よっちゃん", 50, "その他", null),
  d("inokuchi-46024", "セブンスティック", null, 35, "その他", null),
  d("inokuchi-44770", "どうぶつマシュマロ", null, 120, "その他", null),
  d("inokuchi-44675", "うどん屋しんちゃん", "東京拉麺", 90, "その他", null),
  d("inokuchi-44113", "やおきん にんじん", null, 40, "その他", null),
  d("inokuchi-43153", "にこにこにっこり わたがし 佐藤製菓", null, 70, "その他", null),
  d("inokuchi-42079", "花コンペイ糖", "マルタ", 10, "その他", null),
  d("inokuchi-38662", "ロングチュー", null, 30, "その他", null),
  d("inokuchi-19299", "味カレー大和製菓", null, 30, "その他", null),
  d("inokuchi-18504", "ペペロンチーノ", null, 90, "その他", null),
  d("inokuchi-36988", "ソフトマドロス", null, 50, "その他", null),
  d("inokuchi-34367", "焼たら", null, 15, "その他", null),
  d("inokuchi-19229", "DXお菓子大当て台紙付き(数字合わせ)", null, 100, "その他", null),
  d("inokuchi-19591", "お菓子大当て台紙付き(数字合せ)", null, 50, "その他", null),
  d("inokuchi-19433", "ブタメン", null, 98, "その他", null),
  d("inokuchi-32110", "4個入りトンガリ菓子", null, 50, "その他", null),
  d("inokuchi-23160", "ふがし（角）", null, 30, "その他", null),
  d("inokuchi-19966", "ぷくぷくたい", "meito", 80, "その他", null),
  d("inokuchi-18841", "オリオン ミニ サワー", "オリオン", 30, "その他", null, "orion-mini"),
  d("inokuchi-19304", "不二家ミルキー", null, 70, "その他", null),
  d("inokuchi-18480", "ココアシガレット", "オリオン", 40, "その他", null),
  d("inokuchi-19270", "オリオンシガレット各種", null, 40, "その他", null),
  d("inokuchi-29685", "パチパチパニック", null, 40, "その他", null),
  d("inokuchi-19143", "フルーツの森", null, 40, "その他", null),
  d("inokuchi-18498", "さくら大根", null, 75, "その他", null),
  d("inokuchi-18436", "みつあんず", null, 30, "その他", null),
  d("inokuchi-18500", "うぐいすあんず", null, 85, "その他", null),
  d("inokuchi-19599", "チーズおやつ", null, 12, "その他", null),
  d("inokuchi-18443", "こざくら餅", null, 25, "その他", null),
  d("inokuchi-18482", "たかみにんじん", null, 40, "その他", null),
];
