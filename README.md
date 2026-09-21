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

`vercel.json`を同梱しています。Vercelに接続する場合はリポジトリを`PyLoN-sim/docs`、Root Directoryをリポジトリルート（`.`）、出力を`.vitepress/dist`に指定します。GitHub Actionsではリンク検査を含む静的ビルドを実行します。

本体やdemosのcloneはドキュメントのビルドに不要です。[MIT License](LICENSE)。
