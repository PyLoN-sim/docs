# Engines and RCS {#エンジン-rcs}

Stock KSP `ModuleEngines` / `ModuleEnginesFX` and `ModuleRCS` / `ModuleRCSFX` on the active vessel in Flight are detected automatically. No dedicated replacement parts are needed.

## Input and output topics {#入出力topic}

| Direction | Topic | Type | Content |
|---|---|---|---|
| Input | `/ksp_vessel/actuators/propulsion/command` | [`pylon_interfaces/msg/EngineCommand`](/en/api/interfaces/msg/EngineCommand) | Engine commands selected by `id` |
| Output | `/ksp_vessel/actuators/propulsion/state` | [`pylon_interfaces/msg/EngineState`](/en/api/interfaces/msg/EngineState) | Engine state with `id` |
| Input | `/ksp_vessel/actuators/rcs/command` | [`pylon_interfaces/msg/RcsCommand`](/en/api/interfaces/msg/RcsCommand) | RCS commands selected by `id` |
| Output | `/ksp_vessel/actuators/rcs/state` | [`pylon_interfaces/msg/RcsState`](/en/api/interfaces/msg/RcsState) | RCS state with `id` |

## Failsafes and KSP constraints {#フェイルセーフとksp制約}

Engine commands are held until the next command without an individual timer. Overrides clear on authority release/loss, emergency stop, or vessel switches. Lease renewal is still required. Body Wrench and RCS retain their existing timeouts.

Stock KSP module constraints take precedence, including non-restartable/non-shutdown engines, fuel exhaustion, staging conditions, and `throttleLocked`.

## Typed engine topics {#型付きengine-topic}

Engine IDs are `engine_<persistentId>_<moduleIndex>`. Commands are Reliable; state is Best Effort; both use depth 10.

| EngineCommand field | Unit | Meaning |
|---|---|---|
| `header` | — | Not used for command conversion by the current bridge |
| `vessel_id` / `controller_id` / `lease_id` | — | Acquired authority identity |
| `sequence` | — | Monotonically increasing number within the same lease |
| `id` | — | Target Engine ID |
| `enabled` | — | Engine ignition state |
| `target_thrust` | N | Target thrust |

```bash
ros2 topic pub --once /ksp_vessel/actuators/propulsion/command \
  pylon_interfaces/msg/EngineCommand \
  "{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: engine_12345_0, enabled: true, target_thrust: 50.0}"
```

| EngineState field | Unit | Meaning |
|---|---|---|
| `header` | — | Bridge reception time, `frame_id = base_link` |
| `id` | — | Engine ID |
| `name` | — | Actuator name |
| `enabled` / `operational` / `flameout` | — | KSP module state |
| `throttle` | 0.0..1.0 | Current throttle |
| `thrust` / `max_thrust` | N | Current / maximum thrust |
| `command_active` | — | Whether a typed override is held |

## Attitude control {#姿勢制御}

EngineCommand controls only `target_thrust` (N) and `enabled` (ignition ON/OFF). Use [`FlightControlCommand`](/en/api/interfaces/msg/FlightControlCommand) pitch/yaw/roll for KSP attitude inputs, including gimbal steering. Stock gimbal travel and lock settings apply.

`EngineState.gimbal_available` indicates a stock gimbal. Legacy `gimbal_command_active` and gimbal input values remain for compatibility; without an individual override they are false and zero.

## Typed RCS topics {#型付きrcs-topic}

RCS IDs are `rcs_<persistentId>_<moduleIndex>`. QoS matches Engine topics.

| RcsCommand field | Unit | Meaning |
|---|---|---|
| `header` | — | Not used for command conversion by the current bridge |
| `vessel_id` / `controller_id` / `lease_id` | — | Acquired authority identity |
| `sequence` | — | Monotonically increasing number within the same lease |
| `id` | — | Target RCS ID |
| `enabled` | — | RCS module enable state |
| `thrust_limit` | N | Module thrust limit |
| `timeout_sec` | s | Override duration; zero uses the bridge default |

```bash
ros2 topic pub --once /ksp_vessel/actuators/rcs/command \
  pylon_interfaces/msg/RcsCommand \
  "{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: rcs_12345_1, enabled: true, thrust_limit: 2.0, timeout_sec: 0.5}"
```

| RcsState field | Unit | Meaning |
|---|---|---|
| `header` | — | Bridge reception time, `frame_id = base_link` |
| `id` | — | RCS ID |
| `name` | — | Actuator name |
| `enabled` / `active` / `flameout` | — | KSP module state |
| `thrust` / `max_thrust` / `thrust_limit` | N | Current thrust, maximum thrust, current limit |
| `command_active` | — | Whether a typed override is held |

Replace example identities with the lease acquired through the [Vehicle Control API](/en/api/vehicle-control). Only the owner can use typed commands; they take precedence over Body Wrench allocation for that module. Engine overrides clear when the lease ends; RCS overrides clear on timeout; both clear on vessel switches, restoring original Engine independent throttle or RCS settings.
