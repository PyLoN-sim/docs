---
title: Getting Started
description: KSPへPyLoN MODを導入し、Docker内のROS 2 Jazzyとbridgeを起動して機体情報と3D LiDARを受信する手順。
---

# Getting Started

PyLoNを初めて使うための導入手順です。**ホストのKSPにPyLoN MODを導入し、Docker内のROS 2 JazzyとPyLoN bridgeへ接続して、機体情報と3D LiDARの点群を受信する**ところまで進めます。

KSPとMODはホストで動かし、ROS2パッケージはビルド済みイメージからコンテナ内で実行します。ホストにROS、colcon、rosdepをインストールする必要はありません。コマンドはbash用です。すでに完了している準備は飛ばしてください。

## 1. 必要なものを準備する

| 必要なもの | 用途 |
| --- | --- |
| Ubuntu Desktop 24.04 LTS、x86_64 PC | Linux版KSPとDocker Engineを動かす |
| KSP 1.x | ゲームの実行。MODをソースから作る場合はManaged DLLも参照 |
| Docker Engine | Jazzy・PyLoN bridge入りのイメージを取得し、コンテナを起動 |
| Git | MODのソースと設定を取得 |
| .NET SDK 8.0、ビルドツール、rsync | MODをソースからビルド・同期する場合のみ必要 |

### Ubuntu・Steam/KSPの前提

このガイドは**Ubuntu Desktop 24.04 LTS・x86_64上で、Linux版KSP 1.xとbridgeを同じPCで動かす構成**を対象にします。KSP 1.12.5での既存デモ記録があります。KSP 2、Windows版をProtonで動かす構成、WSL、仮想マシン、ARM機は、このページの確認対象に含めません。UbuntuのインストールとGUIでKSPを起動できる状態までは先に準備してください。

KSP本体はPyLoNに含まれません。[SteamのKSP製品ページ](https://store.steampowered.com/app/220200/Kerbal_Space_Program/)などで別途用意します。以下ではSteam版の配置を例にしますが、Steamを経由しないLinux版でも`KSPDIR`を実際の場所へ合わせれば同じビルド手順を使えます。最小受信機体はstockパーツとPyLoNだけを使い、DLCや他のMODは必要ありません。

1. SteamでKSPをインストールし、Linux版を通常起動します。互換性設定でProtonを強制している場合はLinux版の構成へ戻します。
2. タイトル画面でKSPのバージョンを控え、新しい**Sandbox**セーブを`PyLoN Receive`などの名前で作ります。VAB（ロケット組立棟）へ入れることを確認します。
3. KSPを終了します。MODのコピー・更新はゲームを終了した状態で行います。
4. Steamの「管理」→「ローカルファイルを閲覧」でインストール先を確認します。別ドライブやFlatpak版Steamでは既定のパスと異なるため、手順2の`KSPDIR`へ実際のパスを設定します。

```bash
cat /etc/os-release  # Ubuntu、VERSION_ID="24.04"を確認
uname -m            # x86_64を確認
```

### DockerとGitを準備する

Docker Engineを[Docker公式のUbuntu向け手順](https://docs.docker.com/engine/install/ubuntu/)で導入します。導入後の権限設定は[Linuxでのインストール後の手順](https://docs.docker.com/engine/install/linux-postinstall/)を参照し、次でServer情報が表示されることを確認します。

```bash
docker version
sudo apt update
sudo apt install -y git
```

このページでは`docker pull`と`docker run`を使います。Composeを使う場合の設定は[Dockerの構成・運用](docker.md#_5-composeで起動する場合)にあります。

::: details MODをソースから作る場合：Ubuntuの基本ツールと.NET SDK
配布版MODを使う場合、この準備は不要です。

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
:::

## 2. ソースとインストール先を用意する

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

一部の構成では後者が`KSP_Data/Managed/Assembly-CSharp.dll`にあります。ビルドスクリプトは両方を検索します。Managed DLLはMODをソースからビルドする場合に使用します。ROS2パッケージはコンテナ内でビルドするため、ホストにROS workspaceを作る必要はありません。

## 3. MODをビルド・インストールする {#install-mod}

配布版MODを使う場合は、[Releases](https://github.com/PyLoN-sim/PyLoN/releases)の`PyLoN-vX.Y.Z.zip`を展開し、`GameData/PyLoN`をKSPの`GameData`へコピーします。「Source code」アーカイブにはビルド済みMODは含まれません。更新前にインストール先の`Config/Runtime.cfg`を控えてください。配布版MODを導入済みなら、手順4のDockerイメージの取得へ進みます。

以下はMODもソースからビルドする場合の手順です。

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

::: details 手動でMODだけインストールする場合
`./build.sh --ksp-dir "$KSPDIR"`でビルドし、生成された`GameData/PyLoN`フォルダ全体をKSPの`GameData`へコピーします。DLLだけではモデルやパーツ設定が不足します。既存の`Runtime.cfg`はコピー前に控えてください。

WindowsのKSP用にビルドする場合は、.NET SDKを導入したPowerShellから次を実行できます。bridgeの実行は、このガイドではUbuntuのDocker Engineを対象にしています。

```powershell
.\build.ps1 -KspDir "C:\SteamLibrary\steamapps\common\Kerbal Space Program"
```
:::

## 4. JazzyとPyLoNのDockerイメージを取得する

::: info GHCRの初回公開
[公開ワークフローを追加するPR](https://github.com/PyLoN-sim/PyLoN/pull/1)を作成しました。初回ビルドとPackagesのPublic設定が完了するまでは、下記のpullコマンドは使えません。その場合は、このページのローカルビルド手順で起動してください。
:::

GitHub Container Registry（GHCR）から、ROS 2 JazzyとPyLoN bridgeが入ったイメージを取得します。公開イメージの取得にGitHubへのログインは不要です。

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
docker image ls ghcr.io/pylon-sim/pylon-bridge
```

`jazzy`は通常配布用の更新タグです。MODとコンテナには対応するソース版を使ってください。特定の版を固定する場合は、[Dockerの構成・運用](docker.md#配布タグとバージョン固定)にあるリリースタグまたはdigestを指定します。

イメージにはKSP本体・MODのDLL・ゲーム資産は含まれません。ホストのROS workspaceもmountしません。

::: details ソースを変更して、手元でイメージをビルドする場合
PyLoNリポジトリのルートで実行します。

```bash
cd ~/src/PyLoN
docker build -f Docker/jazzy/Dockerfile --target runtime -t pylon-bridge:jazzy .
```

初回は公式ROSイメージと依存を取得します。Dockerfileが`pylon_interfaces`、`pylon_bridge`、`pylon_vehicle_control`をcolconでビルドします。以降の`docker run`では、イメージ名を`pylon-bridge:jazzy`へ置き換えてください。
:::

## 5. ROS2 bridgeを起動する

ターミナルAで実行します。

```bash
docker run --rm -it --init --network host \
  --name pylon-jazzy \
  -e ROS_DOMAIN_ID=0 \
  ghcr.io/pylon-sim/pylon-bridge:jazzy
```

`Listening on udp://127.0.0.1:49010`と指令先`127.0.0.1:49011`が表示され、このターミナルが実行中のままになれば正常です。KSPはまだ起動していなくても構いません。

Linuxのhost networkを使うため、KSP側の`GameData/PyLoN/Config/Runtime.cfg`は既定の`stateHost=127.0.0.1`、`statePort=49010`、`commandPort=49011`で接続できます。モデル転送の`allowRemoteUrdf=false`も変更不要です。KSPのUDPを受け取るbridgeは**1つ**にし、既存のホストbridgeやSpace ROS bridgeは終了しておきます。

ターミナルBでbridgeの起動を確認します。`docker exec`は起動時のentrypointを自動実行しないため、`/pylon-entrypoint.sh`を付けてROS環境を読み込みます。

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-durability transient_local /pylon/status
```

```yaml
data: listening
```

bridgeはデータの中継を担当します。この起動だけでは機体へ移動目標は送りません。姿勢・位置制御は[機体制御API](../api/vehicle-control.md)やデモから利用します。

## 6. KSPでセンサーを載せた機体を出す

[最小受信確認用機体「PyLoN Receiver」](minimal-receiver.md)を組み立てます。Mk1ランダー缶、Z-100バッテリー、PyLoN LiDAR 3Dの**3パーツ**を使う、発射台に置いたまま受信するための機体です。リンク先に取り付け位置・Sensor ID・確認条件をまとめています。

保存後にLaunchでFlightへ移り、ポーズ解除・通常速度（1倍）にしてください。点火・分離・周回デモはまだ実行しません。Sensor IDは以下のコマンドと一致する`front_lidar`を使います。

センサーパーツがなくても、操作機体のlifecycle・IMU・機体モデルは独立して配信されます。LiDARとカメラのTopicは、対応するセンサーから最初のデータを受信した時点で作成されます。

## 7. 機体情報と点群を受信する

ターミナルBで順に確認します。ROSコマンドは実行中の`pylon-jazzy`コンテナ内で動きます。`hz`は計測を続けるので、数行表示されたらCtrl+Cで次へ進みます。

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/simulator/state
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/lifecycle
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic list --no-daemon
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz \
  /ksp_vessel/lidar_3d/front_lidar/points
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-durability transient_local /ksp_vessel/root_frame
```

| 確認対象 | 成功の目安 |
| --- | --- |
| simulator | `communication_alive: true`。ポーズ解除・通常速度では`simulation_advancing: true` |
| lifecycle | `state: 1`（ACTIVE）、空でない`vessel_id`・`runtime_epoch` |
| 機体モデル | 読込み後にlifecycleの`model_ready: true`、空でない`root_frame` |
| IMU | `average rate`が継続表示される |
| 3D LiDAR | `points` Topicがあり、`average rate`が継続表示される |

`/pylon/status`の`listening`だけではKSPからの受信成功とは限りません。simulator・lifecycle・IMUを併せて確認してください。

点群の周期はセンサー設定やゲームの実行速度で変わります。自動IDを使った場合はTopic一覧に出た実際の名前へ置き換えてください。2D LiDARは`/ksp_vessel/lidar_2d/<sensor_id>/scan`、RGBカメラは`/ksp_vessel/camera/<sensor_id>/image_raw`へ出力します。

コンテナ内で複数のROSコマンドを試す場合はシェルを開けます。

```bash
docker exec -it pylon-jazzy /pylon-entrypoint.sh bash --norc
```

追加のbridge引数、ホストのROSアプリ・RVizとの接続、Composeでの起動は[Dockerの構成・運用](docker.md)を参照してください。RVizとデモは本体イメージには含まれません。

## 8. 停止・更新する

ターミナルAでCtrl+Cを押すか、別ターミナルで停止します。

```bash
docker stop pylon-jazzy
```

`--rm`により停止したコンテナは削除され、ビルド済みイメージは残ります。次回は手順5の`docker run`から起動できます。

イメージを更新する場合はコンテナを停止し、手順4の`docker pull`で取得してから起動します。ソースから作ったイメージは再ビルドします。MODも更新する場合はKSPを終了し、配布版の再配置または次の同期を行ってKSPを再起動します。

```bash
./sync.sh --skip-ros2-sync --skip-ros2-build
```

## うまく動かないとき

| 症状 | 最初に確認すること |
| --- | --- |
| Docker socketの`permission denied` | Dockerの権限設定と再ログイン |
| `dotnet: command not found` | MODをソースから作る場合はSDKの導入と`dotnet --list-sdks` |
| KSPのManaged DLLが見つからない | `KSPDIR`が`GameData`の親を指しているか |
| `pylon-jazzy`の名前が使用中 | `docker ps -a`で以前のコンテナを確認し、停止する |
| `Package 'pylon_bridge' not found` | イメージの取得成功と、`docker exec`で`/pylon-entrypoint.sh`を付けたか |
| UDPポートが使用中 | 別のbridgeや、bridgeを含むデモを二重起動していないか |
| MODのパーツがない | `Plugins/PyLoN.dll`と`Parts`の配置、KSPを再起動したか |
| bridgeは動くがlifecycleがACTIVEにならない | 操作機体でFlight中か、Runtime.cfgの送信先とhost networkを確認 |
| lifecycleはACTIVEだが点群がない | LiDARとUDPの有効化、実際のSensor ID、ポーズ状態 |

詳しくは[トラブルシュート](../reference/troubleshooting.md)、設定項目は[bridge起動オプション](../reference/bridge-options.md)を参照してください。

## 次のステップ

[ROS2アプリケーションを作る](application-development.md)でTopicの購読と制御APIの使い方を確認できます。[デモ一覧](../demos/index.md)には追加パッケージ・機体・起動順をまとめています。各デモの実行環境は別途用意してください。

Space ROSを使う場合は、このページの手順1〜3でKSPとMODを準備してから、[Space ROSで動かす](space-ros.md)へ進みます。
