"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DagashiCard } from "@/components/dagashi-card";
import { pullGacha } from "@/lib/engine/gacha";
import { createRng } from "@/lib/random";
import type { Dagashi, GachaResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 価格帯に応じた登場エフェクトのクラスを返す */
function getRevealAnimationClass(price: number, isLatest: boolean): string {
  if (!isLatest) return "";

  if (price >= 101) {
    // 激レア（101円〜）：カードの角丸に沿ったゴールド光彩
    return "animate-in zoom-in-75 fade-in duration-300 rounded-lg ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] scale-105 z-10";
  }
  if (price > 50) {
    // 高額（51〜100円）：カードの角丸に沿ったパープルオーラ
    return "animate-in zoom-in-85 fade-in duration-250 rounded-lg ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] z-10";
  }
  if (price > 20) {
    // 中額（21〜50円）：カードの角丸に沿ったブルー光彩
    return "animate-in zoom-in-90 fade-in duration-200 rounded-lg ring-2 ring-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.3)]";
  }
  // 通常（〜20円）：軽いポップ
  return "animate-in zoom-in-95 fade-in duration-150 rounded-lg";
}

export function GachaMode({ items }: { items: Dagashi[] }) {
  const [result, setResult] = useState<GachaResult | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(10);
  // 演出モード: "sequential" (1つずつ自動) | "instant" (一括)
  const [animMode, setAnimMode] = useState<"sequential" | "instant">("sequential");

  // 現在表示されている枚数（0 〜 result.items.length）
  const [revealedCount, setRevealedCount] = useState<number>(0);
  // 演出中フラグ
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  // チャリーン演出用のキー（金額変化時にアニメーションを再トリガー）
  const [bounceKey, setBounceKey] = useState<number>(0);
  // 最新で開いた商品の価格（+◯円のポップアップ用）
  const [latestPrice, setLatestPrice] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // コンポーネント破棄時にタイマー解除
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1枚次に進める
  function revealNext(targetResult: GachaResult, currentCount: number) {
    const nextCount = currentCount + 1;
    const item = targetResult.items[currentCount];

    setRevealedCount(nextCount);
    setLatestPrice(item?.price ?? null);
    setBounceKey((k) => k + 1);

    if (nextCount >= targetResult.items.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setIsRevealing(false);
    }
  }

  // 1つずつの自動再生を開始
  function startSequentialReveal(targetResult: GachaResult, startIndex: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    // まず現在の1枚を開く
    revealNext(targetResult, startIndex);

    let nextIdx = startIndex + 1;
    if (nextIdx >= targetResult.items.length) {
      setIsRevealing(false);
      return;
    }

    timerRef.current = setInterval(() => {
      revealNext(targetResult, nextIdx);
      nextIdx++;
      if (nextIdx >= targetResult.items.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRevealing(false);
      }
    }, 350); // 0.35秒間隔
  }

  // ガチャ実行
  function pull() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const newResult = pullGacha(items, selectedCount, createRng());
    setResult(newResult);

    if (animMode === "instant") {
      // 一括モード
      setRevealedCount(newResult.items.length);
      setIsRevealing(false);
      setLatestPrice(null);
      setBounceKey((k) => k + 1);
    } else {
      // 1つずつモード
      setRevealedCount(0);
      setIsRevealing(true);
      setLatestPrice(null);
      startSequentialReveal(newResult, 0);
    }
  }

  // スキップ：一瞬で全開示
  function skipAll() {
    if (!result) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRevealedCount(result.items.length);
    setIsRevealing(false);
    setLatestPrice(null);
    setBounceKey((k) => k + 1);
  }

  // クリックで次の商品を早送り
  function handleAdvance() {
    if (!isRevealing || !result) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startSequentialReveal(result, revealedCount);
  }

  // 現在開いているカードの合計金額（リアルタイム加算）
  const currentTotalPrice = useMemo(() => {
    if (!result) return 0;
    return result.items
      .slice(0, revealedCount)
      .reduce((sum, item) => sum + item.price, 0);
  }, [result, revealedCount]);

  return (
    <div className="flex flex-col gap-6">
      {/* 設定・操作パネル */}
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 回数選択 */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">回数</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={selectedCount === 1 ? "default" : "outline"}
                onClick={() => setSelectedCount(1)}
                className="flex-1"
              >
                1連
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedCount === 10 ? "default" : "outline"}
                onClick={() => setSelectedCount(10)}
                className="flex-1"
              >
                10連
              </Button>
            </div>
          </div>

          {/* 演出モード選択 */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">演出</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={animMode === "sequential" ? "default" : "outline"}
                onClick={() => setAnimMode("sequential")}
                className="flex-1 text-xs"
              >
                1つずつ
              </Button>
              <Button
                type="button"
                size="sm"
                variant={animMode === "instant" ? "default" : "outline"}
                onClick={() => setAnimMode("instant")}
                className="flex-1 text-xs"
              >
                一括
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Button
            type="button"
            size="lg"
            onClick={pull}
            className="w-full sm:w-auto font-bold px-8 shadow-xs"
          >
            ガチャる
          </Button>
        </div>
      </div>

      {/* 結果表示エリア */}
      {result && (
        <div
          className={cn(
            "flex flex-col gap-4 select-none",
            isRevealing && "cursor-pointer",
          )}
          onClick={handleAdvance}
        >
          {/* 金額 ＆ スキップボタンヘッダー */}
          <div className="flex items-center justify-between rounded-xl border bg-card/90 p-4 shadow-xs backdrop-blur-xs">
            <div>
              <span className="text-xs text-muted-foreground">
                {isRevealing ? "現在の合計（開封中...）" : "全部買うと"}
              </span>
              <div className="flex items-baseline gap-2">
                {/* チャリーンとバウンスする金額表示 */}
                <p
                  key={bounceKey}
                  className={cn(
                    "text-xl sm:text-2xl font-bold tabular-nums",
                    isRevealing
                      ? "animate-coin-bounce text-amber-500 drop-shadow-xs"
                      : "text-foreground",
                  )}
                >
                  {currentTotalPrice}円
                </p>
              </div>
            </div>

            {/* 画面右上のスキップボタン（演出中のみ表示） */}
            {isRevealing && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  skipAll();
                }}
                className="gap-1 text-xs font-semibold shadow-xs"
              >
                <span>スキップ</span>
                <FastForward className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* 演出中のタップ早送りヒント */}
          {isRevealing && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              画面をクリック / タップして次の商品を早送り
            </p>
          )}

          {/* カードグリッド */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {result.items.map((item, i) => {
              const isRevealed = i < revealedCount;
              const isLatest = i === revealedCount - 1 && isRevealing;

              if (!isRevealed) {
                // まだめくられていないカードのプレースホルダー枠
                return (
                  <div
                    key={`slot-${i}`}
                    className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20 p-3 text-muted-foreground/40 transition-colors"
                  >
                    <span className="text-2xl font-bold">？</span>
                    <span className="text-[10px] mt-1 tabular-nums">#{i + 1}</span>
                  </div>
                );
              }

              // めくられたカード
              return (
                <div
                  key={`${item.id}-${i}`}
                  className={cn(
                    "relative rounded-lg transition-all duration-200",
                    getRevealAnimationClass(item.price, isLatest),
                  )}
                >
                  {/* 最新めくり時の「+◯円」ポップアップバッジ */}
                  {isLatest && latestPrice && (
                    <div className="absolute -top-2.5 right-2 z-20 animate-bounce rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow-md">
                      +{latestPrice}円
                    </div>
                  )}

                  <DagashiCard item={item} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
