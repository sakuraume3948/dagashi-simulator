/**
 * data/sources/*.json の共通部分。3つの fetch スクリプトが使う。
 */

import { existsSync, readFileSync } from "node:fs";

/**
 * 出力ファイルに書く取得日時を決める。
 *
 * ★実際にサイト/APIを叩いたときだけ更新し、そうでなければ前回の値を引き継ぐ。
 *
 *   このプロジェクトは「取得」と「解析」を分けていて、解析ロジックを直すたびに
 *   fetch スクリプトを再実行する。キャッシュがあるので通信は発生しない。
 *   それなのに毎回 new Date() を書いていたため、取得日時だけが進んでいた。
 *
 *     実際に井ノ口からHTMLを取った日   2026-09-02 05:33
 *     inokuchi.json が名乗っていた日   2026-09-04 14:52   ← 2日ずれていた
 *
 *   lib/types.ts はこのフィールドを「価格を取得した日時。値上げ追跡用」と
 *   定義しているので、ズレると本来の用途が成立しない。
 *
 * ★一部だけ取得した場合は更新する。
 *   商品を追加して新規分だけAPIを叩いたときは、ファイル全体としては
 *   「その日に取得した内容を含む」ので、新しい日時を名乗ってよい。
 */
export function resolveFetchedAt(outputPath: string, fetchedFromNetwork: boolean): string {
  if (fetchedFromNetwork) return new Date().toISOString();

  if (existsSync(outputPath)) {
    try {
      const previous = JSON.parse(readFileSync(outputPath, "utf8")) as { fetchedAt?: unknown };
      if (typeof previous.fetchedAt === "string" && previous.fetchedAt !== "") {
        return previous.fetchedAt;
      }
    } catch {
      // 前回の出力が壊れている。取得作業をすべて終えた後の書き出し時点なので、
      // ここで落とすと成果が捨てられる。日時を諦めて先へ進む。
      console.warn(`  ⚠ ${outputPath} を読めなかったため、取得日時を引き継げません`);
    }
  }

  // 初回実行、または前の値が読めなかった場合。今を書くしかない。
  return new Date().toISOString();
}
