# Stock KSP Wheels {#ksp標準ホイール}

`ModuleWheelBase` instances on the active vessel are detected automatically and controlled through shared typed topics. No dedicated replacement parts are needed.

## Input and output topics {#入出力topic}

`<name>` is `wheel_<persistentId>_<moduleIndex>`; `flightID` is used only when `persistentId` is zero.

| Direction | Topic | Type | QoS |
|---|---|---|---|
| Input | `/ksp_vessel/actuators/wheel/command` | [`pylon_interfaces/msg/WheelCommand`](/en/api/interfaces/msg/WheelCommand) | Reliable / depth 10 |
| Output | `/ksp_vessel/actuators/wheel/state` | [`pylon_interfaces/msg/WheelState`](/en/api/interfaces/msg/WheelState) | Best Effort / depth 10 |

State is transmitted at 30 Hz during Flight.

## WheelCommand {#wheelcommand}

| Field | Unit | Meaning |
|---|---|---|
| `header` | — | Not used for command conversion by the current bridge |
| `vessel_id` / `controller_id` / `lease_id` | — | Acquired authority identity |
| `sequence` | — | Monotonically increasing number within the same lease |
| `id` | — | Target `wheel_<persistentId>_<moduleIndex>` |
| `enabled` | — | Enable the wheel motor |
| `target_angular_velocity` | rad/s | Target angular velocity |
| `steering_angle` | rad | Target steering angle |
| `max_drive_torque` | N·m | Maximum drive torque |
| `timeout_sec` | s | Override duration; zero uses the bridge default |

```bash
ros2 topic pub --once /ksp_vessel/actuators/wheel/command \
  pylon_interfaces/msg/WheelCommand \
  "{vessel_id: <vessel-id>, controller_id: manual, lease_id: <lease-id>, sequence: 2, id: wheel_12345_2, enabled: true, target_angular_velocity: 12.0, steering_angle: 0.2, max_drive_torque: 20.0, timeout_sec: 0.5}"
```

## WheelState {#wheelstate}

| Field | Unit | Meaning |
|---|---|---|
| `header` | — | Bridge reception time, `frame_id = base_link` |
| `id` | — | Actuator ID |
| `name` | — | Actuator name |
| `enabled` | — | Motor enable state |
| `grounded` | — | Ground contact state |
| `angular_position` | rad | Wheel rotation position |
| `angular_velocity` | rad/s | Wheel rotation speed |
| `steering_angle` | rad | Current steering angle |
| `drive_torque` | N·m | Drive torque |
| `brake_torque` | N·m | Brake torque |
| `slip` | — | KSP combined tire slip |
| `max_drive_torque` | N·m | Current maximum drive torque |

```bash
ros2 topic echo /ksp_vessel/actuators/wheel/state
```

## Control priority and release {#制御の優先順位と解除}

Replace example identities with the lease acquired through the [Vehicle Control API](/en/api/vehicle-control). Wheels receiving typed commands take precedence over the Body Wrench allocator. Timeout or active vessel switches zero drive/steer inputs and restore the original motor enable state and maximum torque.
