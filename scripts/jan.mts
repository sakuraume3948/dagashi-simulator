/**
 * JANコードの正規化と検証。
 *
 * fetch-yahoo と fetch-rakuten の両方が使う。同じ判定を2箇所に書くと
 * 必ず片方だけ直されてずれるため、共有している。
 *
 * ★なぜ正規化が要るのか
 *   Yahoo! は JAN-8 を13桁にゼロ詰めして返すことがある。
 *     Yahoo!  "0000049480856"   ← JAN-8「49480856」のゼロ詰め
 *     楽天    "49480856"
 *   素で突き合わせると別物に見えるため、同じ商品を「不一致」として
 *   捨ててしまう。表記を揃えてから比較する必要がある。
 *
 * ★ただし先頭ゼロを無条件に剥がしてはいけない
 *   先頭の 0 が有意な13桁コードが実在する。
 *     "0096619816927" → 剥がすと11桁になり、JANとして壊れる
 *     "0106086000405" → 剥がすと12桁になり、JANとして壊れる
 *   剥がしてよいのはゼロ詰めJAN-8だけで、その判別は検査数字が
 *   機械的にやってくれる。人間が場合分けする必要はない。
 */

/**
 * JAN/EAN の検査数字（モジュラス10）を検証する。
 *
 * 右から数えて偶数桁に3、奇数桁に1を掛けて合計し、
 * 10の補数が末尾1桁と一致すれば正しい。8桁と13桁の両方に同じ式が使える。
 */
export function hasValidCheckDigit(digits: string): boolean {
  if (digits.length !== 8 && digits.length !== 13) return false;

  const d = [...digits].map(Number);
  const body = d.slice(0, -1);

  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const fromRight = body.length - i; // 1 が検査数字の隣
    sum += body[i] * (fromRight % 2 === 1 ? 3 : 1);
  }

  return (10 - (sum % 10)) % 10 === d[d.length - 1];
}

/**
 * 生の値を、検査数字が通る正規形のJANに揃える。通らなければ undefined。
 *
 * 8桁と13桁が正規形。12桁のUPC-Aは先頭に0を足して13桁のEAN-13にする。
 * ゼロ詰めJAN-8は8桁に戻す（楽天が8桁で返すため、そちらに揃える）。
 */
export function normalizeJan(raw: string | number | undefined | null): string | undefined {
  if (raw === undefined || raw === null) return undefined;

  const s = String(raw).replace(/[^0-9]/g, "");
  if (s.length === 0) return undefined;
  // 全ゼロは検査数字を通ってしまうプレースホルダなので明示的に落とす
  if (/^0+$/.test(s)) return undefined;

  // 短い正規形を優先する（ゼロ詰めJAN-8 は8桁に戻す）
  const candidates: string[] = [];
  if (s.length === 13) {
    const unpadded = s.replace(/^0+/, "");
    if (unpadded.length === 8) candidates.push(unpadded);
    candidates.push(s);
  } else if (s.length === 12) {
    candidates.push(`0${s}`); // UPC-A → EAN-13
  } else if (s.length === 8) {
    candidates.push(s);
  }

  return candidates.find(hasValidCheckDigit);
}

/**
 * 日本国内の事業者に割り当てられたJANかどうか。
 *
 * GS1 の国コードは先頭2桁で、日本は 45 と 49。
 * 井ノ口商店が扱うのは国内の駄菓子なので、これ以外は検索が
 * 別商品に流れた証拠として扱う。実測で弾けたもの:
 *   8938517587047 (893 ベトナム)  ← ココナッツクッキーの誤マッチ
 *   8437000482093 (843 スペイン)
 *   9011019600014 (901 オーストリア)
 *   9784098637393 (978 書籍のISBN)
 */
export function isJapaneseJan(jan: string): boolean {
  return /^4[59]/.test(jan);
}

/** 正規化と国コードの両方を通ったものだけを返す。 */
export function acceptableJan(raw: string | number | undefined | null): string | undefined {
  const jan = normalizeJan(raw);
  return jan !== undefined && isJapaneseJan(jan) ? jan : undefined;
}
