"use client";

import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/components/favorites-context";
import { cn } from "@/lib/utils";
import type { Category, Dagashi } from "@/lib/types";

/** 商品画像が入るまでのプレースホルダ。 */
const CATEGORY_EMOJI: Record<Category, string> = {
  スナック: "🥨",
  チョコ: "🍫",
  "グミ・キャンディ": "🍬",
  "ラムネ・タブレット": "🫧",
  "せんべい・おつまみ": "🍘",
  "くじ・当たり付き": "🎯",
  その他: "🍡",
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
  const { isFavorite, getCount, toggle } = useFavorites();
  const favorited = isFavorite(item.id);
  const count = getCount(item.id);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border-2 bg-card p-3 transition-shadow hover:shadow-md",
        priceTierClass(item.price),
      )}
    >
      <div className="relative flex items-center justify-center rounded-md bg-muted/50 py-4 text-4xl">
        {/* お気に入り（♡）ボタンと登録数 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle(item.id);
          }}
          aria-label={
            favorited
              ? `${item.name}をお気に入りから解除`
              : `${item.name}をお気に入りに追加`
          }
          className={cn(
            "absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors shadow-xs backdrop-blur-xs",
            favorited
              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300"
              : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground",
          )}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-transform active:scale-125",
              favorited && "fill-current",
            )}
          />
          <span className="tabular-nums text-[11px] font-semibold">{count}</span>
        </button>

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
        {/* メーカー名は取得できない情報源があるため、無ければ行ごと出さない */}
        {item.maker && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.maker}</p>
        )}
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
