"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetMode } from "@/components/budget-mode";
import { GachaMode } from "@/components/gacha-mode";
import { CatalogMode } from "@/components/catalog-mode";
import { FavoritesProvider } from "@/components/favorites-context";
import { getAllDagashi } from "@/lib/repository";
import type { Dagashi } from "@/lib/types";

export default function Home() {
  const [items, setItems] = useState<Dagashi[]>([]);
  const [loading, setLoading] = useState(true);

  // ★getAllDagashi は静的配列を返すだけだが async なので、この形で読み込む。
  //   将来 Supabase に移行しても非同期であることは変わらないため、
  //   ここの構造は一切変更せずに済む。
  useEffect(() => {
    let cancelled = false;
    getAllDagashi().then((data) => {
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FavoritesProvider>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">駄菓子シミュレータ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            君だけの最強駄菓子パックを作ろう！
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : (
          <Tabs defaultValue="budget">
            <TabsList className="mb-6">
              <TabsTrigger value="budget">予算モード</TabsTrigger>
              <TabsTrigger value="gacha">ガチャモード</TabsTrigger>
              <TabsTrigger value="catalog">駄菓子図鑑</TabsTrigger>
            </TabsList>
            <TabsContent value="budget">
              <BudgetMode items={items} />
            </TabsContent>
            <TabsContent value="gacha">
              <GachaMode items={items} />
            </TabsContent>
            <TabsContent value="catalog">
              <CatalogMode items={items} />
            </TabsContent>
          </Tabs>
        )}

        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>
            ※ お気に入りの重複登録防止のため、IPアドレスをハッシュ化した上で保存しています。
          </p>
        </footer>
      </main>
    </FavoritesProvider>
  );
}
