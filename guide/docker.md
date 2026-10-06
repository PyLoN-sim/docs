---
title: Dockerの構成・運用
description: PyLoN bridge入りのJazzyイメージをビルドし、ホストのKSP MODと接続する。Dockerfile、Compose、受信確認、停止・更新の手順。
---

# Dockerの構成・運用

ホストにROSをインストールせず、**ROS 2 JazzyとPyLoN bridgeを含むDockerイメージ**をGHCRから取得して実行します。KSP 1.xとPyLoN MODはホストで起動します。対象はUbuntu 24.04・x86_64のLinux版KSPとDocker Engineです。

## ROS 2 OSSのDocker配布形式

ROSの[公式イメージ](https://hub.docker.com/_/ros)では、`ros-core`が最小構成、`ros-base`が基本ライブラリと開発ツールを含む構成です。GUI付きの`desktop`などはOSRFのイメージとして提供されています。OSSをコンテナ化するときは、これらを土台にROSパッケージを追加します。

| 配布するもの | 役割 | 利用者が行うこと |
| --- | --- | --- |
| Dockerfileとソース | ベースイメージ・依存・colconビルドを定義 | `docker build`でイメージを作る |
| レジストリ上のビルド済みイメージ | タグやdigestでビルド済み環境を取得 | `docker pull`して実行する |
| Composeファイル | イメージ、ネットワーク、環境変数、起動設定をまとめる | `docker compose up`でコンテナを起動する |

公式ROSイメージの[overlay workspaceの例](https://hub.docker.com/_/ros)と、[Navigation2のDockerfile](https://github.com/ros-navigation/navigation2/blob/main/Dockerfile)は、依存解決・ビルド・実行のstageを分け、entrypointでROS環境を読み込む構成です。PyLoNもこの方式を使います。本体3パッケージは1つのoverlayにまとめます。

PyLoNは**GHCRのビルド済みイメージと、リポジトリのDockerfile・entrypoint・Compose設定**を配布する構成です。MODのZIPはGitHub Releases、コンテナイメージはGitHub Packages（GHCR）で扱います。Dockerfileはイメージを作るための定義ファイルで、利用時にはビルド済みイメージをpullします。

## コンテナ構成

| 項目 | 内容 |
| --- | --- |
| ベース | `ros:jazzy-ros-base-noble`。検証したdigestをDockerfileで固定 |
| ROS / Python | Jazzy / Ubuntu 24.04のPython 3.12 |
| ビルド対象 | `pylon_interfaces`、`pylon_bridge`、`pylon_vehicle_control` |
| workspace | `/opt/pylon_ws/install`。ホストの`~/ros2_ws`とは独立 |
| 実行 | UID 10001の`pylon`ユーザー。entrypointでROSとoverlayをsourceし、`exec`でコマンドを実行 |
| DDS | Cyclone DDS、`ROS_DOMAIN_ID=0`、discovery範囲は`LOCALHOST` |
| ネットワーク | Linuxのhost network。KSPとのUDPはloopbackを使用 |
| 同梱 | ROS、PyLoNのビルド済みROSパッケージ、PyLoNのLICENSE |
| ホストに置くもの | KSP本体、PyLoN MOD。RViz・デモは必要な場合に別途用意 |

`builder` stageはpackage.xmlからrosdepで依存を解決し、colconでコンパイルします。`test` stageは回帰テスト用、`runtime` stageはinstall成果物と実行依存をコピーします。土台はCLI操作や拡張に使いやすい`ros-base`なのでROS由来の開発ツールは残りますが、PyLoNのソース・buildディレクトリ・ローカルの`Development/`は入りません。

設定は[本体のDocker/jazzy](https://github.com/PyLoN-sim/PyLoN/tree/main/Docker/jazzy)にあります。`.dockerignore`で本体のROSソースとコンテナ設定だけをビルドcontextに含めます。KSPやゲーム資産をコピー・mountする必要はありません。

## 1. ホストとMODを準備する

[Getting StartedのUbuntu・Steam/KSPの前提](getting-started.md#ubuntu・steam-kspの前提)に従ってLinux版KSPを準備します。Docker Engineは[Docker公式のUbuntu手順](https://docs.docker.com/engine/install/ubuntu/)で導入してください。Composeを使う場合はCompose pluginも導入します。

```bash
docker version         # Server情報が表示されること
docker compose version # Composeを使う場合

mkdir -p ~/src
git clone https://github.com/PyLoN-sim/PyLoN.git ~/src/PyLoN
cd ~/src/PyLoN
export KSPDIR="$HOME/.local/share/Steam/steamapps/common/Kerbal Space Program"
```

取得済みならそのリポジトリへ移動します。Dockerのグループ権限は[公式のインストール後の手順](https://docs.docker.com/engine/install/linux-postinstall/)を参照し、`docker version`が成功する状態にしてください。

**KSPを終了した状態**でPyLoN MODをインストールします。

- 配布版：[Releases](https://github.com/PyLoN-sim/PyLoN/releases)の`PyLoN-vX.Y.Z.zip`を展開し、`GameData/PyLoN`をKSPの`GameData`へコピーします。更新前に既存の`Config/Runtime.cfg`を控えます。
- ソース版：Getting Startedの.NET SDKと基本ツールを用意し、次を実行します。ホストのROS・rosdep・colconは不要です。

```bash
./sync.sh --skip-ros2-sync --skip-ros2-build
```

KSP側の`GameData/PyLoN/Config/Runtime.cfg`は既定のまま使います。

```text
PYLON_TRANSPORT
{
    stateHost = 127.0.0.1
    statePort = 49010
    commandPort = 49011
}
```

`PYLON_MODEL.allowRemoteUrdf=false`も変更不要です。既存のホストbridgeやSpace ROS bridgeは終了し、49010/UDPを受けるbridgeを1つにしてください。

## 配布タグとバージョン固定

::: info GHCRの初回公開
[公開ワークフローを追加するPR](https://github.com/PyLoN-sim/PyLoN/pull/1)を作成しました。初回ビルドとPackagesのPublic設定が完了するまでは、下記のpullコマンドは使えません。その場合は、このページのローカルビルド手順で起動してください。
:::

イメージ名は`ghcr.io/pylon-sim/pylon-bridge`です。

| 指定 | 用途 |
| --- | --- |
| `:jazzy` | 通常配布用。mainの公開や正式リリースに合わせて更新 |
| `:jazzy-sha-<40桁のcommit SHA>` | 公開元のソースcommitを指定 |
| `:jazzy-vX.Y.Z` | `vX.Y.Z`のGitHub Releaseを公開したときに作成 |
| `@sha256:<digest>` | 配布イメージそのものを固定 |

実在するタグとdigestは[Packages](https://github.com/orgs/PyLoN-sim/packages/container/package/pylon-bridge)またはGitHub Actionsの実行summaryで確認します。`vX.Y.Z`と`<digest>`は書式例です。MOD、ホストの`pylon_interfaces`、コンテナは対応するソース版を揃えます。公開イメージのpullにはGitHubログインは不要です。

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
docker image inspect ghcr.io/pylon-sim/pylon-bridge:jazzy \
  --format '{{json .RepoDigests}}'
```

得られた`ghcr.io/pylon-sim/pylon-bridge@sha256:...`を`docker run`のイメージ名として使えば、後から`jazzy`が更新されても同じイメージで起動できます。

## 2. イメージを取得する・ビルドする

通常は次で取得します。

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
```

ソースを変更する場合は、PyLoNリポジトリのルートでローカルイメージをビルドします。

```bash
docker build -f Docker/jazzy/Dockerfile --target runtime -t pylon-bridge:jazzy .

# 回帰テストも実行する場合（KSPとは別のネットワークでビルド）
docker build -f Docker/jazzy/Dockerfile --target test -t pylon-bridge:jazzy-test .

docker image ls pylon-bridge
```

初回はベースイメージと依存を取得します。`Successfully tagged`またはBuildKitのexport完了が表示されたら成功です。Pythonパッケージと独自メッセージもイメージ内でビルドします。

ベースのdigestは固定していますが、apt・rosdepの配布内容まではsnapshotに固定していません。同じDockerfileでも将来の再ビルドで依存の更新を取り込みます。完全に同じ配布物が必要なら、作ったイメージをレジストリへ保存し、そのイメージのdigestで指定してください。

## 3. bridgeコンテナを起動する

```bash
docker run --rm -it --init --network host \
  --name pylon-jazzy \
  -e ROS_DOMAIN_ID=0 \
  ghcr.io/pylon-sim/pylon-bridge:jazzy
```

ローカルビルドを使う場合は、イメージ名を`pylon-bridge:jazzy`に置き換えます。

`Listening on udp://127.0.0.1:49010`と指令先`127.0.0.1:49011`が表示されます。ターミナルを開いたまま、ホストのKSPで[最小受信機体](minimal-receiver.md)などをFlightへ進め、ポーズを解除します。

[Dockerのhost driver](https://docs.docker.com/engine/network/drivers/host/)はホストのネットワーク空間を共有します。コンテナ内の`127.0.0.1`がKSPへ届くため、UDPの送信先変更や`-p`は不要です。通常のDocker bridge networkではloopbackはコンテナ自身を指すため、この手順のままでは接続できません。Windows・macOS・WSL・Docker Desktopでの接続は今回の検証対象外です。

bridgeオプションを変えるときは、イメージ名の後にコマンド全体を指定します。

```bash
docker run --rm -it --init --network host --name pylon-jazzy \
  ghcr.io/pylon-sim/pylon-bridge:jazzy \
  ros2 run pylon_bridge udp_bridge --host 127.0.0.1 --disable-ground-truth
```

引数は[Bridge起動オプション](../reference/bridge-options.md)を参照してください。

## 4. KSPからの受信を確認する

別ターミナルで実行します。`docker exec`はentrypointを自動実行しないため、**`/pylon-entrypoint.sh`を付けて**ROSとPyLoNの環境を読み込みます。

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic list --no-daemon
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-durability transient_local /pylon/status
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/simulator/state
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/lifecycle
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-durability transient_local /ksp_vessel/root_frame
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
```

`hz`は継続するrateを確認してCtrl+Cで終了します。`/pylon/status`の`listening`は待ち受けの成功です。**KSPとの接続成功**には、`simulator/state`の`communication_alive: true`、`lifecycle`の`state: 1`と空でない`vessel_id`、IMUの継続受信を確認します。モデルを有効にしたFlightでは`model_ready: true`と空でない`root_frame`も確認します。

最小受信機体のLiDAR IDを`front_lidar`にした場合は次で点群を確認できます。別の機体ではTopic一覧に出た実際のIDへ置き換えます。

```bash
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz \
  /ksp_vessel/lidar_3d/front_lidar/points

# コンテナ内でコマンドを試すシェル
docker exec -it pylon-jazzy /pylon-entrypoint.sh bash --norc
```

## 5. Composeで起動する場合

同じイメージと設定をComposeでも使えます。手順3のコンテナを停止してから実行します。

```bash
docker compose -f Docker/jazzy/compose.yaml pull
docker compose -f Docker/jazzy/compose.yaml up --no-build -d
docker compose -f Docker/jazzy/compose.yaml logs -f bridge
# logsの追跡だけをCtrl+Cで終了し、別コマンドで受信確認
docker compose -f Docker/jazzy/compose.yaml exec bridge \
  /pylon-entrypoint.sh ros2 topic echo --once \
  --qos-reliability best_effort /ksp_vessel/simulator/state
docker compose -f Docker/jazzy/compose.yaml down
```

ローカルビルドを使う場合は`PYLON_JAZZY_IMAGE=pylon-bridge:jazzy docker compose -f Docker/jazzy/compose.yaml up --build -d`で起動します。

`ROS_DOMAIN_ID=7 docker compose -f Docker/jazzy/compose.yaml up -d`のようにDDS domainを変えられます。host networkなので、domainを変えてもUDPポート49010の競合は避けられません。

## ホストのROSアプリ・RVizを接続する

ホストにJazzyがある場合はDDS経由でコンテナのTopicを使えます。Getting StartedはDocker内だけで受信を確認するため、ホスト向けのアプリを作る場合は追加の準備が必要です。

Jazzyが未導入なら、[ROS 2公式のUbuntu 24.04向け手順](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html)で配布元を登録し、`ros-jazzy-ros-base`と`ros-dev-tools`を導入します。続いて、コンテナと同じソース版のPyLoNリポジトリで実行します。

```bash
source /opt/ros/jazzy/setup.bash
if [ ! -f /etc/ros/rosdep/sources.list.d/20-default.list ]; then
  sudo rosdep init
fi
rosdep update
rosdep install --from-paths \
  Ros2/pylon_interfaces Ros2/pylon_bridge Ros2/pylon_vehicle_control \
  --ignore-src --rosdistro jazzy -y
./sync.sh --skip-ksp-build --skip-ksp-sync
```

ホストのアプリを使うターミナルで環境を読み込みます。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
export ROS_DOMAIN_ID=0
export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST
ros2 topic list --no-daemon
ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/imu/data_raw
```

独自メッセージを使うアプリにはコンテナと同じソース版の`pylon_interfaces`が必要です。ホストのworkspace更新には`./sync.sh --skip-ksp-build --skip-ksp-sync`を使います。ホストとコンテナで`build/`・`install/`を共有せず、各環境でビルドしてください。KSPのUDPはコンテナのbridgeが受信するので、ホストではアプリだけを起動します。

## 停止・更新・ログ

`docker run`はCtrl+C、または別ターミナルで`docker stop pylon-jazzy`を実行します。`--rm`で停止後のコンテナは削除され、イメージは残ります。ログを残す場合は停止前に保存します。

```bash
docker logs pylon-jazzy > pylon-jazzy.log
docker stop pylon-jazzy
```

配布イメージは`docker pull`してからコンテナを作り直します。Composeでは`pull`、`up --no-build -d`の順に更新します。ROSソースを変更したローカルイメージは手順2で再ビルドします。MOD変更時はKSPを終了してMODを更新し、KSPも再起動します。

## 検証記録

2026-10-06（JST）、Ubuntu 24.04・x86_64、Docker Engine 29.1.3、Linux版KSP 1.12.5で確認しました。公式ベースのdigestは`sha256:066420e07f60aa18262f2479981def87ebcfcec42eefb0c0c57c4a46098348ca`です。

| 確認内容 | 結果 |
| --- | --- |
| 本体3パッケージ | コンテナ内でcolconビルド成功 |
| 回帰テスト | bridge 190件、vehicle control 28件、計218件成功 |
| 実KSPのIMU | 約12秒の観測で160件、異なるtimestampで継続受信 |
| 3D LiDAR | 104件、1フレーム1289点 |
| RGB画像 | 93件、320×240、rgb8、230400 bytes/フレーム |
| 機体モデル | 12リンクのURDF、`model_ready=true`、dynamic/static TF受信 |
| セッション | lifecycleとsimulatorのvessel ID一致、通信継続・UT進行を確認 |
| 指令の往復 | 移動指令を送らず、操作権取得→解放。KSPから`lease_acquired` / `lease_released`とsequence 1→2を受信し、Playerへ復帰 |
| ホストのJazzy / Fast DDS | 同じ機体のIMU・点群・画像・モデルをDDS経由で購読成功 |
| Compose | host networkで起動し、実KSPの`communication_alive=true`とUT進行を受信 |

実機確認には既存のLiDAR・カメラ付きローバー`rober B`を使用し、原本セーブのコピーをローカル開発用ランチャーでFlightへ進めました。ランチャーを追加したローカルMODでの接続確認であり、コンテナと一般向け手順は`Development/`へ依存しません。最小受信機体をこの検証で新規組立したものではありません。飛行制御デモや全アクチュエータの作動は今回の確認範囲に含めません。

## トラブルシュート

| 症状 | 確認すること |
| --- | --- |
| Docker socketの`permission denied` | Docker権限と再ログインを確認 |
| `Address already in use` | ホスト・Space ROS・別コンテナのbridgeが49010/UDPを使っていないか確認 |
| `pylon-jazzy`の名前が使用中 | `docker ps -a`で確認し、以前の検証コンテナを停止 |
| `/pylon/status`しか見えない | KSPをFlightにし、MODの配置・Runtime.cfg・host networkを確認 |
| `ros2`やPyLoNの型が見つからない | `docker exec`に`/pylon-entrypoint.sh`を付ける |
| 点群が来ない | LiDARの電源・有効化・実際のSensor IDを確認 |
| ホストからTopicが見えない | domainとdiscovery範囲を揃え、`--no-daemon`で確認 |

この構成のモデル送信元はloopbackなので、`--allow-remote-models`を追加する必要はありません。別ホストとの通信は[モデル経路](../api/vessel-model.md)と[bridgeオプション](../reference/bridge-options.md)を確認してください。
