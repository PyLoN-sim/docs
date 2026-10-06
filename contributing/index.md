# PyLoN本体への貢献

このセクションは、PyLoNのKSP MOD、ROS2 bridge、共通制御器、メッセージ定義、ドキュメントを変更する人向けです。

## 開発環境

[Getting Started](../guide/getting-started.md)でKSP・MODとDockerの受信環境を準備します。MODを開発する場合は、下記のツールとソースを用意します。ホストのROS2同期・ビルドには、別途[ホストのROS 2 Jazzyと依存パッケージ](../guide/docker.md#ホストのrosアプリ・rvizを接続する)も必要です。実装の責務と依存方向は[アーキテクチャ](architecture.md)、機能ごとのファイルは[ソース案内](source-map.md)を参照してください。

作業前にリポジトリの`AGENTS.md`を確認してください。ローカルに`Development/AGENTS.md`がある場合、調査やKSP実装の変更前にそちらも確認します。実験コード、検証記録、モデルの編集元はGit管理外の`Development/`で管理します。本体のビルドは公開ソースだけで完結させます。

## MOD開発に必要なツール {#mod-tools}

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y universe
sudo apt update
sudo apt install -y git curl ca-certificates locales build-essential cmake rsync dotnet-sdk-8.0
```

.NET SDKはUbuntuのパッケージから導入します。MODの出力先フレームワークは.NET Framework 4.8ですが、ビルドには.NET SDKを使い、参照アセンブリをNuGetから取得します。初回ビルドにはネットワーク接続が必要です。[MicrosoftのUbuntu向けインストール案内](https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu-install#ubuntu-2404)も参照してください。

```bash
dotnet --list-sdks
locale charmap
```

SDK一覧に`8.0.xxx`があり、文字コードが`UTF-8`なら準備できています。文字コードが異なる場合は、次を実行してから作業を続けます。既存の日本語UTF-8環境は変更不要です。

```bash
sudo locale-gen en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

## ソースとKSPのインストール先 {#source-setup}

```bash
mkdir -p ~/src
git clone https://github.com/PyLoN-sim/PyLoN.git ~/src/PyLoN
cd ~/src/PyLoN

export KSPDIR="$HOME/.local/share/Steam/steamapps/common/Kerbal Space Program"
```

GitHubのリポジトリURLは現在のものを使い、ローカルの取得先を`PyLoN`にしています。取得済みなら、そのリポジトリへ移動してください。

`KSPDIR`は`GameData`の一つ上のフォルダです。別ドライブのSteamライブラリや手動インストールでは、実際の場所に変更します。Steamの「管理」→「ローカルファイルを閲覧」から確認できます。空白を含むのでパスは引用符で囲みます。

```bash
ls "$KSPDIR/GameData"
ls "$KSPDIR/KSP_x64_Data/Managed/Assembly-CSharp.dll"
```

一部の構成では後者が`KSP_Data/Managed/Assembly-CSharp.dll`にあります。ビルドスクリプトは両方を検索します。Managed DLLはMODをソースからビルドする場合に使用します。DockerでROS2側をビルド・実行する場合、ホストにROS workspaceを作る必要はありません。

## MODのビルドとインストール {#build-mod}

**KSPを終了した状態**で、リポジトリのルートから実行します。

```bash
./sync.sh --skip-ros2-sync --skip-ros2-build
```

このコマンドは次の処理を行います。`sudo`は付けず、KSPのインストール先へ書き込めるユーザーで実行してください。

1. KSPのManaged DLLを参照して`PyLoN.dll`をビルドする。
2. `GameData/PyLoN`を`$KSPDIR/GameData/PyLoN`へ同期する。

`GameData/`はGit管理外で、ソース取得直後には存在しません。ビルド時に`Assets/PyLoN`の原本と生成DLLから作られます。最後に`PyLoN sync complete`が表示されたら、配置を確認します。ROS2側の同期・ビルドはスキップします。

```bash
test -f "$KSPDIR/GameData/PyLoN/Plugins/PyLoN.dll" && echo "MOD installed"
```

`MOD installed`が表示されれば配置できています。KSP側は次の配置になります。

```text
Kerbal Space Program/
└── GameData/
    └── PyLoN/
        ├── Plugins/PyLoN.dll
        ├── Config/Runtime.cfg
        ├── Config/ControlSafety.cfg
        ├── Models/
        └── Parts/
```

`GameData/GameData/PyLoN`のように一段深く置かないでください。共通設定の`Runtime.cfg`は初回に配置され、以後の同期ではインストール先の設定を保持します。

### 手動配置とWindows向けビルド

`./build.sh --ksp-dir "$KSPDIR"`でビルドし、生成された`GameData/PyLoN`フォルダ全体をKSPの`GameData`へコピーします。DLLだけではモデルやパーツ設定が不足します。既存の`Runtime.cfg`はコピー前に控えてください。

WindowsのKSP用にビルドする場合は、.NET SDKを導入したPowerShellから次を実行できます。bridgeの実行は、このガイドではUbuntuのDocker Engineを対象にしています。

```powershell
.\build.ps1 -KspDir "C:\SteamLibrary\steamapps\common\Kerbal Space Program"
```

## Jazzy用Dockerイメージのビルド {#build-docker}

上記のソース取得を済ませ、PyLoNリポジトリのルートで実行します。このビルドにはホストのROS、colcon、rosdepは不要です。

```bash
docker build -f Docker/jazzy/Dockerfile --target runtime -t pylon-bridge:jazzy .

# 回帰テストも実行する場合（KSPとは別のネットワークでビルド）
docker build -f Docker/jazzy/Dockerfile --target test -t pylon-bridge:jazzy-test .

docker image ls pylon-bridge
```

初回はベースイメージと依存を取得します。`Successfully tagged`またはBuildKitのexport完了が表示されたら成功です。Pythonパッケージと独自メッセージもイメージ内でビルドします。

ベースのdigestは固定していますが、apt・rosdepの配布内容まではsnapshotに固定していません。同じDockerfileでも将来の再ビルドで依存の更新を取り込みます。完全に同じ配布物が必要なら、作ったイメージをレジストリへ保存し、そのイメージのdigestで指定してください。

Dockerfileが`pylon_interfaces`、`pylon_bridge`、`pylon_vehicle_control`をビルドします。起動は[Dockerの構成・運用](../guide/docker.md#_3-bridgeコンテナを起動する)に従い、イメージ名を`ghcr.io/pylon-sim/pylon-bridge:jazzy`から`pylon-bridge:jazzy`へ置き換えてください。ROSソースを変更した後は再ビルドします。

## ホストのROS2ビルドと同期

KSPを終了し、リポジトリのルートで実行します。

```bash
./sync.sh
```

KSPプラグインのビルドと配置、ROS2パッケージの同期とcolconビルドを行います。インストール先を変える場合は環境変数で指定します。

```bash
KSPDIR="/path/to/Kerbal Space Program" ROS2_WS="$HOME/ros2_ws" ./sync.sh
```

KSP側だけ、またはROS2側だけを変更した場合は範囲を指定できます。

```bash
# KSP側
./sync.sh --skip-ros2-sync --skip-ros2-build

# ROS2側
./sync.sh --skip-ksp-build --skip-ksp-sync
```

ローカルに`./dev`がある環境では、同じ引数で`./dev sync`を使用できます。追跡対象のエントリーポイントは`./sync.sh`です。ROS2の既定環境は`/opt/ros/jazzy/setup.bash`で、`ROS_SETUP`で変更できます。

## 変更の検証とコミット

1. 変更した機能のビルドと関連するテストを実行します。[設計と検証の観点](design.md)も参照してください。
2. MODやbridgeに関係するコード・設定・アセット・ドキュメントを変更したら、上記の同期コマンドを実行します。
3. KSPとbridgeを再起動し、対象Topicの型、値、単位、座標系、開始・終了時の動作を確認します。
4. APIを変更したら、メッセージ定義と利用者向けの説明・実行例を合わせて更新します。
5. コミットは目的ごとにまとめ、変更内容、利用者への影響、実施した検証を説明します。同期を実行できなかった場合は、理由と再実行するコマンドを記載します。

生成物やローカルの検証記録はコミット対象から外します。

## ドキュメントの編集

Node.js 22とpnpm 10を用意し、独立したdocsリポジトリで実行します。

```bash
git clone https://github.com/PyLoN-sim/docs.git ~/src/docs
cd ~/src/docs
pnpm install --frozen-lockfile
pnpm run docs:dev
```

静的ビルドとプレビューは次のとおりです。

```bash
pnpm run docs:build
pnpm run docs:preview
```

ビルド時にリンク切れを確認し、プレビューでナビゲーションとコード例の表示を確認します。公開設定はdocsリポジトリのルートにあり、VercelのRoot Directoryは`.`、CLIの作業ディレクトリもこのリポジトリのルートです。

利用者向けのページには導入・アプリケーション開発・APIの使い方を記載します。本体への貢献手順と内部設計は、この末尾セクションにまとめます。
