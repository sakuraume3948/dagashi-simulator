"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { fetchFavoriteState, toggleFavoriteAction } from "@/app/actions";

type FavoritesContextType = {
  isFavorite: (id: string) => boolean;
  getCount: (id: string) => number;
  toggle: (id: string) => void;
  isLoading: boolean;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myFavorites, setMyFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetchFavoriteState()
      .then((state) => {
        if (cancelled) return;
        setCounts(state.counts);
        setMyFavorites(new Set(state.myFavorites));
      })
      .catch((err) => {
        console.error("Failed to load initial favorite state:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function isFavorite(id: string): boolean {
    return myFavorites.has(id);
  }

  function getCount(id: string): number {
    return counts[id] ?? 0;
  }

  function toggle(id: string) {
    const currentlyFav = myFavorites.has(id);
    const prevCount = counts[id] ?? 0;

    // 1. 楽観的更新（先に画面を切り替える）
    const nextFavorites = new Set(myFavorites);
    let nextCount = prevCount;

    if (currentlyFav) {
      nextFavorites.delete(id);
      nextCount = Math.max(0, prevCount - 1);
    } else {
      nextFavorites.add(id);
      nextCount = prevCount + 1;
    }

    setMyFavorites(nextFavorites);
    setCounts((prev) => ({ ...prev, [id]: nextCount }));

    // 2. サーバーへ反映
    startTransition(async () => {
      const res = await toggleFavoriteAction(id);
      if (!res.success) {
        // 失敗した場合は元の状態にロールバック
        setMyFavorites(myFavorites);
        setCounts((prev) => ({ ...prev, [id]: prevCount }));
      }
    });
  }

  return (
    <FavoritesContext.Provider
      value={{
        isFavorite,
        getCount,
        toggle,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

