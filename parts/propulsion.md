# エンジン / RCS

Flight中のactive vesselにあるKSP標準`ModuleEngines` / `ModuleEnginesFX`と`ModuleRCS` / `ModuleRCSFX`を自動検出します。専用パーツへの置き換えは不要です。

## 入出力Topic

| 方向 | Topic | 型 | 内容 |
|---|---|---|---|
| 入力 | `/ksp_vessel/actuators/propulsion/command` | [`pylon_interfaces/msg/EngineCommand`](/api/interfaces/msg/EngineCommand) | `id`で指定するEngine指令 |
| 出力 | `/ksp_vessel/actuators/propulsion/state` | [`pylon_interfaces/msg/EngineState`](/api/interfaces/msg/EngineState) | `id`付きEngine状態 |
| 入力 | `/ksp_vessel/actuators/rcs/command` | [`pylon_interfaces/msg/RcsCommand`](/api/interfaces/msg/RcsCommand) | `id`で指定するRCS指令 |
| 出力 | `/ksp_vessel/actuators/rcs/state` | [`pylon_interfaces/msg/RcsState`](/api/interfaces/msg/RcsState) | `id`付きRCS状態 |

## フェイルセーフとKSP制約

Engine指令は次の指令まで保持し、個別のタイマーはありません。制御権の解放・喪失、緊急停止、機体切替でoverrideを解除します。leaseの更新は引き続き必要です。Body WrenchとRCS指令には従来のtimeoutが適用されます。

再点火不可、停止不可、燃料切れ、stage条件、`throttleLocked`などKSP標準moduleの制約が優先されます。

## 型付きEngine Topic

Engine IDは`engine_<persistentId>_<moduleIndex>`です。commandはReliable、stateはBest Effortで、どちらもdepth 10です。

| EngineCommand field | 単位 | 内容 |
|---|---|---|
| `header` | — | 現行bridgeでは指令変換に使用しない |
| `vessel_id` / `controller_id` / `lease_id` | — | 取得済みauthority identity |
| `sequence` | — | 同じlease内で単調増加する番号 |
| `id` | — | 対象Engine ID |
| `enabled` | — | Engineの起動状態 |
| `target_thrust` | N | 目標推力 |

```bash
ros2 topic pub --once /ksp_vessel/actuators/propulsion/command \
  pylon_interfaces/msg/EngineCommand \
  "{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: engine_12345_0, enabled: true, target_thrust: 50.0}"
```

| EngineState field | 単位 | 内容 |
|---|---|---|
| `header` | — | bridge受信時刻、`frame_id = base_link` |
| `id` | — | Engine ID |
| `name` | — | アクチュエータ名 |
| `enabled` / `operational` / `flameout` | — | KSP module状態 |
| `throttle` | 0.0..1.0 | 現在スロットル |
| `thrust` / `max_thrust` | N | 現在推力 / 最大推力 |
| `command_active` | — | 型付きoverride保持中か |

## 姿勢制御

EngineCommandの操作項目は`target_thrust`（N）と`enabled`（点火ON/OFF）だけです。ジンバル操舵を含むKSPの姿勢入力は[`FlightControlCommand`](/api/interfaces/msg/FlightControlCommand)のpitch/yaw/rollを使用します。標準ジンバルの可動範囲やlock設定が適用されます。

EngineStateの`gimbal_available`は標準ジンバルの有無を表します。従来の`gimbal_command_active`とgimbal入力値は互換性のため残り、個別overrideがない場合はfalseと0です。

## 型付きRCS Topic

RCS IDは`rcs_<persistentId>_<moduleIndex>`です。QoSはEngineと同じです。

| RcsCommand field | 単位 | 内容 |
|---|---|---|
| `header` | — | 現行bridgeでは指令変換に使用しない |
| `vessel_id` / `controller_id` / `lease_id` | — | 取得済みauthority identity |
| `sequence` | — | 同じlease内で単調増加する番号 |
| `id` | — | 対象RCS ID |
| `enabled` | — | RCS moduleの有効状態 |
| `thrust_limit` | N | moduleの推力上限 |
| `timeout_sec` | s | override時間。0ならbridge既定値 |

```bash
ros2 topic pub --once /ksp_vessel/actuators/rcs/command \
  pylon_interfaces/msg/RcsCommand \
  "{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: rcs_12345_1, enabled: true, thrust_limit: 2.0, timeout_sec: 0.5}"
```

| RcsState field | 単位 | 内容 |
|---|---|---|
| `header` | — | bridge受信時刻、`frame_id = base_link` |
| `id` | — | RCS ID |
| `name` | — | アクチュエータ名 |
| `enabled` / `active` / `flameout` | — | KSP module状態 |
| `thrust` / `max_thrust` / `thrust_limit` | N | 現在推力、最大推力、現在上限 |
| `command_active` | — | 型付きoverride保持中か |

例のidentityは、先に[機体制御API](/api/vehicle-control)で取得したleaseへ置き換えてください。型付きcommandはownerだけが使用でき、対象moduleについてBody Wrench配分より優先されます。Engineはlease終了、RCSはtimeout、またはactive vessel切替時にoverrideを解除し、元のEngine independent throttleまたはRCS設定へ戻します。
