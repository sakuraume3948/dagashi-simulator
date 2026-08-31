import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Category, Dagashi } from "@/lib/types";

/** 商品画像が入るまでのプレースホルダ。 */
const CATEGORY_EMOJI: Record<Category, string> = {
  スナック: "🥨",
  チョコ: "🍫",
  "グミ・キャンディ": "🍬",
  "ラムネ・タブレット": "🫧",
  "せんべい・おつまみ": "🍘",
  飲料: "🥤",
  "くじ・当たり付き": "🎯",
};

/**
 * 価格帯で枠の色を変える。
 * レア度システムではなく、単に高額商品を目立たせるための演出。
 * ガチャで高い駄菓子を引いたときの手応えを出すのが目的。
 */
function priceTierClass(price: number): string {
  if (price <= 20) return "border-neutral-300 dark:border-neutral-700";
  if (price <= 50) return "border-blue-400";
  if (price <= 100) return "border-purple-500";
  return "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20";
}

type Props = {
  item: Dagashi;
  /** 予算モードで同一商品をまとめた個数。ガチャモードでは渡さない。 */
  qty?: number;
};

export function DagashiCard({ item, qty }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border-2 bg-card p-3 transition-shadow hover:shadow-md",
        priceTierClass(item.price),
      )}
    >
      <div className="flex items-center justify-center rounded-md bg-muted/50 py-4 text-4xl">
        {item.imageUrl ? (
          // 将来スクレイピングで入る画像は外部ドメインになるため、
          // next/image ではなく素の img を使う（next.config の設定を不要にするため）
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-16 w-auto object-contain"
          />
        ) : (
          <span aria-hidden>{CATEGORY_EMOJI[item.category]}</span>
        )}
      </div>

      <div className="flex-1">
        <p className="text-sm leading-snug font-medium">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.maker}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">
          {item.category}
        </Badge>
        <span className="text-sm font-semibold tabular-nums">
          {item.price}円
          {qty !== undefined && (
            <span className="ml-1 text-muted-foreground">× {qty}</span>
          )}
        </span>
      </div>
    </div>
  );
}
