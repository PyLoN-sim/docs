# Decouplers and Fairings {#デカプラー-フェアリング}

Regular/radial decouplers and manually deployed fairings on the active vessel in Flight are detected automatically. Docking ports and `ModuleJettison` are outside this API.

## Input and output topics {#入出力topic}

| Direction | Topic | Type | QoS |
|---|---|---|---|
| Input | `/ksp_vessel/actuators/separation/command` | [`pylon_interfaces/msg/SeparationCommand`](/en/api/interfaces/msg/SeparationCommand) | Reliable / Volatile / depth 10 |
| Output | `/ksp_vessel/actuators/separation/state` | [`pylon_interfaces/msg/SeparationState`](/en/api/interfaces/msg/SeparationState) | Reliable / Transient Local / depth 10 |

IDs are `decoupler_<persistentId>_<moduleIndex>` or `fairing_<persistentId>_<moduleIndex>`. Check state `id`.

## State {#状態}

| Field | Meaning |
|---|---|
| `id` | Stable target ID |
| `name` | Stable target name |
| `mechanism` | `decoupler` or `fairing` |
| `available` | Whether standard KSP separation/deployment is currently available |
| `separated` | `true` after separation or fairing deployment |

The bridge retains separated state even after the part leaves the active vessel, delivering it to later subscribers too. Switching the active vessel discards the previous vessel's retained state.

```bash
ros2 topic echo /ksp_vessel/actuators/separation/state
```

## Separation and deployment commands {#切断・展開指令}

Publishing `separate: true` once invokes standard KSP separation or fairing deployment. The operation is irreversible and requires acquired authority for the actual `vessel_id` and a monotonically increasing `sequence`. Non-owner commands, `false`, already operated/unavailable mechanisms, and nonexistent names are rejected or ignored.

```bash
ros2 topic pub --once /ksp_vessel/actuators/separation/command \
  pylon_interfaces/msg/SeparationCommand \
  '{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: decoupler_12345_0, separate: true}'
```

```bash
ros2 topic pub --once /ksp_vessel/actuators/separation/command \
  pylon_interfaces/msg/SeparationCommand \
  '{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 3, id: fairing_67890_1, separate: true}'
```

Replace identities with the lease acquired through the [Vehicle Control API](/en/api/vehicle-control).
