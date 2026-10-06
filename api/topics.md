# Topic一覧

Topicは、操作中の機体に属するものを`/ksp_vessel`、bridgeプロセス自身に属するものを`/pylon`へ分けています。表の方向はROS2ノードから見た方向です。

型名はROS 2の`パッケージ/msg/型名`形式で記載しています。型のリンクからフィールド・定数・元の定義へ辿れます。独自型の全一覧は[メッセージ・サービス型](/api/interfaces/)を参照してください。

## Bridge

| 方向 | Topic | 型 | QoS / 内容 |
|---|---|---|---|
| Publish | `/pylon/status` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / Transient Local。bridgeの稼働状態 |
| Publish | `/pylon/diagnostics` | [`diagnostic_msgs/msg/DiagnosticArray`](https://docs.ros.org/en/jazzy/p/diagnostic_msgs/msg/DiagnosticArray.html) | モーター診断とWrench配分残差 |

## IMU

センサーtimestampの間隔はKSPの物理時間を保持します。通信遅延やゲームの描画速度に合わせて飛行中にoffsetを飛ばしません。lifecycleはセンサーと独立したセッションheartbeatから生成します。`udp_bridge --disable-ground-truth`では真値Topicとworld TFの配信を完全に無効化できます。このモードの`VesselLifecycle.world_frame`は空です。`runtime_instance`・`runtime_epoch`・`runtime_generation`がKSP側のセッションを表し、`generation`と`origin_sequence`は機体切替・時刻巻き戻り・セッションtimeoutからの復帰時に更新されるROS側の世代番号です。

全機体で追加パーツ・設定なしに、操作中の機体の3軸ジャイロと3軸加速度計を出力します。機体切替時も同じTopicを使用します。

| 方向 | Topic | 型 | QoS / 内容 |
|---|---|---|---|
| Publish | `/ksp_vessel/imu/data_raw` | [`sensor_msgs/msg/Imu`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Imu.html) | Best Effort / Volatile / depth 10。物理サンプル更新時、最大30 Hz |

`header.frame_id=base_link`、軸はX前方・Y左・Z上。`angular_velocity` は慣性系に対するrad/s（KSPの回転物理座標系では惑星の自転分を加算）、`linear_acceleration` はm/s²の比力（慣性加速度−重力）です。Z上向きで静止していれば約+g、自由落下中は約0となります。KSPの `perturbation_immediate` を機体軸へ変換し、ノイズやバイアスは追加しません。絶対姿勢は測定しないため `orientation_covariance[0]=-1`、角速度・加速度の共分散は未知を表す全要素0です。[ROS IMU規約（REP-145）](https://www.ros.org/reps/rep-0145.html) の `imu/data_raw` に対応します。

タイムスタンプはKSPのシミュレーション時刻を既存bridge時計に写像します。Flight以外、物理演算停止（packed）、ポーズ中は新規測定を出力しません。ロード・機体切替・unpack直後は1サンプル待ちます。仮想センサーは機体重心の比力を機体軸で表すもので、個別パーツ位置の回転による加速度はモデル化しません。非アクティブ機体の個別Topicは作成しません。

## スタートラッカー

| 方向 | Topic | 型 | 内容 |
|---|---|---|---|
| Publish | `/ksp_vessel/star_tracker/<id>/state` | [`pylon_interfaces/msg/StarTrackerState`](/api/interfaces/msg/StarTrackerState) | 姿勢・共分散・valid・測定不能理由を同時配信 |
| Publish | `/ksp_vessel/star_tracker/<id>/attitude` | [`geometry_msgs/msg/QuaternionStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/QuaternionStamped.html) | 有効な慣性姿勢のみ |

専用パーツを取り付けると既定5 Hz、Reliable / Volatile / depth 10で配信します。位置は測定しません。`state.valid=false`時はquaternionが全0、共分散先頭が−1です。通信断でも`stale`状態を通知します。座標・制約・再捕捉・Topicの寿命は[スタートラッカー](../parts/star-tracker.md)を参照してください。

## 機体・モデル

| 方向 | Topic | 型 | QoS / 内容 |
|---|---|---|---|
| Publish | `/ksp_vessel/simulator/state` | [`pylon_interfaces/msg/SimulatorState`](/api/interfaces/msg/SimulatorState) | Reliable / Transient Local。pause・warp・packed・通信とUT進行 |
| Publish | `/ksp_vessel/simulator/universal_time` | [`std_msgs/msg/Float64`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/Float64.html) | KSP UT [s]。Reliable / Transient Local。pause中は同じ値、巻き戻り時は減少 |
| Subscribe | `/ksp_vessel/control/batch` | [`pylon_interfaces/msg/ControlBatch`](/api/interfaces/msg/ControlBatch) | Reliable。更新→姿勢→推力→分離を順序付きで送信 |
| Publish | `/ksp_vessel/control/snapshot` | [`pylon_interfaces/msg/ControlSnapshot`](/api/interfaces/msg/ControlSnapshot) | Reliable。同一frameの飛行・全エンジン・分離器。真値無効時は配信しない |
| Publish | `/ksp_vessel/health/power` | [`pylon_interfaces/msg/VehicleHealth`](/api/interfaces/msg/VehicleHealth) | 電力残量・容量・品質付き収支推定、2 Hz |
| Publish | `/ksp_vessel/health/thermal` | [`pylon_interfaces/msg/PartThermalState`](/api/interfaces/msg/PartThermalState) | パーツ別温度・上限・遮蔽・電力、2 Hz |
| Publish | `/ksp_vessel/lifecycle` | [`pylon_interfaces/msg/VesselLifecycle`](/api/interfaces/msg/VesselLifecycle) | Reliable / Transient Local。実機体IDとframe lifecycle |
| Subscribe | `/ksp_vessel/control/authority/command` | [`pylon_interfaces/msg/ControlAuthorityCommand`](/api/interfaces/msg/ControlAuthorityCommand) | Reliable。lease・SAS排他・e-stop |
| Publish | `/ksp_vessel/control/authority/state` | [`pylon_interfaces/msg/ControlAuthorityState`](/api/interfaces/msg/ControlAuthorityState) | Reliable / Transient Local。確定したowner |
| Subscribe | `/ksp_vessel/control/wrench_command` | [`pylon_interfaces/msg/BodyWrenchCommand`](/api/interfaces/msg/BodyWrenchCommand) | Reliable。lease-bound `base_link` Wrench |
| Subscribe | `/ksp_vessel/control/flight_command` | [`pylon_interfaces/msg/FlightControlCommand`](/api/interfaces/msg/FlightControlCommand) | Reliable。lease付きstock操舵入力・着陸脚 |
| Publish | `/ksp_vessel/ground_truth/flight` | [`pylon_interfaces/msg/FlightState`](/api/interfaces/msg/FlightState) | Best Effort。高度・軌道・燃料・接地状態とbody-frame地表軸。Ground Truth無効時は配信しない |
| Publish | `/ksp_vessel/control/wrench_feedback` | [`pylon_interfaces/msg/WrenchFeedback`](/api/interfaces/msg/WrenchFeedback) | requested / allocated / achieved / residual |
| Publish | `/ksp_vessel/ground_truth/pose` | [`geometry_msgs/msg/PoseStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/PoseStamped.html) | Best Effort。ENU位置・姿勢 |
| Publish | `/ksp_vessel/ground_truth/nearby_vessels` | [`pylon_interfaces/msg/NearbyVessels`](/api/interfaces/msg/NearbyVessels) | 自機と近隣機体の同時刻・同原点の絶対位置と速度。最大32機、2500 m以内、同天体・loaded/unpacked |
| Publish | `/ksp_vessel/ground_truth/twist` | [`geometry_msgs/msg/TwistStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/TwistStamped.html) | Best Effort。ENU速度 |
| Publish | `/ksp_vessel/ground_truth/twist_body` | [`geometry_msgs/msg/TwistStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/TwistStamped.html) | Best Effort。body速度 |
| Publish | `/ksp_vessel/ground_truth/frame_angular_velocity` | [`geometry_msgs/msg/Vector3Stamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/Vector3Stamped.html) | 惑星固定ENU軸の慣性系に対する回転角速度。評価器が慣性推定と比較するための情報 |
| Publish | `/ksp_vessel/ground_truth/acceleration` | [`geometry_msgs/msg/AccelStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/AccelStamped.html) | Best Effort。ENU加速度 |
| Publish | `/ksp_vessel/joint_states` | [`sensor_msgs/msg/JointState`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/JointState.html) | 全ROSサーボの状態 |
| Publish | `/ksp_vessel/robot_description` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / Transient Local。プロキシURDF |
| Publish | `/ksp_vessel/root_frame` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / Transient Local。RViz Fixed Frame名 |
| Publish | `/tf` | [`tf2_msgs/msg/TFMessage`](https://docs.ros.org/en/jazzy/p/tf2_msgs/msg/TFMessage.html) | Ground TruthとCoM基準proxy rootのdynamic TF |
| Publish | `/tf_static` | [`tf2_msgs/msg/TFMessage`](https://docs.ros.org/en/jazzy/p/tf2_msgs/msg/TFMessage.html) | proxy固定jointとsensor mount |

Ground TruthのENU軸は惑星固定です。真値の角速度もこの軸に対する値に揃え、KSP物理座標系の高度による切替に影響されません。IMUの慣性姿勢と比較する場合は`frame_angular_velocity`による座標回転と速度の輸送項を評価側で加えます。デモの推定器・制御器はこのTopicを購読しません。

## センサー

| 方向 | Topic | 型 |
|---|---|---|
| Publish | `/ksp_vessel/lidar_2d/<lidar_2d_id>/scan` | [`sensor_msgs/msg/LaserScan`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/LaserScan.html) |
| Publish | `/ksp_vessel/lidar_3d/<lidar_3d_id>/points` | [`sensor_msgs/msg/PointCloud2`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/PointCloud2.html) |
| Publish | `/ksp_vessel/camera/<camera_id>/image_raw` | [`sensor_msgs/msg/Image`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Image.html) |
| Publish | `/ksp_vessel/camera/<camera_id>/camera_info` | [`sensor_msgs/msg/CameraInfo`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/CameraInfo.html) |
| Publish | `/ksp_vessel/docking_ports/<id>/camera/image_raw` | [`sensor_msgs/msg/Image`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Image.html) |
| Publish | `/ksp_vessel/docking_ports/<id>/camera/camera_info` | [`sensor_msgs/msg/CameraInfo`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/CameraInfo.html) |

LiDARとRGBカメラのIDはVAB/SPHの`Edit ROS2 Sensor ID`で設定します。新規パーツには`lidar_2d_...`、`lidar_3d_...`、`camera_...`のIDが自動生成されます。センサーTopicは最初の完全なデータで作成され、inactive通知または`--topic-timeout-sec`の無通信で削除されます。

## 型付きアクチュエータ

個体ごとにTopicを作らず、種類ごとに1組の`command` / `state`を共有します。すべてのcommandは`id`フィールドで対象を指定し、stateにも送信元の`id`が入ります。stateの`name`は既存コード向けの同値エイリアスです。

| 対象 | Command Topic | State Topic | 型 |
|---|---|---|---|
| ROSサーボ／リニアモーター | `/ksp_vessel/actuators/servo/command` | `/ksp_vessel/actuators/servo/state` | [`pylon_interfaces/msg/MotorCommand`](/api/interfaces/msg/MotorCommand) / [`pylon_interfaces/msg/MotorState`](/api/interfaces/msg/MotorState) |
| KSP標準ホイール | `/ksp_vessel/actuators/wheel/command` | `/ksp_vessel/actuators/wheel/state` | [`pylon_interfaces/msg/WheelCommand`](/api/interfaces/msg/WheelCommand) / [`pylon_interfaces/msg/WheelState`](/api/interfaces/msg/WheelState) |
| Engine | `/ksp_vessel/actuators/propulsion/command` | `/ksp_vessel/actuators/propulsion/state` | [`pylon_interfaces/msg/EngineCommand`](/api/interfaces/msg/EngineCommand) / [`pylon_interfaces/msg/EngineState`](/api/interfaces/msg/EngineState) |
| RCSモジュール | `/ksp_vessel/actuators/rcs/command` | `/ksp_vessel/actuators/rcs/state` | [`pylon_interfaces/msg/RcsCommand`](/api/interfaces/msg/RcsCommand) / [`pylon_interfaces/msg/RcsState`](/api/interfaces/msg/RcsState) |
| デカプラー／フェアリング | `/ksp_vessel/actuators/separation/command` | `/ksp_vessel/actuators/separation/state` | [`pylon_interfaces/msg/SeparationCommand`](/api/interfaces/msg/SeparationCommand) / [`pylon_interfaces/msg/SeparationState`](/api/interfaces/msg/SeparationState) |

操作とTopicは常に`active_vessel`が対象です。正式commandはPyLoNが操作権を持っている間に実行され、`vessel_id / controller_id / lease_id / sequence`は省略時にbridgeが補完します。操作権は`STATE_PLAYER` / `STATE_PYLON`の二択で、緊急停止は独立フラグです。commandはReliable / Volatile / depth 10です。通常のstateはBest Effort / Volatile / depth 10、分離stateはReliable / Transient Local / depth 10です。

分離結果は`/ksp_vessel/actuators/separation/result` ([`pylon_interfaces/msg/SeparationResult`](/api/interfaces/msg/SeparationResult), Reliable / Transient Local)。再照会サービスは`/ksp_vessel/actuators/separation/get_result` ([`pylon_interfaces/srv/GetSeparationResult`](/api/interfaces/srv/GetSeparationResult))です。保持期間・identity・snapshotの扱いは[機体制御API](vehicle-control.md)を参照してください。

## ドッキングポート

| 方向 | Topic | 型 |
|---|---|---|
| Publish | `/ksp_vessel/docking_ports/<id>/state` | [`pylon_interfaces/msg/DockingPortState`](/api/interfaces/msg/DockingPortState) |
| Subscribe | `/ksp_vessel/docking_ports/<id>/command` | [`pylon_interfaces/msg/DockingPortCommand`](/api/interfaces/msg/DockingPortCommand) |

`<id>`の既定値は`docking_port_<persistentId>_<moduleIndex>`です。commandは`SELECT_CAMERA`、`STOP_CAMERA`、`RELEASE`を提供します。

## 主な起動引数

| 対象 | 引数 | 既定値 |
|---|---|---|
| 機体センサー | `--topic-prefix` | `/ksp_vessel` |
| bridge状態 | `--bridge-prefix` | `/pylon` |
| 診断 | `--diagnostics-topic` | `/pylon/diagnostics` |
| Wrench command | `--body-wrench-command-topic` | `/ksp_vessel/control/wrench_command` |
| Authority command | `--control-authority-command-topic` | `/ksp_vessel/control/authority/command` |
| Authority state | `--control-authority-state-topic` | `/ksp_vessel/control/authority/state` |
| Wrench feedback | `--wrench-feedback-topic` | `/ksp_vessel/control/wrench_feedback` |
| Vessel lifecycle | `--vessel-lifecycle-topic` | `/ksp_vessel/lifecycle` |
| Ground Truth | `--ground-truth-prefix` | `/ksp_vessel/ground_truth` |
| アクチュエータ | `--actuators-prefix` | `/ksp_vessel/actuators` |
| ドッキングポート | `--docking-ports-prefix` | `/ksp_vessel/docking_ports` |
| joint state | `--joint-states-topic` | `/ksp_vessel/joint_states` |
| URDF | `--robot-description-topic` | `/ksp_vessel/robot_description` |
| root frame | `--root-frame-topic` | `/ksp_vessel/root_frame` |

全オプションは`ros2 run pylon_bridge udp_bridge --help`で確認できます。
