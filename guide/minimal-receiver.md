# 最小受信確認用機体

**PyLoN Receiver**は、発射台に置いたままlifecycle・IMU・機体モデル・3D点群を確認するための3パーツ構成です。まず[Getting Started](getting-started.md)、[DockerのJazzy](docker.md)、または[Space ROS](space-ros.md)でMODとbridgeを導入してください。KSP 1.xのSandboxを使用します。

ここではVABで同じ構成を作って保存する手順を提供します。ダウンロード用の`.craft`や飛行済みセーブは付属しません。この組立手順の実KSPでの新規検証は未実施です。

## 部品と取り付け

日本語UIで探しにくい場合は、パーツ検索に表の英語名の一部を入力してください。

| 部品 | 個数 | 取り付け・役割 |
| --- | ---: | --- |
| Mk1 Lander Can（Mk1ランダー缶） | 1 | 最初に配置してルートにする。広い底面を下にし、クルー1名を搭乗させる |
| Z-100 Rechargeable Battery Pack | 1 | ポッドの側面に取り付け、Electric Chargeを満量にする |
| PyLoN LiDAR 3D | 1 | ポッドの別の側面へ表面取り付けし、ドームを機体の外側へ向ける |

1. VABで新規機体を作り、上の順に3パーツを取り付けます。対称配置は使わず各1個にします。底面より下へ部品をはみ出させないでください。
2. LiDARのドーム側の前方半球に地面が入る向きにします。バッテリーやポッドで視野をふさがないでください。
3. LiDARを右クリックし、`Edit ROS2 Sensor ID`を`front_lidar`にします。LiDARとUDP配信を有効にし、Medium（100 m）、10 Hzを使います。
4. 機体名を`PyLoN Receiver`として保存し、クルー1名を確認してLaunchします。エンジン・燃料タンク・分離器・RCS・カメラは追加不要です。
5. Flightでポーズを解除し、時間倍率を1倍にします。受信確認中は機体を切り替えず、バッテリー残量が0になっていないことを確認します。

この機体は受信確認用です。制御デモや`setpoint_controller`は起動せず、Spaceキーによるステージ操作も不要です。長時間使う場合は電源を別途用意し、まずは短時間の受信を確認してください。

## DockerのJazzyで受信を確認する

[Getting Startedの手順4](getting-started.md#start-bridge)で`pylon-jazzy`コンテナを起動したまま、別ターミナルで実行します。`hz`は数行確認するたびにCtrl+Cで終了します。

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo --once --qos-durability transient_local /pylon/status
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/lifecycle
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/lidar_3d/front_lidar/points
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo --once --qos-durability transient_local /ksp_vessel/root_frame
```

## Space ROSで受信を確認する

ホストのbridgeを終了してから、PyLoNリポジトリのルートで`./spaceros.sh run`を実行します。別ターミナルも同じルートへ移動し、コンテナ内のROS CLIで確認します。ホストのJazzyをsourceする必要はありません。

```bash
./spaceros.sh exec ros2 topic echo --once --qos-durability transient_local /pylon/status
./spaceros.sh exec ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/lifecycle
./spaceros.sh exec ros2 topic hz /ksp_vessel/imu/data_raw
./spaceros.sh exec ros2 topic hz /ksp_vessel/lidar_3d/front_lidar/points
./spaceros.sh exec ros2 topic echo --once --qos-durability transient_local /ksp_vessel/root_frame
```

## 成功条件と切り分け

| 観測 | 合格の目安 |
| --- | --- |
| bridge | `/pylon/status`に`listening`。これだけではKSPからの受信成功ではない |
| lifecycle | `state: 1`（ACTIVE）、空でない`vessel_id`・`runtime_epoch` |
| IMU・点群 | それぞれ`average rate`が継続表示される。LiDAR設定は10 Hzだが、実測はKSPの実行速度にも依存 |
| 機体モデル | 読込み後に`model_ready: true`、空でない`root_frame` |

点群TopicがあるのにRVizで何も見えない場合は、空を向いていないか、地面が100 m以内の視野にあるかを確認します。RVizでは`Fixed Frame: base_link`と`Best Effort`を使います。機体がぐらつく場合はVABへ戻り、底面の接地を妨げる部品を移動してください。

確認できたらbridgeをCtrl+Cで終了し、[アプリケーション開発](application-development.md)または[デモ一覧](../demos/index.md)へ進みます。デモ用機体は各ガイドで別途準備します。
