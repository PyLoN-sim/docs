---
title: Getting Started
description: 配布版のPyLoN MODとDockerイメージを導入し、KSPから機体情報と3D LiDARの点群を受信する最小手順。
---

# Getting Started

**配布版のPyLoN MODとDockerイメージを使い、KSPから機体情報と3D LiDARの点群を受信する**までの手順です。KSPとMODはホストで、ROS 2 JazzyとPyLoN bridgeはDocker内で動かします。

## 1. KSPとDockerを準備する {#prerequisites}

このガイドはUbuntu Desktop 24.04 LTS・x86_64上で、Linux版KSP 1.xとDocker Engineを同じPCで動かす構成を対象にします。KSP 1.12.5での接続確認があります。

1. [KSP](https://store.steampowered.com/app/220200/Kerbal_Space_Program/)をインストールして起動し、Sandboxセーブを作成します。DLCや他のMODは不要です。
2. KSPを終了し、Steamの「管理」→「ローカルファイルを閲覧」でインストール先を確認します。
3. [Docker公式のUbuntu向け手順](https://docs.docker.com/engine/install/ubuntu/)でDocker Engineを導入します。[インストール後の権限設定](https://docs.docker.com/engine/install/linux-postinstall/)も済ませ、次でServer情報が表示されることを確認します。

```bash
docker version
```

## 2. PyLoN MODをインストールする {#install-mod}

**KSPを終了した状態**で、[Releases](https://github.com/PyLoN-sim/PyLoN/releases)から`PyLoN-vX.Y.Z.zip`をダウンロードして展開し、中の`GameData/PyLoN`フォルダ全体をKSPの`GameData`へコピーします。「Source code」アーカイブにはビルド済みMODは含まれません。

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

`GameData/GameData/PyLoN`のように一段深く置かないでください。更新する場合は、既存の`Config/Runtime.cfg`を控えてからコピーします。初回は設定変更不要です。

## 3. Dockerイメージをダウンロードする {#download-image}

ROS 2 JazzyとPyLoN bridge入りのイメージを取得します。ホストへのROSのインストールは不要です。

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
```

::: info 配布イメージの公開準備
GHCRの初回ビルドとPackagesのPublic設定が完了するまではpullできません。公開準備の詳細は[Dockerの構成・運用](docker.md#配布タグとバージョン固定)を参照してください。
:::

MODとコンテナには対応する版を使います。バージョン固定も[Dockerの構成・運用](docker.md#配布タグとバージョン固定)で説明しています。イメージにKSP本体やMODは含まれません。

## 4. bridgeを起動する {#start-bridge}

ターミナルAで実行し、そのまま開いておきます。コマンドはbash用です。

```bash
docker run --rm -it --init --network host \
  --name pylon-jazzy \
  -e ROS_DOMAIN_ID=0 \
  ghcr.io/pylon-sim/pylon-bridge:jazzy
```

`Listening on udp://127.0.0.1:49010`と指令先`127.0.0.1:49011`が表示されれば待ち受けています。Linuxのhost networkで接続するため、MODの`Runtime.cfg`は既定のまま使えます。別のbridgeを実行している場合は先に停止してください。

## 5. KSPで機体を出す

KSPを起動し、[最小受信確認用機体「PyLoN Receiver」](minimal-receiver.md)を組み立てます。Mk1ランダー缶、Z-100バッテリー、PyLoN LiDAR 3Dの3パーツを使います。LiDARのSensor IDは`front_lidar`にします。

LaunchでFlightへ移り、ポーズ解除・通常速度（1倍）にしてください。発射台に置いたまま受信を確認できます。

## 6. 受信を確認する

別のターミナルBで順に実行します。`docker exec`にはROS環境を読み込む`/pylon-entrypoint.sh`を付けます。`hz`は数行表示されたらCtrl+Cで終了して次へ進みます。

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/simulator/state
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz \
  /ksp_vessel/lidar_3d/front_lidar/points
```

| 確認対象 | 成功の目安 |
| --- | --- |
| simulator | `communication_alive: true`、`simulation_advancing: true` |
| IMU・3D LiDAR | それぞれ`average rate`が継続表示される |

受信できない場合は[トラブルシュート](../reference/troubleshooting.md)、機体モデルなども確認する場合は[最小受信機体の確認手順](minimal-receiver.md)を参照してください。

## 停止と次のステップ

ターミナルAでCtrl+Cを押すか、次で停止します。次回は手順4から起動できます。

```bash
docker stop pylon-jazzy
```

更新・Compose・RVizとの接続は[Dockerの構成・運用](docker.md)、自分のノードを作る場合は[ROS2アプリケーションを作る](application-development.md)、実行例は[デモ一覧](../demos/index.md)を参照してください。

PyLoN本体を変更する場合の環境構築とビルドは[本体開発の手順](../contributing/index.md)にあります。Space ROSを使う場合は手順1〜2でKSP・Docker・MODを準備してから、[Space ROSで動かす](space-ros.md)へ進みます。
