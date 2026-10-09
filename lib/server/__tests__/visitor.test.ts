import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

describe("IPハッシュ化ロジックの検証", () => {
  const secret = "test-secret-key-1234567890";

  function hashIp(ip: string, sec: string): string {
    return crypto.createHmac("sha256", sec).update(`ip:${ip}`).digest("hex");
  }

  it("同一のIPアドレスからは常に同一のハッシュ値が生成される（決定論的）", () => {
    const hash1 = hashIp("192.168.1.1", secret);
    const hash2 = hashIp("192.168.1.1", secret);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it("異なるIPアドレスからは異なるハッシュ値が生成される", () => {
    const hashA = hashIp("192.168.1.1", secret);
    const hashB = hashIp("192.168.1.2", secret);
    expect(hashA).not.toBe(hashB);
  });

  it("異なるシークレットキーからは同一IPでも異なるハッシュ値になる", () => {
    const hash1 = hashIp("192.168.1.1", "secret-A");
    const hash2 = hashIp("192.168.1.1", "secret-B");
    expect(hash1).not.toBe(hash2);
  });
});

