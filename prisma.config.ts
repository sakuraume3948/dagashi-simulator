import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// .env.local から環境変数を読み込む
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});