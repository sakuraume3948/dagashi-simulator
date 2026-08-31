import { DAGASHI_DATA } from "./data";
import type { Dagashi } from "./types";

/**
 * 駄菓子データ取得の唯一の入口。
 *
 * ★中身は静的な配列だが、意図的に async にしてある。
 *
 * 将来 Supabase + Prisma に移行すると、DBアクセスは必然的に非同期になる。
 * もし今ここを同期で書くと、移行時に呼び出し側へ await を足す必要が生じ、
 * await は async 関数の中でしか書けないため、呼び出しの鎖を上へ伝染していく。
 * React コンポーネントは async にできないので、
 * 「直接呼ぶ」形から「useState + useEffect + ローディング表示」形への
 * 構造変更まで必要になってしまう。
 *
 * 最初から async にしておけば、移行時はこの関数の中身を
 *   return await prisma.dagashi.findMany();
 * に差し替えるだけで済み、エンジンにも UI にも一切波及しない。
 *
 * 将来ユーザー評価を足すときも getRatings() をこのファイルに並べる。
 */
export async function getAllDagashi(): Promise<Dagashi[]> {
  return DAGASHI_DATA;
}
