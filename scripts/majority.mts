/**
 * 検索結果の多数決。fetch-yahoo と fetch-rakuten の両方が使う。
 *
 * 同じ実装を2箇所に置くと必ず片方だけ直されてずれるため、共有している
 * （scripts/jan.mts と同じ理由）。
 */

/**
 * 最頻値と、それが何件で支持されたかを返す。
 *
 * 空文字・空白だけ・undefined は数えない。有効な値が1つも無ければ value は null。
 *
 * ★`total` は「有効だった件数」ではなく「渡された件数」。
 *   一致率を「10件中3件」の形で見たいので、分母は検索結果の件数のままにしてある。
 *
 * ★同数のときは先に現れた値が勝つ（Array.prototype.sort が安定ソートのため）。
 *   検索結果は関連度順なので、同点なら上位のものを採ることになる。
 *
 * ★表記ゆれの吸収は呼び出し側の責任。
 *   「オリオン（お菓子）」と「オリオン」を別々に数えると票が割れるので、
 *   正規化してからこの関数に渡すこと。
 */
export function majority(values: (string | undefined)[]): {
  value: string | null;
  agreed: number;
  total: number;
} {
  const valid = values.filter((v): v is string => Boolean(v && v.trim()));
  if (valid.length === 0) return { value: null, agreed: 0, total: values.length };

  const counts = new Map<string, number>();
  for (const v of valid) counts.set(v, (counts.get(v) ?? 0) + 1);

  const [value, agreed] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { value, agreed, total: values.length };
}
