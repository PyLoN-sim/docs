# PyLoN Docs

[PyLoN](https://github.com/PyLoN-sim/PyLoN)の導入・API・[デモ](https://github.com/PyLoN-sim/demos)・開発ガイドを管理するVitePressリポジトリです。旧`KSP_ROS2/docs`の内容と関連するGit履歴を引き継いでいます。

## ローカルで読む・編集する

Node.js 22とpnpm 10を用意し、このリポジトリのルートで実行します。

```bash
pnpm install --frozen-lockfile
pnpm run docs:dev
pnpm run docs:build
pnpm run docs:preview
```

`guide/`は導入、`api/`・`parts/`・`reference/`は仕様、`demos/`は使い方、`contributing/`は開発手順です。デモの実装は別のdemosリポジトリにあります。

## 日本語・英語の編集

日本語版は既存のURL、英語版は `/en/` 以下で公開します。PCではヘッダーの言語メニュー、モバイルではナビゲーションメニューから、現在のページの対応する言語版へ切り替えられます。検索対象も現在の言語に切り替わります。

本文を変更・追加するときは、同じ相対パスの日本語版と `en/` の英語版を合わせて更新してください。英語版の内部リンクは `/en/` 配下または英語版内の相対リンクにします。共通画像は既存の画像を参照し、複製しません。

ページ内の同じ節へ切り替えられるよう、対応する見出しのアンカーIDを両言語で揃えます。英語版の `{#...}` は日本語版の見出しIDを保持しています。新しい見出しは両言語に同じ明示IDを付けると、見出し名を変更してもリンクを維持できます。

ナビゲーションとUI文言は `.vitepress/locales/ja.ts`・`.vitepress/locales/en.ts`、言語と検索の共通設定は `.vitepress/config.mts` で管理します。変更後は `pnpm run docs:build` とプレビューで、両言語のリンク・言語切り替え・検索を確認してください。

## ROS 2インターフェース定義の更新

`api/interfaces/`・`en/api/interfaces/`は、`.vitepress/interfaces.json`に保存した定義から生成します。全登録メッセージ・サービスを掲載し、フィールド・定数・配列上限・元のコメントと入れ子の型へのリンクを両言語で生成します。通常のサイトビルドは本体のcloneやROS環境を必要としません。

本体の定義を変更したときは、PyLoNのcheckoutを指定して保存済み定義とページを更新してください。`Ros2/pylon_interfaces/CMakeLists.txt`の登録一覧を取得元にします。

```bash
pnpm run docs:interfaces:sync ../PyLoN
pnpm run docs:interfaces:check
pnpm run docs:build
```

取得元commitとローカル変更の有無も記録します。公開する本体の版に合わせてcheckoutを選び、`.vitepress/interfaces.json`と生成ページを同時にコミットしてください。型名を追加・削除した場合はTopic表やAPIページのリンクも更新します。

表記やページの構成を変更する場合は`scripts/interfaces.mjs`を編集し、`pnpm run docs:interfaces`で再生成します。生成されたMarkdownは直接編集しません。`docs:build`は生成結果との一致を検査し、古いページが残っている場合は失敗します。これは保存済み定義との整合性の検査であり、上流の新しい定義の自動取得は行いません。

## 公開設定

Cloudflare Workers Static Assetsで、既存の独自ドメイン `https://pylon.ampoi.dev` に公開します。`wrangler.jsonc` が配信設定です。サーバー側のWorkerコードは使わず、VitePressの生成物 `.vitepress/dist` を配信します。静的アセットの配信と保存はCloudflareの無料枠で運用できます（ドメイン更新料は別途）。

`public/_redirects` で `/` から `/guide/overview` へ転送します。拡張子なしのURLとディレクトリの `index.html` に対応し、存在しないページにはVitePressの404ページを返します。

### GitHub Actions

- PRでは依存関係を固定してインストールし、リンク検査を含むビルドとWranglerのドライランを実行します。
- `main` へのpush、または `main` を選んだ手動実行では、検証済みのビルド成果物をCloudflareへデプロイし、公開URLの概要・Topic一覧のHTTP応答を確認します。本番デプロイは直列に実行します。
- 公開リポジトリの標準GitHubホストランナーを使用し、成果物の保存期間は1日です。

GitHubリポジトリの Settings → Secrets and variables → Actions に次のrepository secretsを登録してください。

| 名前 | 値 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | 公開先のCloudflareアカウントID |
| `CLOUDFLARE_TOKEN` | 対象アカウントのWorkers Scripts編集権限、および `ampoi.dev` のZone読み取り・Workers Routes編集権限を持つAPIトークン（Wranglerには `CLOUDFLARE_API_TOKEN` として渡します） |

APIトークンは対象アカウント・ゾーンに限定し、リポジトリやログに書かないでください。PRの検証ではsecretsを使いません。

### 初回移行・手動公開

```bash
pnpm exec wrangler login
pnpm run docs:build
pnpm run docs:deploy:check
pnpm run docs:preview:cloudflare
# ローカル確認後に公開
pnpm run docs:deploy
```

初回は `ampoi.dev` がCloudflareの有効なゾーンであることを確認します。既存のVercel向けCNAMEがある場合は設定を控え、Cloudflareの仮URLで確認した後にカスタムドメインへ切り替えます。CloudflareのCustom DomainがDNSと証明書を管理します。移行後はVercelのGit連携を解除し、二重デプロイを止めます。`vercel.json` は切り戻し用に残しています。

参考: [静的配信の料金](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)、[GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)、[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

本体やdemosのcloneはドキュメントのビルドに不要です。[MIT License](LICENSE)。
