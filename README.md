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

## 公開設定

Cloudflare Workers Static Assetsで、既存の独自ドメイン `https://pylon.ampoi.dev` に公開します。`wrangler.jsonc` が配信設定です。サーバー側のWorkerコードは使わず、VitePressの生成物 `.vitepress/dist` を配信します。静的アセットの配信と保存はCloudflareの無料枠で運用できます（ドメイン更新料は別途）。

`public/_redirects` で `/` から `/guide/overview` へ転送します。拡張子なしのURLとディレクトリの `index.html` に対応し、存在しないページにはVitePressの404ページを返します。

### GitHub Actions

- PRでは依存関係を固定してインストールし、リンク検査を含むビルドとWranglerのドライランを実行します。
- `main` へのpush、または `main` を選んだ手動実行では、検証済みのビルド成果物をCloudflareへデプロイします。本番デプロイは直列に実行します。
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
