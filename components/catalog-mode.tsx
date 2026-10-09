"use client";

import { useMemo, useState } from "react";
import { Search, Heart, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DagashiCard } from "@/components/dagashi-card";
import { useFavorites } from "@/components/favorites-context";
import { CATEGORIES, type Category, type Dagashi } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortOption = "price-asc" | "price-desc" | "popularity" | "name";

type Props = {
  items: Dagashi[];
};

export function CatalogMode({ items }: Props) {
  const { isFavorite, getCount } = useFavorites();

  const [viewMode, setViewMode] = useState<"all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");

  // お気に入り登録されているアイテムの総数
  const totalFavoriteCount = useMemo(() => {
    return items.filter((item) => isFavorite(item.id)).length;
  }, [items, isFavorite]);

  // フィルタリング & ソート
  const displayItems = useMemo(() => {
    return items
      .filter((item) => {
        // お気に入り絞り込み
        if (viewMode === "favorites" && !isFavorite(item.id)) {
          return false;
        }
        // カテゴリ絞り込み
        if (selectedCategory !== "all" && item.category !== selectedCategory) {
          return false;
        }
        // テキスト検索（商品名 / メーカー名）
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchMaker = item.maker ? item.maker.toLowerCase().includes(q) : false;
          if (!matchName && !matchMaker) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          case "popularity": {
            const countDiff = getCount(b.id) - getCount(a.id);
            if (countDiff !== 0) return countDiff;
            return a.price - b.price;
          }
          case "name":
            return a.name.localeCompare(b.name, "ja");
          default:
            return 0;
        }
      });
  }, [items, viewMode, selectedCategory, searchQuery, sortBy, isFavorite, getCount]);

  function resetFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setViewMode("all");
    setSortBy("price-asc");
  }

  return (
    <div className="space-y-6">
      {/* 操作パネル */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-xs space-y-4">
        {/* 上段: 表示切り替え (すべて / お気に入り) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="inline-flex rounded-lg border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
                viewMode === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span>すべての駄菓子</span>
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[11px] tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("favorites")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
                viewMode === "favorites"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  viewMode === "favorites" ? "fill-rose-500 text-rose-500" : "text-rose-500/70",
                )}
              />
              <span>お気に入り</span>
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-semibold",
                  totalFavoriteCount > 0
                    ? "bg-rose-200/80 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {totalFavoriteCount}
              </span>
            </button>
          </div>

          {/* ソートセレクタ */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">並び替え:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="price-asc">価格が安い順</option>
              <option value="price-desc">価格が高い順</option>
              <option value="popularity">人気順（登録数）</option>
              <option value="name">五十音順</option>
            </select>
          </div>
        </div>

        {/* 中段: キーワード検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="商品名やメーカー名で検索（例: うまい棒、菓道、チョコ）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="検索ワードをクリア"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 下段: カテゴリ絞り込み */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            全カテゴリ
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 件数表示 & 条件リセット */}
      <div className="flex items-center justify-between px-1 text-xs sm:text-sm text-muted-foreground">
        <p>
          表示中: <span className="font-semibold text-foreground">{displayItems.length}</span> 件
          {displayItems.length !== items.length && (
            <span className="ml-1 text-muted-foreground">（全 {items.length} 件中）</span>
          )}
        </p>
        {(searchQuery || selectedCategory !== "all" || viewMode !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            絞り込みをリセット
          </Button>
        )}
      </div>

      {/* 駄菓子カードグリッド */}
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayItems.map((item) => (
            <DagashiCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        /* 空状態のメッセージ */
        <div className="rounded-xl border border-dashed p-10 text-center">
          {viewMode === "favorites" ? (
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/50">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-medium">お気に入りがまだありません</h3>
              <p className="mx-auto max-w-sm text-xs sm:text-sm text-muted-foreground">
                駄菓子カードの右上にある ♡ ボタンを押すと、ここにお気に入りの駄菓子が一覧表示されます！
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("all")}
                className="mt-2"
              >
                すべての駄菓子を見る
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                条件に一致する駄菓子が見つかりませんでした。
              </p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                条件をクリア
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

