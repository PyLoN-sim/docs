# 軌道上のデブリ周回・撮影

先に[共通準備](index.md)で本体とdemosをcloneしてください。コマンドはPyLoN本体のルートで実行します。

3D LiDARとIMUで近くのデブリとの相対運動を推定し、RCSで周回しながら機体カメラで撮影します。実際の周回試験で使用した機体を`.craft`として同梱しているので、VABで読み込んで準備します。

![Kerbin軌道上で、太陽電池を展開した自機と分離済みのタンク・エンジンを撮影したKSP画面](images/debris-orbit/ksp-orbit.png)

中央下の太陽電池を広げた機体が自機、右上のタンクとエンジンが撮影対象です。このページの画像は2026-09-07のKSP 1.12.5での実行記録です。

## 1. Pythonデモの実行環境を準備する

[Getting Started](../guide/getting-started.md)でMODとbridgeを導入した後、PyLoNリポジトリのルートで実行します。

```bash
source /opt/ros/jazzy/setup.bash
sudo apt install python3-numpy python3-scipy python3-yaml \
  ros-jazzy-sensor-msgs-py ros-jazzy-tf2-ros-py ros-jazzy-nav-msgs \
  ros-jazzy-visualization-msgs
rosdep install --from-paths \
  Ros2/pylon_interfaces Ros2/pylon_bridge Ros2/pylon_vehicle_control \
  --ignore-src --rosdistro jazzy -y
./sync.sh --skip-ksp-build --skip-ksp-sync --demo debris_orbit
source ~/ros2_ws/install/setup.bash
```

このデモはament_pythonを使わず、Pythonソースから起動します。同期は本体のROSパッケージをビルドし、デモのソースをコピーします。デモ自身のcolconビルドやpip installは不要です。

## 2. 同梱の機体をKSPで読み込む

機体ファイルはdemosリポジトリの[`pylon_demo_debris_orbit/craft/PyLoN Debris Orbiter.craft`](https://github.com/PyLoN-sim/demos/blob/main/pylon_demo_debris_orbit/craft/PyLoN%20Debris%20Orbiter.craft)です。試験機`test A`のパーツ配置とセンサー設定を引き継ぎ、旧MODの識別名を現行PyLoNへ変換しています。KSPのstockパーツとPyLoNが必要です。

KSPを終了してから、PyLoN本体のルートで次を実行します。`SAVE`を使用する既存のsandboxセーブのフォルダー名へ置き換えてください。既存の同名ファイルは上書きしません。

```bash
KSPDIR="$HOME/.local/share/Steam/steamapps/common/Kerbal Space Program"
SAVE='ROS2 debug'
cp -n '../demos/pylon_demo_debris_orbit/craft/PyLoN Debris Orbiter.craft' \
  "$KSPDIR/saves/$SAVE/Ships/VAB/"
```

KSPでそのセーブを開き、VABの機体読み込みから **PyLoN Debris Orbiter** を選びます。Mk1ランダー缶にクルーを1名乗せてください。

| 搭載済みのもの | 確認する設定・用途 |
|---|---|
| RCSブロック8個・モノプロペラントタンク | 周回中の並進・姿勢制御 |
| 太陽電池2枚 | 軌道上で展開して電源を確保 |
| 3D LiDAR | Sensor ID `front_lidar`、Long、250 m、10 Hz |
| RGBカメラ | Sensor ID `orbit_camera`、5 Hz、垂直画角60度 |
| デカプラーの先のX200-32タンク＋Mainsail | 分離して撮影対象にする |

### 分離前の状態を保存する

`.craft`に含まれるのは機体設計です。軌道上の位置・速度や分離状態は保存されていません。同梱機体は軌道上の周回試験用で、地上からの打ち上げ用ロケットとしては検証していません。

1. 自動制御デモを終了した状態で、VABからFlightへ移ります。KSP標準のデバッグメニューの`Set Orbit`を使い、Kerbinの高度約100 kmの円軌道へ配置します。マップで近地点・遠地点がともに約100 kmであることを確認します。打ち上げから行う場合は、別途打ち上げ手段を用意してください。
2. 時間倍率を1倍に戻し、スロットルを0にしてMainsailを右クリックから停止します。分離後の対象が無推力になることを確認します。
3. 自機側の太陽電池を展開し、日照・Electric Charge・MonoPropellant残量を確認します。SASの姿勢保持などで回転を落ち着かせ、操縦キーから手を離します。
4. KSPの名前付き保存で`PyLoN Orbit - before separation`として保存します。これは分離からやり直すための保存です。通常のクイックセーブとは区別し、試行中に上書きしないでください。

### 分離して手動で相対運動を落ち着かせる

1. デカプラーの右クリックメニューでタンク・エンジンを分離します。保存済みステージにはエンジンも含まれるため、Spaceキーは使いません。
2. センサーを積んだMk1ランダー缶側を操作対象にします。分離物をターゲットに選び、ナビボールの速度表示を`Target`（相対速度）へ切り替えます。`Orbit`の数km/sは自機と対象の相対速度ではありません。
3. 自機のRCSを有効にし、短い並進入力で接近・離脱速度を落とします。長押しせず、入力後に相対速度を確認します。ターゲット方向へ機首を向けるだけでは制動になりません。
4. 開始時の目安として中心間距離を**20〜40 m**、相対速度を**0.25 m/s以下**へ調整します。機体表面同士の間隔を画面でも確認し、接触しそうな配置では先に離れます。これは準備時の目標値で、デモの動作保証範囲や自動開始条件ではありません。
5. LiDARとカメラを対象へ向け、各センサーとUDP配信が有効であることを確認します。Sensor IDは同梱機体に設定済みです。準備中はSASで姿勢を保持して構いません。

このデモは、近距離で共に自由落下する自機と無推力の対象を想定しています。周回半径の既定値は15 mです。LiDARで推定する中心は見えている表面の中心なので、KSPのターゲット距離とは一致しないことがあります。機体とデブリの大きさに合わせ、周回する空間全体に衝突の余裕を確保してください。

元機体での周回・撮影記録はありますが、現行PyLoN名へ変換した同梱ファイルのKSP再読み込み・再飛行、および今回記載した初期状態の再現手順は未検証です。軌道や分離状態を含む配布セーブは付属しません。以下の観測確認を通過した状態を、自分の環境で保存して再利用します。

## 3. bridgeを起動する

ターミナルAで実行します。bridgeはこの1プロセスを使います。Space ROSと併用する場合は、以下のホストbridgeの代わりに`./spaceros.sh run --disable-ground-truth`を使い、[併用設定](../guide/space-ros.md#ホストのros-2から使う)を行ってください。このページのデモと確認用CLIはホストJazzyで実行します。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 run pylon_bridge udp_bridge \
  --host 127.0.0.1 --port 49010 --disable-ground-truth
```

別ターミナルで入力を確認します。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/lifecycle
ros2 topic hz /ksp_vessel/lidar_3d/front_lidar/points
ros2 topic hz /ksp_vessel/imu/data_raw
ros2 topic hz /ksp_vessel/camera/orbit_camera/image_raw
```

`ros2 topic hz`は1つずつ実行し、確認したら`Ctrl-C`で終了します。機体状態がACTIVEで、点群・IMU・画像を受信できてから進みます。

### 制御を無効にして開始条件を確認する

ターミナルBで推定と表示だけを起動します。`--no-enabled`に加え、`--no-controller`を明示して制御ノードも起動しません。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
python3 ../demos/pylon_demo_debris_orbit/run.py \
  --no-enabled --no-controller --instance orbit_a \
  --lidar-sensor-id front_lidar --camera-sensor-id orbit_camera \
  --orbit-radius 15.0 --rviz
```

別のsource済みターミナルで、次のTopicを確認します。`echo`は確認ごとにCtrl+Cで終了します。

```bash
ros2 topic echo /ksp_vessel/demos/debris_orbit/orbit_a/estimator_status
ros2 topic echo /ksp_vessel/imu/data_raw --field angular_velocity
```

以下は再開用の状態を揃えるための**手動チェックの目安**です。コード側の自動判定や、実飛行で確認済みの性能値ではありません。1倍速・ポーズ解除で、操縦入力をやめてから10秒程度継続して確認してください。

| 確認対象 | 保存前の目安 |
| --- | --- |
| 推定器 | `state: tracking`が継続し、`observations`が増える。RVizの対象クラスタが実際の分離物に対応する |
| 対象距離 | `range_m`がおおむね20〜40 m。画面でも接触の余裕がある |
| 相対速度 | `relative_speed_mps`が0.25以下で、急に増えない |
| 自機の角速度 | IMUの`angular_velocity`の大きさ`√(x²+y²+z²)`が0.035 rad/s（約2度/s）以下 |
| 入力・資源 | 点群・IMU・画像が継続し、電力・推進剤が残り、対象が噴射していない |

`tracking`にならない場合は、LiDARの向き・距離・遮蔽を確認します。この確認モードでは自動探索回転も行いません。相対速度が下がらない、対象が急回転している、離れ続ける場合は自動制御を開始せず、手動で調整するか分離前の保存へ戻ります。

### 分離後の初期状態を保存する

条件を満たしたら、推定表示のプロセスをCtrl+Cで終了し、KSPを一時停止して名前付き保存`PyLoN Orbit - ready`を作ります。分離前の保存とは別名にします。**`.craft`だけを保存しても、この状態には戻れません。**

保存名と一緒に、KSP/PyLoN/demosのバージョンまたはコミット、近地点・遠地点、対象、距離・相対速度・角速度、電力・推進剤残量、Sensor ID、周回半径を控えます。ソースのコミットはそれぞれのリポジトリで`git rev-parse HEAD`で確認できます。

保存後はポーズを解除してセンサー受信を確認し、次の自動制御プロセスを新しく起動します。推定だけのプロセスは残さないでください。

## 4. 周回を開始する

ターミナルBで実行します。`--enabled`を指定すると機体の制御を開始します。RCSを有効にし、以降は手動入力・機体切替・時間倍率変更を行わないでください。Flight画面の`ROS`ボタンから`ROS2 control ON`を選びます。KSP側がSASを停止し、デモは権限取得・更新・解放Topicを送信しません。指令のcontroller/lease IDとsequenceはbridgeが補完します。既定速度は6 deg/s（約1分/周）です。

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
python3 ../demos/pylon_demo_debris_orbit/run.py \
  --enabled --instance orbit_a \
  --lidar-sensor-id front_lidar --camera-sensor-id orbit_camera \
  --orbit-radius 15.0 --rviz
```

対象を見つけるまでは機体を回して探索します。点群から3回続けて対象を取得すると、対象への指向・接近を始め、指定半径へ到達後に周回します。RVizでは点群、対象クラスタ、対象中心、自機、目標半径、軌跡を確認できます。

![RVizで対象の点群を中心に自機の推定軌跡が一周している画面](images/debris-orbit/rviz-orbit.png)

水色の点群が対象、灰色の円が目標半径、オレンジ色の線が自機の推定軌跡です。点群を捕捉できているか、軌跡が対象の周囲を回っているかを確認します。

推定と表示だけを試す場合は、上のコマンドの`--enabled`を`--no-enabled --no-controller`へ置き換えます。

## 5. 状態と撮影結果を確認する

```bash
ros2 topic echo /ksp_vessel/demos/debris_orbit/orbit_a/status
ros2 topic echo /ksp_vessel/demos/debris_orbit/orbit_a/estimator_status
ros2 topic echo /ksp_vessel/demos/debris_orbit/orbit_a/controller_status
```

`--instance`を変更した場合は、Topic内の`orbit_a`も置き換えます。

周回開始位置を0度とし、36度ごとにPNGと計測JSONを保存します。保存先はデモを起動したディレクトリからの相対パスで、`pylon_demo_debris_orbit_captures/orbit_a/<起動日時>/`です。既定では2周目以降も撮影を続けます。

![搭載カメラが0度から324度まで36度おきに撮影したデブリの10枚の画像](images/debris-orbit/camera-sequence.png)

搭載カメラの撮影例です。上段左から0〜144度、下段左から180〜324度で、対象を見る方向と背景のKerbinが変わります。この一覧は保存されたPNGを説明用に並べたもので、デモは個別のPNGとJSONを出力します。

画像の時刻と推定角度を照合し、指定角度の前後、既定±2度以内の画像を保存します。画像が航法更新より先に届く場合も、短い履歴で画像時刻を照合します。`capture_missed`の場合は画像配信の周期と遅延を確認してください。

## 停止と再開

デモのターミナルで`Ctrl-C`を押すと、制御指令をゼロにします。手動操作へ戻るときはKSPの`ROS2 control OFF`を選びます。終了後にbridgeも`Ctrl-C`で停止できます。

機体切替、制御権喪失、入力欠測後は停止を保持します。IMUが0.5秒を超えて途切れた場合も、機体を安定させてからデモのプロセス全体を起動し直してください。

### 保存した初期状態から再試行する

1. デモのプロセス全体をCtrl+Cで終了し、bridgeも停止します。停止したデモのプロセスが残っていないことを確認します。
2. KSPで名前付き保存`PyLoN Orbit - ready`を読み込みます。分離からやり直す場合は`before separation`を選びます。
3. 自機が操作対象で、対象・軌道・センサー設定・電力・推進剤が保存時の状態に戻っていることを確認します。ポーズ解除、時間倍率1倍にします。
4. 手順3のbridgeを起動し直し、新しいlifecycleがACTIVEになったこととセンサーの受信を確認します。
5. **制御を無効にしたデモ**で10秒程度の開始条件確認を再実施し、そのデモを終了してから手順4の自動制御を開始します。

ロードではシミュレーション時刻が巻き戻ります。前の推定器・制御器を残して使い回さず、3ノード全体を再起動してIMUの基準とセッションを揃えてください。名前付き保存はKSP側の状態を復元しますが、ROSノードの推定状態は復元しません。同じ条件からやり直すための手順であり、毎回まったく同じ軌跡になる保証ではありません。

## 主な起動引数

| 引数 | この手順の値 | 用途 |
|---|---|---|
| `--enabled` / `--no-enabled` | `--enabled` | 周回制御を開始／無効化 |
| `--instance` | `orbit_a` | Topicと撮影ディレクトリの識別名 |
| `--lidar-sensor-id` / `--camera-sensor-id` | `front_lidar` / `orbit_camera` | 搭載センサーのID |
| `--orbit-radius` | `15.0` | 周回半径［m］ |
| `--angular-speed-deg-s` | `6.0` | 角速度［deg/s］、約60秒/周 |
| `--rviz` | 指定する | RVizを起動 |
| `--no-controller` | 制御時は指定しない | 推定・表示だけを起動 |
| `--config` | ソース同梱YAML | 推定・誘導・撮影設定を変更 |

設定ファイルはリポジトリの`../demos/pylon_demo_debris_orbit/config/pylon_demo_debris_orbit.yaml`です。機体への指令とKSP側制御ON/OFFは[機体制御API](../api/vehicle-control.md)、画像の設定は[RGBカメラ](../parts/camera.md)を参照してください。


## Python版の構成と実飛行確認

位置・姿勢認識は`debris_orbit/recognition.py`、目標姿勢は`debris_orbit/attitude.py`、目標推力は`debris_orbit/thrust.py`に分かれています。3ノードは通常1つのPythonプロセスで実行します。詳細は[デモREADME](https://github.com/PyLoN-sim/demos/blob/main/pylon_demo_debris_orbit/README.md)を参照してください。

2026-10-06の更新後はKSPの`ROS2 control ON`で権限操作Topicを送らずに実飛行を確認しました。
半径15 m・目標6 deg/sで一周は約64秒、三周目まで28枚を保存し、二・三周目は各10枚が揃いました。
最大撮影角誤差は1.99度です。初周にはカメラ受信間隔による2地点の欠番があり、長時間の無中断運転は未確認です。
別試験で約1秒の入力受信空白による停止保持、KSPのOFF→ONでも自動再開しない動作を確認しました。

従来の1 deg/s設定では、2026-10-06にLinux版KSP 1.12.5・ROS 2 Jazzy・PyLoNで、分離済みの軌道上セーブの検証コピーを使って一周と2周目の撮影を確認しました。`front_lidar` / `front_camera`、半径15 m・角速度1 deg/sで推定508度まで進み、36度ごとに15枚保存しました。最大撮影角誤差は0.82度です。約9分後には約1秒のセンサー受信空白で欠測ガードが作動し、停止・制御権返却しました。長時間の無中断運転と、同梱craftの新規読み込み・分離からの手順は未確認です。
