import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // エンジンは純粋関数で document を触らないため、ブラウザ環境(jsdom)は不要。
    // Node 上で動かすことで10万回のシミュレーションが数秒で終わる。
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./") },
  },
});
