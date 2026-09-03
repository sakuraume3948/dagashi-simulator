import type { Category, Dagashi, DataSource } from "./types";

/**
 * 駄菓子マスタ。
 *
 * ★このファイルは scripts/build-data.mts が生成しています。直接編集しないでください。
 *   編集しても次回の `npm run build:data` で失われます。
 *
 *   商品を足す/直す場合:
 *     - 自動取得の結果   → data/sources/*.json
 *     - 手で決めた値     → data/overrides.json
 *
 * 情報源:
 *   - 井ノ口商店（希望小売価格）（153件 / 取得日: 2026-09-01）
 *   - Yahoo!ショッピング商品検索API（メーカー名・JANコードの補完）（153件 / 取得日: 2026-09-03）
 *   - 楽天プロダクト製品検索API（メーカー名・JANコードの補完）（153件 / 取得日: 2026-09-03）
 *
 * 価格帯の分布: 30〜50円: 67件 / 101円〜: 3件 / 60〜100円: 22件 / 10〜20円: 51件
 * （ガチャの重みは 1/price^2 なので、価格帯が偏ると「高いものが出にくい」が成立しない）
 */

/**
 * 価格の取得元。全商品で同じなので定数にしてある。
 * 価格を持つ情報源が増えたら、違う値の商品だけが d() の第8引数で上書きする。
 */
const SOURCE: DataSource = "inokuchi";
const FETCHED_AT = "2026-09-01T20:50:00.153Z";

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
  // ── スナック (34件) ──────────────────────────
  d("inokuchi-49742", "ココナッツクッキー", "リアライズプラニング", 12, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/49742.html" }),
  d("inokuchi-47544", "プチドーナッツビスケット", "リアライズプラニング", 13, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/47544.html" }),
  d("inokuchi-47224", "ミルメーク ムギスナック", "リアライズプラニング", 10, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/47224.html" }),
  d("inokuchi-46451", "うま辛パンチみそラーメン", "やおきん", 100, "スナック", null, null, { jan: "4903013090494", url: "https://www.inokuchi.net/item/dagashi/46451.html" }),
  d("inokuchi-45410", "中村製菓 ポテトフライ", "中村製菓", 40, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/45410.html" }),
  d("inokuchi-18401", "餅太郎・塩", "菓道", 15, "スナック", null, null, { jan: "49870312", url: "https://www.inokuchi.net/item/dagashi/18401.html" }),
  d("inokuchi-19550", "うまい棒 牛タン塩味", "やおきん", 15, "スナック", null, "umaibo", { jan: "45132872", url: "https://www.inokuchi.net/item/dagashi/19550.html" }),
  d("inokuchi-35219", "うまい棒 のり塩味", "やおきん", 15, "スナック", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashi/35219.html" }),
  d("inokuchi-44678", "カステラドーナツ太郎", "菓道", 30, "スナック", null, null, { jan: "4971749111141", url: "https://www.inokuchi.net/item/dagashi/44678.html" }),
  d("inokuchi-43273", "ハニーバター太郎", "菓道", 30, "スナック", null, null, { jan: "4971749112063", url: "https://www.inokuchi.net/item/dagashi/43273.html" }),
  d("inokuchi-18429", "もろこし輪太郎", "菓道", 30, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18429.html" }),
  d("inokuchi-18428", "キャベツ太郎", "やおきん", 30, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/18428.html" }),
  d("inokuchi-18431", "アメリカンフライドポテト", "東豊製菓", 30, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18431.html" }),
  d("inokuchi-24317", "東豊ポテトフライ チキン味", "東豊製菓", 40, "スナック", null, "toho-potato-fry", { jan: "4901984088267", url: "https://www.inokuchi.net/item/dagashi/24317.html" }),
  d("inokuchi-36594", "東豊ポテトフライ カルビ焼きの味", "東豊製菓", 40, "スナック", null, "toho-potato-fry", { url: "https://www.inokuchi.net/item/dagashi/36594.html" }),
  d("inokuchi-36591", "東豊ポテトフライ じゃが塩バター味", "東豊製菓", 40, "スナック", null, "toho-potato-fry", { jan: "4901984088281", url: "https://www.inokuchi.net/item/dagashi/36591.html" }),
  d("inokuchi-18483", "ヤングドーナツ", "宮田製菓", 58, "スナック", null, null, { jan: "4977821321491", url: "https://www.inokuchi.net/item/dagashibyprice/18483.html" }),
  d("inokuchi-19268", "ど〜ん太郎 うどん", "菓道", 20, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/19268.html" }),
  d("inokuchi-19272", "わさびのり太郎", "菓道", 15, "スナック", null, null, { jan: "4971749110984", url: "https://www.inokuchi.net/item/dagashi/19272.html" }),
  d("inokuchi-18388", "うまい棒 チーズ味", "やおきん", 15, "スナック", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashi/18388.html" }),
  d("inokuchi-28100", "うまい棒コーンポタージュ", "やおきん", 15, "スナック", null, "umaibo", { jan: "49415780", url: "https://www.inokuchi.net/item/dagashi/28100.html" }),
  d("inokuchi-18387", "うまい棒 めんたい味", "やおきん", 15, "スナック", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashi/18387.html" }),
  d("inokuchi-19972", "うまい棒 シュガーラスク味", "やおきん", 15, "スナック", null, "umaibo", { jan: "49415735", url: "https://www.inokuchi.net/item/dagashi/19972.html" }),
  d("inokuchi-21110", "うまい棒 やきとり味", "やおきん", 15, "スナック", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashi/21110.html" }),
  d("inokuchi-19959", "うまい棒 なっとう味", "やおきん", 15, "スナック", null, "umaibo", { jan: "49480771", url: "https://www.inokuchi.net/item/dagashi/19959.html" }),
  d("inokuchi-27358", "ぱんだろ〜クッキー", "やおきん", 12, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashi/27358.html" }),
  d("inokuchi-18390", "うまい棒 とんかつソース味", "やおきん", 15, "スナック", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashi/18390.html" }),
  d("inokuchi-20067", "ポップコーン塩味", null, 40, "スナック", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/20067.html" }),
  d("inokuchi-29060", "メロンぱんだろ〜クッキー", "やおきん", 12, "スナック", null, null, { jan: "4903013431679", url: "https://www.inokuchi.net/item/dagashi/29060.html" }),
  d("inokuchi-18391", "うまい棒 テリヤキバーガー味", "やおきん", 15, "スナック", null, "umaibo", { jan: "49480849", url: "https://www.inokuchi.net/item/dagashi/18391.html" }),
  d("inokuchi-22560", "うまい棒プレミアム和風ステーキ味", "やおきん", 25, "スナック", null, "umaibo", { jan: "4903013276072", url: "https://www.inokuchi.net/item/dagashi/22560.html" }),
  d("inokuchi-21434", "うまい棒プレミアムめんたいこ味", "やおきん", 25, "スナック", null, "umaibo", { jan: "4903013276058", url: "https://www.inokuchi.net/item/dagashi/21434.html" }),
  d("inokuchi-21429", "うまい棒プレミアムチーズ味", "やおきん", 25, "スナック", null, "umaibo", { jan: "4903013276027", url: "https://www.inokuchi.net/item/dagashi/21429.html" }),
  d("inokuchi-34331", "ガリボリラーメン", "やおきん", 30, "スナック", null, null, { jan: "4903013090531", url: "https://www.inokuchi.net/item/dagashi/34331.html" }),

  // ── チョコ (5件) ────────────────────────────
  d("inokuchi-47318", "しみチョココーン全粒粉スティック", "ギンビス", 45, "チョコ", null, null, { jan: "4901588617511", url: "https://www.inokuchi.net/item/dagashi/47318.html" }),
  d("inokuchi-39283", "クリスマスうまい棒チョコレート", "やおきん", 12, "チョコ", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashibyprice/39283.html" }),
  d("inokuchi-18458", "プチプチうらないチョコ", "チーリン製菓", 30, "チョコ", null, null, { jan: "45024405", url: "https://www.inokuchi.net/item/dagashibyprice/18458.html" }),
  d("inokuchi-19181", "月の小石チョコ", "タクマ食品", 25, "チョコ", null, null, { jan: "4962679104808", url: "https://www.inokuchi.net/item/dagashi/19181.html" }),
  d("inokuchi-19320", "どらチョコ", "やおきん", 50, "チョコ", null, null, { jan: "4903013549503", url: "https://www.inokuchi.net/item/dagashibyprice/19320.html" }),

  // ── グミ・キャンディ (28件) ──────────────────
  d("inokuchi-49575", "サワーペーパーキャンディ ホワイトソーダ", "やおきん", 25, "グミ・キャンディ", null, null, { jan: "4903013357207", url: "https://www.inokuchi.net/item/dagashi/49575.html" }),
  d("inokuchi-49528", "サワーペーパーキャンディ", "やおきん", 25, "グミ・キャンディ", null, null, { jan: "4903013357276", url: "https://www.inokuchi.net/item/dagashi/49528.html" }),
  d("inokuchi-49526", "プレミアムガブリチュウ 焦がしキャラメル味", "明治チューインガム", 50, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/49526.html" }),
  d("inokuchi-48881", "サンリオキャラクターズ ドーナッツグミ", null, 38, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/48881.html" }),
  d("inokuchi-45231", "キャンディーボックス", null, 50, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/45231.html" }),
  d("inokuchi-44767", "のむのむゼリー パイン味", "タクマ食品", 45, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/44767.html" }),
  d("inokuchi-39932", "のむのむゼリー 各種", "タクマ食品", 45, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/39932.html" }),
  d("inokuchi-44592", "サワーコーラグミ", null, 20, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/44592.html" }),
  d("inokuchi-44590", "グレープソーダグミ", "やおきん", 20, "グミ・キャンディ", null, null, { jan: "4903013247317", url: "https://www.inokuchi.net/item/dagashi/44590.html" }),
  d("inokuchi-43853", "アンパンマン ペロペロキャンディ", "不二家", 40, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/43853.html" }),
  d("inokuchi-42585", "ガブリチュウ", "明治チューインガム", 30, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/42585.html" }),
  d("inokuchi-42136", "すみっコぐらし つりグミ", "バンダイ", 80, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/42136.html" }),
  d("inokuchi-40722", "魚ギョッと釣りグミ", "バンダイ", 70, "グミ・キャンディ", null, null, { jan: "4549660424024", url: "https://www.inokuchi.net/item/dagashi/40722.html" }),
  d("inokuchi-39792", "こんにゃくゼリー", "オリヒロ", 15, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/39792.html" }),
  d("inokuchi-39019", "ロールキャンディ", "やおきん", 60, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/39019.html" }),
  d("inokuchi-19337", "森永ハイチュウ", "森永製菓", 12, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/19337.html" }),
  d("inokuchi-33775", "うずまきキャンディー", "大丸本舗", 100, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/33775.html" }),
  d("inokuchi-33767", "りんごあめ", null, 100, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/33767.html" }),
  d("inokuchi-21426", "ドリコ 棒きなこ飴連続当て", "西島製菓", 12, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/21426.html" }),
  d("inokuchi-39984", "鈴ノ屋 棒きなこ飴 連続当て", "鈴ノ屋", 12, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/39984.html" }),
  d("inokuchi-18501", "カップ入りねり水飴", "やおきん", 80, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18501.html" }),
  d("inokuchi-18439", "やおきん きなこ棒飴箱入", "やおきん", 30, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18439.html" }),
  d("inokuchi-18426", "どんぐりガム", "パイン", 12, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/18426.html" }),
  d("inokuchi-18440", "あんずボー", "港常", 30, "グミ・キャンディ", null, null, { jan: "4902762771739", url: "https://www.inokuchi.net/item/dagashi/18440.html" }),
  d("inokuchi-28026", "ダイヤモンドリングキャンディ", "やおきん", 40, "グミ・キャンディ", null, null, { jan: "4903013241247", url: "https://www.inokuchi.net/item/dagashi/28026.html" }),
  d("inokuchi-18425", "あわ玉 飴", null, 12, "グミ・キャンディ", null, null, { jan: "49707243", url: "https://www.inokuchi.net/item/dagashi/18425.html" }),
  d("inokuchi-19219", "不二家棒付き ポップキャンディ", "不二家", 11, "グミ・キャンディ", null, null, { jan: "4902555126142", url: "https://www.inokuchi.net/item/dagashi/19219.html" }),
  d("inokuchi-23990", "ねり水あめ大当て", null, 40, "グミ・キャンディ", null, null, { url: "https://www.inokuchi.net/item/dagashi/23990.html" }),

  // ── ラムネ・タブレット (5件) ────────────────
  d("inokuchi-49938", "ラムネもち", "セイカ食品", 120, "ラムネ・タブレット", null, null, { jan: "4973260301094", url: "https://www.inokuchi.net/item/dagashi/49938.html" }),
  d("inokuchi-49381", "この人だ～れ？DXミンツ", "ジャック製菓", 30, "ラムネ・タブレット", null, null, { url: "https://www.inokuchi.net/item/dagashi/49381.html" }),
  d("inokuchi-19095", "ビンラムネ（モナカ）", "岡田商店", 100, "ラムネ・タブレット", null, null, { url: "https://www.inokuchi.net/item/dagashi/19095.html" }),
  d("inokuchi-19969", "クッピーラムネ", "カクダイ製菓", 30, "ラムネ・タブレット", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/19969.html" }),
  d("inokuchi-18423", "あべっ子ラムネアソート", "安部製菓", 15, "ラムネ・タブレット", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18423.html" }),

  // ── せんべい・おつまみ (21件) ────────────────
  d("inokuchi-49386", "おやつカルパス 旨辛味", "ヤガイ", 15, "せんべい・おつまみ", null, null, { jan: "4903020005870", url: "https://www.inokuchi.net/item/dagashi/49386.html" }),
  d("inokuchi-47227", "ペヤングソース焼きそばカツ", "リアライズプラニング", 12, "せんべい・おつまみ", null, null, { jan: "4589704432264", url: "https://www.inokuchi.net/item/dagashi/47227.html" }),
  d("inokuchi-19342", "カットよっちゃんいか", "よっちゃん食品工業", 50, "せんべい・おつまみ", null, null, { jan: "4903041018132", url: "https://www.inokuchi.net/item/dagashi/19342.html" }),
  d("inokuchi-18847", "おやつカルパス", "ヤガイ", 15, "せんべい・おつまみ", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18847.html" }),
  d("inokuchi-42865", "うまい棒 スパイシービーフカレー味", "やおきん", 15, "せんべい・おつまみ", null, "umaibo", { url: "https://www.inokuchi.net/item/dagashi/42865.html" }),
  d("inokuchi-18430", "玉葱さん太郎", "菓道", 30, "せんべい・おつまみ", null, null, { jan: "4971749110298", url: "https://www.inokuchi.net/item/dagashibyprice/18430.html" }),
  d("inokuchi-18405", "ラーメン屋さん太郎", "菓道", 20, "せんべい・おつまみ", null, null, { jan: "4971749110410", url: "https://www.inokuchi.net/item/dagashi/18405.html" }),
  d("inokuchi-18406", "やきそば屋さん太郎", "菓道", 20, "せんべい・おつまみ", null, null, { jan: "4971749110403", url: "https://www.inokuchi.net/item/dagashi/18406.html" }),
  d("inokuchi-18432", "どんどん焼あられ", "菓道", 30, "せんべい・おつまみ", null, null, { jan: "4971749110373", url: "https://www.inokuchi.net/item/dagashi/18432.html" }),
  d("inokuchi-34423", "梅ジャム タカミ製菓", "タカミ製菓", 20, "せんべい・おつまみ", null, null, { jan: "4979446010514", url: "https://www.inokuchi.net/item/dagashi/34423.html" }),
  d("inokuchi-18463", "ビッグカツとんかつソース味", "菓道", 40, "せんべい・おつまみ", null, null, { jan: "4971749110526", url: "https://www.inokuchi.net/item/dagashibyprice/18463.html" }),
  d("inokuchi-18409", "蒲焼さん太郎", "菓道", 15, "せんべい・おつまみ", null, null, { jan: "4971749110335", url: "https://www.inokuchi.net/item/dagashi/18409.html" }),
  d("inokuchi-18410", "焼肉さん太郎", "菓道", 15, "せんべい・おつまみ", null, null, { jan: "4971749110342", url: "https://www.inokuchi.net/item/dagashi/18410.html" }),
  d("inokuchi-18412", "のし梅さん太郎", "菓道", 15, "せんべい・おつまみ", null, null, { jan: "4971749110618", url: "https://www.inokuchi.net/item/dagashi/18412.html" }),
  d("inokuchi-18411", "酢だこさん太郎", "菓道", 15, "せんべい・おつまみ", null, null, { jan: "4971749110328", url: "https://www.inokuchi.net/item/dagashi/18411.html" }),
  d("inokuchi-18394", "うまい棒 たこ焼味", "やおきん", 15, "せんべい・おつまみ", null, "umaibo", { jan: "49480795", url: "https://www.inokuchi.net/item/dagashi/18394.html" }),
  d("inokuchi-19142", "中村製菓 なつかしカレー味せんべい", "中村製菓", 40, "せんべい・おつまみ", null, null, { url: "https://www.inokuchi.net/item/dagashi/19142.html" }),
  d("inokuchi-18479", "ソースせんべい佐藤製菓", "佐藤製菓", 50, "せんべい・おつまみ", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18479.html" }),
  d("inokuchi-18435", "甘いか太郎 キムチ味", "菓道", 30, "せんべい・おつまみ", null, null, { jan: "4971749110465", url: "https://www.inokuchi.net/item/dagashibyprice/18435.html" }),
  d("inokuchi-18473", "中村製菓 チーズあられ", "中村製菓", 40, "せんべい・おつまみ", null, null, { jan: "4904052011389", url: "https://www.inokuchi.net/item/dagashibyprice/18473.html" }),
  d("inokuchi-18437", "ミルクせんべい佐藤製菓", "佐藤製菓", 35, "せんべい・おつまみ", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18437.html" }),

  // ── 飲料 (4件) ──────────────────────────────
  d("inokuchi-49773", "コーラスプラッシュ", "やおきん", 100, "飲料", null, null, { jan: "4903013799823", url: "https://www.inokuchi.net/item/dagashi/49773.html" }),
  d("inokuchi-46303", "ポット入りフラワーヨーグル", "やおきん", 40, "飲料", null, null, { url: "https://www.inokuchi.net/item/dagashi/46303.html" }),
  d("inokuchi-18842", "オリオン ミニ コーラ", "オリオン", 30, "飲料", null, "orion-mini", { url: "https://www.inokuchi.net/item/dagashibyprice/18842.html" }),
  d("inokuchi-19644", "フルーツパウダージュース(松山製菓)", "松山製菓", 22, "飲料", null, null, { url: "https://www.inokuchi.net/item/dagashi/19644.html" }),

  // ── くじ・当たり付き (6件) ──────────────────
  d("inokuchi-45501", "推しの子フーセンガム 当り付", "丸川製菓", 12, "くじ・当たり付き", null, null, { url: "https://www.inokuchi.net/item/dagashi/45501.html" }),
  d("inokuchi-19295", "ポケモンガム(当り付き）", "コリス", 12, "くじ・当たり付き", null, null, { url: "https://www.inokuchi.net/item/dagashi/19295.html" }),
  d("inokuchi-18451", "マルカワ マーブルガム当たり付", "丸川製菓", 20, "くじ・当たり付き", null, null, { url: "https://www.inokuchi.net/item/dagashi/18451.html" }),
  d("inokuchi-19332", "コーラガム(当り付き）", "丸川製菓", 12, "くじ・当たり付き", null, null, { url: "https://www.inokuchi.net/item/dagashi/19332.html" }),
  d("inokuchi-18418", "フィリックスガム当たり付", "丸川製菓", 12, "くじ・当たり付き", null, null, { jan: "49459319", url: "https://www.inokuchi.net/item/dagashi/18418.html" }),
  d("inokuchi-18916", "ヤッターめん 金券くじ当て", "ジャック製菓", 15, "くじ・当たり付き", null, null, { url: "https://www.inokuchi.net/item/dagashi/18916.html" }),

  // ── その他 (40件) ────────────────────────────
  d("inokuchi-49941", "ちゅるりんジェリー", null, 50, "その他", null, null, { jan: "4550433081924", url: "https://www.inokuchi.net/item/dagashi/49941.html" }),
  d("inokuchi-49936", "ぶどうのもっちゃん", "セイカ食品", 120, "その他", null, null, { jan: "4973260301032", url: "https://www.inokuchi.net/item/dagashi/49936.html" }),
  d("inokuchi-48874", "マンテンデビュー", "オリオン", 30, "その他", null, null, { jan: "49598605", url: "https://www.inokuchi.net/item/dagashi/48874.html" }),
  d("inokuchi-48013", "プリッツ うまサラダ", "江崎グリコ", 100, "その他", null, null, { jan: "4901005521308", url: "https://www.inokuchi.net/item/dagashi/48013.html" }),
  d("inokuchi-48012", "プリッツ", "江崎グリコ", 80, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/48012.html" }),
  d("inokuchi-48009", "コアラのマーチ ミニパック", "ロッテ", 60, "その他", null, null, { jan: "4903333129034", url: "https://www.inokuchi.net/item/dagashi/48009.html" }),
  d("inokuchi-47599", "アニマルヨーチ", "リアライズプラニング", 15, "その他", null, null, { jan: "4582218057558", url: "https://www.inokuchi.net/item/dagashi/47599.html" }),
  d("inokuchi-47443", "チューキャン", "明治チューインガム", 40, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/47443.html" }),
  d("inokuchi-47221", "ポテコロン", "リアライズプラニング", 22, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/47221.html" }),
  d("inokuchi-46195", "ポリッキー", "やおきん", 25, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/46195.html" }),
  d("inokuchi-32859", "タラタラしてんじゃねーよ", "よっちゃん食品工業", 50, "その他", null, null, { jan: "4903041201206", url: "https://www.inokuchi.net/item/dagashi/32859.html" }),
  d("inokuchi-46024", "セブンスティック", "やおきん", 35, "その他", null, null, { jan: "4903013431525", url: "https://www.inokuchi.net/item/dagashibyprice/46024.html" }),
  d("inokuchi-44770", "どうぶつマシュマロ", "やおきん", 120, "その他", null, null, { jan: "4903013799946", url: "https://www.inokuchi.net/item/dagashi/44770.html" }),
  d("inokuchi-44675", "うどん屋しんちゃん", "新栄食品", 90, "その他", null, null, { jan: "4906871022249", url: "https://www.inokuchi.net/item/dagashi/44675.html" }),
  d("inokuchi-44113", "やおきん にんじん", "やおきん", 40, "その他", null, null, { jan: "4903013060091", url: "https://www.inokuchi.net/item/dagashibyprice/44113.html" }),
  d("inokuchi-43153", "にこにこにっこり わたがし 佐藤製菓", "佐藤製菓", 70, "その他", null, null, { jan: "4906763153600", url: "https://www.inokuchi.net/item/dagashi/43153.html" }),
  d("inokuchi-42079", "花コンペイ糖", "マルタ食品", 10, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/42079.html" }),
  d("inokuchi-38662", "ロングチュー", "やおきん", 30, "その他", null, null, { jan: "4903013431730", url: "https://www.inokuchi.net/item/dagashi/38662.html" }),
  d("inokuchi-19299", "味カレー大和製菓", "大和製菓", 30, "その他", null, null, { jan: "4903047950740", url: "https://www.inokuchi.net/item/dagashi/19299.html" }),
  d("inokuchi-18504", "ペペロンチーノ", "東京拉麺", 90, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/18504.html" }),
  d("inokuchi-36988", "ソフトマドロス", null, 50, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/36988.html" }),
  d("inokuchi-34367", "焼たら", null, 15, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/34367.html" }),
  d("inokuchi-19229", "DXお菓子大当て台紙付き(数字合わせ)", null, 100, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/19229.html" }),
  d("inokuchi-19591", "お菓子大当て台紙付き(数字合せ)", null, 50, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/19591.html" }),
  d("inokuchi-19433", "ブタメン", "おやつカンパニー", 98, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/19433.html" }),
  d("inokuchi-32110", "4個入りトンガリ菓子", "坂製菓", 50, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/32110.html" }),
  d("inokuchi-23160", "ふがし（角）", "やおきん", 30, "その他", null, null, { jan: "4903013016074", url: "https://www.inokuchi.net/item/dagashi/23160.html" }),
  d("inokuchi-19966", "ぷくぷくたい", "meito", 80, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/19966.html" }),
  d("inokuchi-18841", "オリオン ミニ サワー", "オリオン", 30, "その他", null, "orion-mini", { jan: "49598742", url: "https://www.inokuchi.net/item/dagashibyprice/18841.html" }),
  d("inokuchi-19304", "不二家ミルキー", "不二家", 70, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/19304.html" }),
  d("inokuchi-18480", "ココアシガレット", "オリオン", 40, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/18480.html" }),
  d("inokuchi-19270", "オリオンシガレット各種", "オリオン", 40, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/19270.html" }),
  d("inokuchi-29685", "パチパチパニック", "アトリオン製菓", 40, "その他", null, null, { jan: "4902797237095", url: "https://www.inokuchi.net/item/dagashi/29685.html" }),
  d("inokuchi-19143", "フルーツの森", "共親製菓", 40, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/19143.html" }),
  d("inokuchi-18498", "さくら大根", "遠藤食品", 75, "その他", null, null, { jan: "4970450115578", url: "https://www.inokuchi.net/item/dagashi/18498.html" }),
  d("inokuchi-18436", "みつあんず", "港常", 30, "その他", null, null, { jan: "4902762721833", url: "https://www.inokuchi.net/item/dagashibyprice/18436.html" }),
  d("inokuchi-18500", "うぐいすあんず", "港常", 85, "その他", null, null, { jan: "4902762850137", url: "https://www.inokuchi.net/item/dagashi/18500.html" }),
  d("inokuchi-19599", "チーズおやつ", "扇屋食品", 12, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashi/19599.html" }),
  d("inokuchi-18443", "こざくら餅", "明光製菓", 25, "その他", null, null, { jan: "4980937000310", url: "https://www.inokuchi.net/item/dagashibyprice/18443.html" }),
  d("inokuchi-18482", "たかみにんじん", null, 40, "その他", null, null, { url: "https://www.inokuchi.net/item/dagashibyprice/18482.html" }),
];
