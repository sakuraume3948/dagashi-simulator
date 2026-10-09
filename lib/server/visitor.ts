import { cookies, headers } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "dagashi_anon_id";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * 訪問者の匿名IDを取得する。
 * まだCookieがない場合はUUIDを新規発行してCookieにセットする。
 */
export async function getOrCreateAnonId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing && existing.length > 0) {
    return existing;
  }

  const newId = crypto.randomUUID();
  cookieStore.set({
    name: COOKIE_NAME,
    value: newId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return newId;
}

/**
 * 現在のCookieから匿名IDを取得する（存在しない場合はnullを返す。Cookieの発行は行わない）。
 */
export async function getExistingAnonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * リクエストヘッダーからIPアドレスを取得し、HMAC-SHA256でハッシュ化する。
 * IPが取得できない環境（ローカル開発等）では、誤って全体で重複扱いされないよう
 * fallbackId（匿名ID）を含めてハッシュ化する。
 */
export async function getIpHash(fallbackId: string): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const rawIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : headerStore.get("x-real-ip")?.trim();

  const secret = process.env.IP_HASH_SECRET || "dagashi-default-secret";
  const target = rawIp ? `ip:${rawIp}` : `fallback:${fallbackId}`;

  return crypto.createHmac("sha256", secret).update(target).digest("hex");
}

