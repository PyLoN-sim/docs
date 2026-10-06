# Servos and Linear Motors {#サーボ-リニアモーター}

Rotary servos and linear motors share ROS2 topics. Select the joint with `MotorCommand.id`; receive all motor states together in `JointState`.

## Parts {#パーツ}

| Part | Joint type | Travel range | Default speed | Rated effort |
|---|---|---:|---:|---:|
| ROS2 Size-0 Axial Servo | `revolute` | -π〜π rad | 45°/s | 250 N·m |
| ROS2 Slim Telescoping Actuator | `prismatic` | 0〜1.6 m | 0.5 m/s | 4000 N |

Attach `bottom` to the parent structure and moving parts to `top` for both. The linear actuator has a 0.3125 m mounting disk, retracted length 1.6049312 m, stroke 1.6 m, and maximum length 3.2049312 m. Relative to the fixed white `LinearBase`, `LinearSleeve` moves half the extension and `LinearRod` the full extension along Y. The top stack node follows extension. Adjust `Travel Speed` in the editor or Flight from 0.02–1.0 m/s (default 0.5 m/s). Moving components are included in the native model; no later stock-model generation is needed.

A top-mounted part with `PhysicsSignificance = 1`, such as a small fireworks launcher, is promoted to an independent physics body with KSP's `PromoteToPhysicalPart()` during Flight, and a drive connection is created. Initialization retries after the top part starts and unpacks. Saves retain actual extension and moving-side vessel coordinates as well as the target. After loading, extension is measured from the actual distance between attachment faces.

The linear drive configures every `PartJoint.joints` connection and restores driving after KSP resets fixed springs, such as during unpacking. Rated 4000 N converts to 4 kN in KSP physics units, shared across parallel joints.

The servo uses a dedicated two-disk model, 0.625 m diameter (size 0), 0.140 m tall. `ServoBase` is fixed; `ServoRotor` rotates about Y. An orange marker and lower scale show relative angle. Attachment faces are at Y=0 and Y=0.140 m.

## Input and output topics {#入出力topic}

| Direction | Topic | Type | Content |
|---|---|---|---|
| Output | `/ksp_vessel/joint_states` | [`sensor_msgs/msg/JointState`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/JointState.html) | Position, velocity, effort |
| Output | `/pylon/diagnostics` | [`diagnostic_msgs/msg/DiagnosticArray`](https://docs.ros.org/en/jazzy/p/diagnostic_msgs/msg/DiagnosticArray.html) | Power, engage, lock, estimated current |
| Input | `/ksp_vessel/actuators/servo/command` | [`pylon_interfaces/msg/MotorCommand`](/en/api/interfaces/msg/MotorCommand) | Typed commands selected by `id` |
| Output | `/ksp_vessel/actuators/servo/state` | [`pylon_interfaces/msg/MotorState`](/en/api/interfaces/msg/MotorState) | Typed state with `id` |

By default, KSP sends state at 20 Hz to UDP 49010, and the bridge publishes to ROS2 on each reception. ROS2 commands return through the bridge to UDP 49011.

## Joint names {#joint名}

If `motorName` is empty, it is generated from KSP `partFlightId`.

```text
servo_<partFlightId>
linear_<partFlightId>
```

Check the actual name in `/ksp_vessel/joint_states.name` or `ROS Joint` in the KSP Part Action Window.

Typed commands are Reliable; state is Best Effort; both have depth 10. Topics are permanent and carry messages for multiple motors.

## Units {#単位}

| joint | position | velocity | effort |
|---|---|---|---|
| revolute | rad | rad/s | N·m |
| prismatic | m | m/s | N |

`estimated_current_a` in `/pylon/diagnostics` divides estimated effort by `torquePerAmpNm` or `forcePerAmpN`. It is not measured current.

## MotorCommand / MotorState {#motorcommand-motorstate}

Command one motor through a typed topic with a lease.

| MotorCommand field | Meaning |
|---|---|
| `header` | Not used for command conversion by the current bridge |
| `vessel_id` / `controller_id` / `lease_id` | Acquired authority identity |
| `sequence` | Monotonically increasing number within the same lease |
| `id` | Target ROS joint ID |
| `mode` | `MODE_POSITION=0`、`MODE_VELOCITY=1`、`MODE_EFFORT=2` |
| `enabled` | `false` disengages the motor |
| `position` | Position-mode target; rotary rad, linear m |
| `velocity` | Velocity-mode target; rotary rad/s, linear m/s |
| `effort` | Effort-mode target; rotary N·m, linear N |
| `timeout_sec` | Override duration; zero uses the bridge default |

```bash
ros2 topic pub --once /ksp_vessel/actuators/servo/command \
  pylon_interfaces/msg/MotorCommand \
  "{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: servo_12345, mode: 0, enabled: true, position: 1.5708, timeout_sec: 0.5}"
```

| MotorState field | Meaning |
|---|---|
| `header` | Bridge reception time, `frame_id = base_link` |
| `id` | ROS joint ID |
| `name` | ROS joint name |
| `motor_type` | `revolute` / `prismatic` |
| `enabled` | Engage state |
| `mode` | Current command mode |
| `position` / `velocity` / `effort` | Current values in the units above |
| `target` | Current target |
| `current` | Estimated current in A |
| `powered` | ElectricCharge availability |
| `locked` | Lock state |
| `command_active` | Whether a ROS override is held |

Replace example identities with the lease acquired through the [Vehicle Control API](/en/api/vehicle-control). Only the owner may use [`MotorCommand`](/en/api/interfaces/msg/MotorCommand). ROS motors are not allocated by Body Wrench. After timeout, `command_active` becomes false; velocity mode holds the current position. Position-mode targets are retained.

## DiagnosticStatus {#diagnosticstatus}

| Condition | Level | Message |
|---|---|---|
| No power | ERROR | `ElectricCharge unavailable` |
| disengaged | WARN | `Motor disengaged` |
| locked | WARN | `Servo locked` |
| Normal | OK | `Motor operational` |

## Collisions within the vessel {#機体内の衝突判定}

The motor body and driven parts connected to `top` can collide with each other during Flight.

For linear actuators, contact is excluded only between moving sleeves/rods and driven parts. Contact with the fixed tube and surroundings is retained, as is geometry for raycasts such as LiDAR.

## Individual movable-fin angle control {#可動フィンの個別角度制御}

Stock `ModuleControlSurface` parts on the active vessel—movable fins, elevons, rudders, and similar surfaces—are detected automatically and exposed as rotary joints named `fin_<persistentId>_<moduleIndex>`. No vessel rebuild or ModuleManager patch is needed. Fixed wings/fins and propeller/rotor blades using `displaceVelocity` are excluded.

Check actual IDs in the state topic's `id` or `/ksp_vessel/joint_states.name` below.

```bash
ros2 topic echo /ksp_vessel/actuators/servo/state
```

After acquiring a lease through the [Vehicle Control API](/en/api/vehicle-control), specify angles with [`MotorCommand`](/en/api/interfaces/msg/MotorCommand). The example requests +10° (0.174533 rad). Replace identity, ID, and sequence with actual values.

```bash
ros2 topic pub --once /ksp_vessel/actuators/servo/command \
  pylon_interfaces/msg/MotorCommand \
  "{vessel_id: '<vessel-id>', controller_id: manual, lease_id: '<lease-id>', sequence: 2, id: fin_12345_0, mode: 0, enabled: true, position: 0.174533, timeout_sec: 0.5}"
```

- Only position mode is supported. Signs follow rotation about the surface model's local X axis; mirrored parts are commanded individually. Signs differ from vessel-wide pitch/yaw/roll.
- Angles are limited to each part's `±ctrlSurfaceRange`, using stock KSP actuator speeds and aerodynamic calculations.
- Commands temporarily override that surface's pitch/yaw/roll input and deployment settings. Fins are not coupled.
- Fin position commands also expire: default 0.5 seconds, range 0.05–5 seconds. To hold an angle, resend faster than the timeout with an increasing lease `sequence`. Renew the lease as well.
- `enabled: false`, communication timeout, authority release/change/e-stop, vessel switches, and packing restore original KSP settings. Previously deployed surfaces return to their original deployment settings.
- State `position` is the stock module's current angle; `target` is the limited target, both in rad. Velocity, torque, and current are unavailable and return zero. `powered` means controllable; `enabled` and `command_active` indicate a ROS override.
