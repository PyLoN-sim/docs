---
title: Getting Started
description: Ubuntu 24.04とROS 2 Jazzyの準備から、PyLoN MODのビルド・インストール、bridgeの起動、KSPのセンサーデータ受信まで。
---

# Getting Started

PyLoNを初めて使うための導入手順です。**Ubuntu 24.04の同じPCでKSPとROS2を動かし、機体情報と3D LiDARの点群を受信する**ところまで進めます。

最初に必要なソフトを導入し、PyLoNのソースからMODとROS2パッケージをビルドします。コマンドはbash用です。すでに完了している準備は飛ばしてください。

## 最初に実行環境を選ぶ {#choose-environment}

| 使う構成 | 読む順序 | ホストに必要なROS |
| --- | --- | --- |
| Jazzyだけ | このページの1〜7 → [アプリケーション開発](application-development.md)または[デモ](../demos/index.md) | ROS 2 Jazzy |
| Space ROSだけ | このページの「Ubuntu・Steam/KSPの前提」と手順2 → [Space ROSの準備・ビルド・起動](space-ros.md) → [最小受信機体](minimal-receiver.md) | 不要。ROSコマンドはコンテナ内で実行 |
| Space ROSのbridge＋ホストJazzyのアプリ・RViz | まずこのページの1〜7でJazzyの受信を確認 → ホストbridgeを終了 → [Space ROS](space-ros.md) → 同ページの「ホストのROS 2から使う」 | ROS 2 Jazzyと同じ版の`pylon_interfaces` |

Space ROSだけを使う場合は、このページのホスト向けROSインストール・rosdep・通常の`./sync.sh`・ホストbridge起動を飛ばします。ホストにはKSPとMODを置き、MODをソースから作る場合だけ.NET SDKとビルドツールを用意します。配布済みMODを使う場合は.NET SDKも不要です。

併用時もKSPのUDPを受け取るbridgeは**1つ**です。ホストとコンテナで同じ49010/UDPを同時にbindしません。ビルド成果物も共用せず、各環境でビルドします。

## 1. 必要なものを準備する

| 必要なもの | この手順での用途 |
| --- | --- |
| Ubuntu 24.04、x86_64 PC | KSPとROS2を動かす環境 |
| KSP 1.xのインストール | ゲームの実行と、MODビルド時のDLL参照 |
| ROS 2 Jazzy、システムのPython 3.12 | bridgeの実行とROSメッセージの生成 |
| .NET SDK 8.0 | KSP用の`PyLoN.dll`をビルド |
| Git、ビルドツール、colcon、rosdep、rsync | ソース取得、依存解決、ビルド、インストール |

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

ROS 2 JazzyのUbuntu向けバイナリも24.04を対象にしています（[公式インストール手順](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html)）。別のUbuntu版にこのページのaptコマンドをそのまま適用しないでください。

RVizでの可視化やデモの実行環境は、受信確認の後に追加できます。

### Ubuntuの基本ツールと.NET SDK

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

### ROS 2 Jazzyのインストール

まずROS2のapt配布元を登録します。以下は公式の`ros2-apt-source`パッケージを取得する手順です。配布元の構成が変わった場合は、[ROS 2 Jazzyの公式手順](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html)に従ってください。登録方法は[公式ドキュメントのソース](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Installation/_Apt-Repositories.rst)でも確認できます。

```bash
PYLON_ROS_APT_VERSION=$(curl --fail --silent --show-error \
  https://api.github.com/repos/ros-infrastructure/ros-apt-source/releases/latest \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["tag_name"])')
curl --fail --location --output /tmp/pylon-ros2-apt-source.deb \
  "https://github.com/ros-infrastructure/ros-apt-source/releases/download/${PYLON_ROS_APT_VERSION}/ros2-apt-source_${PYLON_ROS_APT_VERSION}.noble_all.deb"
sudo dpkg --install /tmp/pylon-ros2-apt-source.deb
sudo apt update
sudo apt install -y ros-jazzy-ros-base ros-dev-tools
```

`ros-base`にROSの実行環境、`ros-dev-tools`にcolconやrosdepなどの開発ツールが含まれます。すでに`ros-jazzy-desktop`を導入済みなら、その環境を使えます。[ROS2のパッケージ構成](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Installation/Ubuntu-Install-Debs.rst)

```bash
source /opt/ros/jazzy/setup.bash
printenv ROS_DISTRO
python3 -c 'import rclpy; print("rclpy OK")'
command -v colcon
command -v rosdep
```

`jazzy`、`rclpy OK`、各コマンドのパスが表示されることを確認します。別のROSディストリビューションやConda・venvを有効にしたシェルは使わず、UbuntuのPythonで作業してください。

## 2. ソースとインストール先を用意する

```bash
mkdir -p ~/src
git clone https://github.com/PyLoN-sim/PyLoN.git ~/src/PyLoN
cd ~/src/PyLoN

export KSPDIR="$HOME/.local/share/Steam/steamapps/common/Kerbal Space Program"
export ROS2_WS="$HOME/ros2_ws"
mkdir -p "$ROS2_WS/src"
```

GitHubのリポジトリURLは現在のものを使い、ローカルの取得先を`PyLoN`にしています。取得済みなら、そのリポジトリへ移動してください。

`KSPDIR`は`GameData`の一つ上のフォルダです。別ドライブのSteamライブラリや手動インストールでは、実際の場所に変更します。Steamの「管理」→「ローカルファイルを閲覧」から確認できます。空白を含むのでパスは引用符で囲みます。

```bash
ls "$KSPDIR/GameData"
ls "$KSPDIR/KSP_x64_Data/Managed/Assembly-CSharp.dll"
```

一部の構成では後者が`KSP_Data/Managed/Assembly-CSharp.dll`にあります。ビルドスクリプトは両方を検索します。`ROS2_WS`にはJazzy用のワークスペースを指定してください。他のROS版でビルドしたものと共用しないでください。

## 3. 本体の依存パッケージを入れる

rosdepを初期化し、PyLoNの`package.xml`から必要な依存を導入します。初期化はPCにつき一度です。[rosdepの使い方](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Tutorials/Intermediate/Rosdep.rst)

```bash
source /opt/ros/jazzy/setup.bash
if [ ! -f /etc/ros/rosdep/sources.list.d/20-default.list ]; then
  sudo rosdep init
fi
rosdep update

# PyLoNリポジトリのルートで実行
rosdep install --from-paths \
  Ros2/pylon_interfaces Ros2/pylon_bridge Ros2/pylon_vehicle_control \
  --ignore-src --rosdistro jazzy -y
```

`--ignore-src`により、このリポジトリからビルドするPyLoNパッケージはaptで探しません。本体の3パッケージだけを指定するので、デモ用のNav2や点群処理ライブラリはこの段階では入りません。

## 4. MODとROS2パッケージをビルド・インストールする

配布版MODを使う場合は、[Releases](https://github.com/PyLoN-sim/PyLoN/releases)の`PyLoN-vX.Y.Z.zip`を展開し、`GameData/PyLoN`をKSPの`GameData`へコピーします。「Source code」アーカイブにはビルド済みMODは含まれません。更新前にインストール先の`Config/Runtime.cfg`を控えてください。ROS2側だけをビルド・同期するには`./sync.sh --skip-ksp-build --skip-ksp-sync`を使います。

以下はMODもソースからビルドする場合の手順です。

**KSPを終了した状態**で、リポジトリのルートから実行します。

```bash
./sync.sh
```

このコマンドは次の処理を行います。`sudo`は付けず、KSPとワークスペースを書き込めるユーザーで実行してください。

1. KSPのManaged DLLを参照して`PyLoN.dll`をビルドする。
2. `GameData/PyLoN`を`$KSPDIR/GameData/PyLoN`へ同期する。
3. 本体3パッケージを`$ROS2_WS/src`へ同期し、colconでビルドする。

`GameData/`はGit管理外で、ソース取得直後には存在しません。ビルド時に`Assets/PyLoN`の原本と生成DLLから作られます。最後に`PyLoN sync complete`と3パッケージの名前が表示されたら、配置を確認します。

```bash
test -f "$KSPDIR/GameData/PyLoN/Plugins/PyLoN.dll" && echo "MOD installed"
source "$ROS2_WS/install/setup.bash"
ros2 pkg prefix pylon_interfaces
ros2 pkg executables pylon_bridge
```

`MOD installed`、ワークスペース内のパス、`pylon_bridge udp_bridge`が表示されれば成功です。KSP側は次の配置になります。

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

WindowsのKSP用にビルドする場合は、.NET SDKを導入したPowerShellから次を実行できます。ROS2の導入・起動は、このガイドではUbuntu側を対象にしています。

```powershell
.\build.ps1 -KspDir "C:\SteamLibrary\steamapps\common\Kerbal Space Program"
```
:::

## 5. ROS2 bridgeを起動する

新しいターミナルAを開きます。以降、**ROSコマンドを使うターミナルごとに**ROS本体とPyLoNワークスペースを読み込みます。独自のワークスペースを指定した場合は`~/ros2_ws`を置き換えてください。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 run pylon_bridge udp_bridge --host 127.0.0.1 --port 49010
```

`Listening on udp://127.0.0.1:49010`が表示され、このターミナルが実行中のままになれば正常です。KSPはまだ起動していなくても構いません。

ターミナルBでbridgeの起動を確認します。`/pylon/status`は最後の値を保持するTopicなので、保存された値を取得するQoSを指定します。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 topic echo --once --qos-durability transient_local /pylon/status
```

```yaml
data: listening
```

bridgeはデータの中継を担当します。この起動だけでは機体へ移動目標は送りません。姿勢・位置制御は[機体制御API](../api/vehicle-control.md)または後述のデモから利用します。

## 6. KSPでセンサーを載せた機体を出す

[最小受信確認用機体「PyLoN Receiver」](minimal-receiver.md)を組み立てます。Mk1ランダー缶、Z-100バッテリー、PyLoN LiDAR 3Dの**3パーツ**を使う、発射台に置いたまま受信するための機体です。リンク先に取り付け位置・Sensor ID・確認条件をまとめています。

保存後にLaunchでFlightへ移り、ポーズ解除・通常速度（1倍）にしてください。点火・分離・周回デモはまだ実行しません。Sensor IDは以下のコマンドと一致する`front_lidar`を使います。

センサーパーツがなくても、操作機体のlifecycle・IMU・機体モデルは独立して配信されます。LiDARとカメラのTopicは、対応するセンサーから最初のデータを受信した時点で作成されます。

## 7. 機体情報と点群を受信する

ターミナルBで順に確認します。`hz`は計測を続けるので、数行表示されたら`Ctrl+C`で次へ進みます。

```bash
ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/lifecycle
ros2 topic hz /ksp_vessel/imu/data_raw
ros2 topic list
ros2 topic hz /ksp_vessel/lidar_3d/front_lidar/points
ros2 topic echo --once --qos-durability transient_local /ksp_vessel/root_frame
```

| 確認対象 | 成功の目安 |
| --- | --- |
| lifecycle | `state: 1`（ACTIVE）、空でない`vessel_id`・`runtime_epoch` |
| 機体モデル | 読込み後にlifecycleの`model_ready: true`、空でない`root_frame` |
| IMU | `average rate`が継続表示される |
| 3D LiDAR | `points` Topicがあり、`average rate`が継続表示される |

点群の周期はセンサー設定やゲームの実行速度で変わります。自動IDを使った場合は`ros2 topic list`に出た実際の名前へ置き換えてください。2D LiDARは`/ksp_vessel/lidar_2d/<sensor_id>/scan`、RGBカメラは`/ksp_vessel/camera/<sensor_id>/image_raw`に出力します。

真値を入力しない構成では、ターミナルAのbridgeを`Ctrl+C`で終了してから次で起動し直します。lifecycle・IMU・機体モデルはそのまま利用でき、真値Topicとworld TFが無効になります。

```bash
ros2 run pylon_bridge udp_bridge --host 127.0.0.1 --disable-ground-truth
```

::: details RVizで点群を表示する（任意）
```bash
sudo apt install -y ros-jazzy-rviz2
rviz2
```

`Global Options`の`Fixed Frame`を`base_link`にし、`Add` → `By topic`から`/ksp_vessel/lidar_3d/front_lidar/points`を選びます。PointCloud2表示のReliability Policyは`Best Effort`にします。センサーの取り付けTFを受信すると、機体基準の点群が表示されます。
:::

## 8. デモを動かす

受信を確認できたら、[デモ一覧](../demos/index.md)から試したいデモを選んでください。各ページに追加パッケージの導入、機体準備、bridgeとデモの起動順、動作確認、停止方法をまとめています。

- [軌道上のデブリ周回・撮影](../demos/debris-orbit.md)
- [2D LiDARとSLAM](../demos/lidar-slam.md)：地図作成・保存・Nav2走行
- [月面Nav2](../demos/mun-nav2.md)

## 別のPCでKSPを動かす場合

例として、KSP側を`192.168.1.50`、Ubuntuのbridge側を`192.168.1.60`とします。KSPを終了して、**インストール先**の`GameData/PyLoN/Config/Runtime.cfg`を編集します。

```text
PYLON_TRANSPORT
{
    stateHost = 192.168.1.60
    statePort = 49010
    commandPort = 49011
}
PYLON_MODEL
{
    enabled = true
    allowRemoteUrdf = true
    refreshSeconds = 2
    chunkBytes = 12000
    maxChunks = 256
}
```

Ubuntu側では次で起動します。

```bash
ros2 run pylon_bridge udp_bridge \
  --host 0.0.0.0 --port 49010 \
  --command-host 192.168.1.50 --command-port 49011 \
  --allow-remote-models
```

| 向き | UDPの宛先 |
| --- | --- |
| KSP → bridge：センサー・機体情報 | `192.168.1.60:49010` |
| bridge → KSP：制御指令 | `192.168.1.50:49011` |

モデルの転送にはKSP側の`allowRemoteUrdf`とbridge側の`--allow-remote-models`の両方が必要です。これは信頼できるLAN内で使用してください。ファイアウォールも必要な相手からのUDP受信を許可します。同じPCの場合は既定の`127.0.0.1`とremoteモデル無効の設定を使用できます。

## うまく動かないとき

| 症状 | 最初に確認すること |
| --- | --- |
| `dotnet: command not found` | SDKの導入と`dotnet --list-sdks` |
| KSPのManaged DLLが見つからない | `KSPDIR`が`GameData`の親を指しているか |
| `Package 'pylon_bridge' not found` | ビルド成功後、そのターミナルで`install/setup.bash`をsourceしたか |
| `No module named rclpy` | Jazzyのsetup、システムPython、Conda・venvの状態 |
| UDPポートが使用中 | 別のbridgeや、bridgeを含むデモを二重起動していないか |
| MODのパーツがない | `Plugins/PyLoN.dll`と`Parts`の配置、KSPを再起動したか |
| bridgeは動くがlifecycleがACTIVEにならない | 操作機体でFlight中か、UDPの送信先と受信先が一致しているか |
| lifecycleはACTIVEだが点群がない | LiDARとUDPの有効化、実際のSensor ID、ポーズ状態 |

更新時はKSPを終了し、`./sync.sh`を再実行してからKSPとbridgeを再起動します。デモも更新する場合は同じ`--demo`指定か`--all-demos`を付けます。詳しくは[トラブルシュート](../reference/troubleshooting.md)、設定項目は[bridge起動オプション](../reference/bridge-options.md)を参照してください。

## 次のステップ

[ROS2アプリケーションを作る](application-development.md)へ進み、受信したデータを自分のノードで利用してください。メッセージ型とTopicの一覧は[APIリファレンス](../api/topics.md)を参照できます。
