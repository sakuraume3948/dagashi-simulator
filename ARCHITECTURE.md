# システムアーキテクチャ・技術構成図

「駄菓子シミュレータ」のシステム全体像、使用技術の相関関係、および設計上の決定事項をまとめたドキュメントです。

---

## 1. 全体アーキテクチャ構成図

```mermaid
flowchart TD
    subgraph Client["【クライアント層】ユーザーのブラウザ"]
        Browser["React 19 + TypeScript"]
        Tailwind["Tailwind CSS 4 + shadcn/ui"]
        CookieStorage["Cookie (dagashi_anon_id)"]
    end

    subgraph Vercel["【ホスティング・サーバー層】Vercel / Next.js 16 (App Router)"]
        subgraph Frontend["フロントエンド / 画面"]
            UI["タブ画面 (予算 / ガチャ / 駄菓子図鑑)"]
            Engine["シミュレーションエンジン (純粋関数)<br>• budget.ts (予算モード)<br>• gacha.ts (ガチャモード)"]
        end

        subgraph Backend["バックエンド (サーバーレス)"]
            ServerActions["Server Actions (app/actions.ts)"]
            Visitor["匿名ID管理 & IPハッシュ化<br>(Node.js crypto / HMAC-SHA256)"]
            StaticDB[("駄菓子マスタ (156件)<br>lib/data.ts (静的ファイル)")]
        end
    end

    subgraph DataPipeline["【データ準備】開発環境（事前実行）"]
        Scripts["データ生成スクリプト<br>(scripts/build-data.mts)"]
        Sources["井ノ口商店 / Yahoo! API / 楽天 API"]
    end

    subgraph DatabaseLayer["【データ永続化層】Supabase"]
        Prisma["Prisma 7 ORM<br>(pg Pool + @prisma/adapter-pg)"]
        Pooler["Connection Pooler (PgBouncer)"]
        SupabaseDB[("PostgreSQL Database<br>Favorite テーブル")]
    end

    %% データと処理の流れ
    Browser <-->|"SSR / インタラクション"| UI
    CookieStorage <-->|"匿名認証"| ServerActions
    UI --> Engine
    Engine -->|"高速参照"| StaticDB
    UI <-->|"お気に入り操作・集計"| ServerActions
    ServerActions --> Visitor
    ServerActions <--> Prisma
    Prisma <-->|"SSL (ポート 6543)"| Pooler
    Pooler <--> SupabaseDB

    Sources -->|"事前スクレイピング・照合"| Scripts
    Scripts -->|"ビルド時に静的生成"| StaticDB

    %% スタイル調整
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef vercel fill:#f3f4f6,stroke:#4b5563,stroke-width:2px,color:#1f2937;
    classDef db fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;
    classDef data fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#b45309;

    class Browser,Tailwind,CookieStorage client;
    class UI,Engine,ServerActions,Visitor,StaticDB vercel;
    class Prisma,Pooler,SupabaseDB db;
    class Scripts,Sources data;
```

---

## 2. レイヤー別の技術スタックと役割

| レイヤー | 採用技術 | 役割と選定理由 |
| :--- | :--- | :--- |
| **フロントエンド** | **Next.js 16.3.3 (App Router)**<br>**React 19.2.8**<br>**TypeScript 5** | 最新の App Router と React 19 を採用。サーバーコンポーネントとクライアントコンポーネントの適切な分離により、初期表示の高速化と対話性を両立。 |
| **UI・スタイル** | **Tailwind CSS 4**<br>**shadcn/ui (Base UI)**<br>**lucide-react** | 最新の Tailwind CSS 4 を使用。軽量かつ一貫性のあるデザインシステムと、レスポンシブな操作体験を提供。 |
| **シミュレーション** | **純粋関数設計**<br>(TypeScript) | 予算・ガチャの抽選処理は DOM や React に依存しない純粋関数として実装。シード付き乱数を用いることでテストの完全な再現性を担保。 |
| **駄菓子データ** | **静的配列（TypeScript）**<br>+ データ収集スクリプト | 実在の駄菓子データ（156件）は事前にスクレイピング・API照合して `lib/data.ts` に静的化。**DB問い合わせを不要にし、アクセス集中時も落ちない高可用性を実現**。 |
| **バックエンド** | **Next.js Server Actions** | API エンドポイントを定義することなく、クライアントからサーバー関数を型安全に直接呼び出し。 |
| **セキュリティ** | **Node.js crypto**<br>(HMAC-SHA256) | 登録者の IP アドレスを秘密鍵でハッシュ化して保存。個人情報を秘匿しつつ、同一ネットワークからの水増し登録をブロック。 |
| **データベース** | **Supabase (PostgreSQL)**<br>**Prisma 7** (`@prisma/adapter-pg`) | お気に入り情報のみをリレーショナルDBで永続化。Vercel（サーバーレス）環境に対応するため、PgBouncer 接続プール（ポート 6543）経由で接続。 |
| **ホスティング** | **Vercel** | Git リポジトリと連携した継続的デプロイ（CI/CD）、エッジ配信、サーバーレス実行基盤を提供。 |

---

## 3. 設計上の主要なポイント

### ① 駄菓子マスタデータの静的化（高速性と可用性）
駄菓子データは頻繁に更新されないため、あえてデータベースには格納せず、ビルド済みの静的配列（`lib/data.ts`）として配信しています。
- **メリット**:
  - 何万人のユーザーがアクセスしてもデータベースへの負荷は一切発生しません。
  - ページ読み込み速度（LCP）が極めて高速になります。

### ② ログイン不要のお気に入り ＆ 水増し防止
「駄菓子アプリでログインを求められると誰も使わない」というユーザー体験を考慮し、**ログイン不要（匿名利用）**を採用しています。
- **Cookie（`dagashi_anon_id`）**:
  - 初回アクセス時に UUID を自動発行して `httpOnly` Cookie に保持。個人の「自分のお気に入り一覧」を管理します。
- **IPハッシュ（HMAC-SHA256）**:
  - 水増し対策として、IP アドレスを直接保存するのではなくハッシュ化して保存。
  - 集計時に `COUNT(DISTINCT "ipHash")` を行うことで、同じ端末・シークレットモード等で何度も押されても「1件」として公平に集計します。

### ③ サーバーレスと接続プール（Prisma 7 + Supabase）
Vercel のようなサーバーレス環境では、アクセスごとにインスタンスが立ち上がり DB 接続数が急増するリスクがあります。
- Supabase の **トランザクションモード・コネクションプーラー（PgBouncer / ポート 6543）** を使用。
- Prisma 7 のドライバアダプタ（`@prisma/adapter-pg`）と `pg.Pool` の `max: 2` 設定により、DB 接続数を最小限に抑えて安定稼働を実現しています。

