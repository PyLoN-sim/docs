# Docking Ports {#ドッキングポート}

All `ModuleDockingNode` instances on the active vessel in Flight are detected automatically. This includes stock KSP ports and compatible parts using the same module, without dedicated configuration.

Port names are `docking_port_<persistentId>_<moduleIndex>`. Check actual names with:

```bash
ros2 topic list | grep docking_ports
```

## Topic {#topic}

| Direction | Topic | Type | Content |
|---|---|---|---|
| Output | `/ksp_vessel/docking_ports/<id>/state` | [`pylon_interfaces/msg/DockingPortState`](/en/api/interfaces/msg/DockingPortState) | Docking, acquisition, release availability, and camera selection; 10 Hz, Best Effort |
| Input | `/ksp_vessel/docking_ports/<id>/command` | [`pylon_interfaces/msg/DockingPortCommand`](/en/api/interfaces/msg/DockingPortCommand) | Select/stop camera or release; Reliable |
| Output | `/ksp_vessel/docking_ports/<id>/camera/image_raw` | [`sensor_msgs/msg/Image`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Image.html) | Selected port's 320×240, 5 Hz, `rgb8` images |
| Output | `/ksp_vessel/docking_ports/<id>/camera/camera_info` | [`sensor_msgs/msg/CameraInfo`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/CameraInfo.html) | Pinhole intrinsics for 60° vertical FOV |

`state` includes KSP's raw state string plus `docked`, `acquiring`, `releasable`, `camera_active`, and the counterpart name and part ID.

## Switching cameras {#カメラを切り替える}

At Flight entry and active vessel switches, the first port in persistent-ID order is selected automatically. Only one port streams at a time.

```bash
ros2 topic pub --once \
  /ksp_vessel/docking_ports/docking_port_12345_2/command \
  pylon_interfaces/msg/DockingPortCommand \
  '{vessel_id: VESSEL_ID, controller_id: CONTROLLER_ID, lease_id: LEASE_ID, action: 1, sequence: 1}'
```

`action: 1` is `SELECT_CAMERA`; `action: 2` is `STOP_CAMERA`. After stopping, no automatic reselection occurs; images resume only after another `SELECT_CAMERA`. If the port leaves the active vessel, the first remaining port is selected automatically.

The camera faces the docking node opening. Closed shielded/inline ports appear closed in the image. Image and `CameraInfo` share a timestamp and REP-103 optical frame (+X right, +Y down, +Z forward).

## Undock / Decouple {#undock-decouple}

```bash
ros2 topic pub --once \
  /ksp_vessel/docking_ports/docking_port_12345_2/command \
  pylon_interfaces/msg/DockingPortCommand \
  '{vessel_id: VESSEL_ID, controller_id: CONTROLLER_ID, lease_id: LEASE_ID, action: 3, sequence: 2}'
```

`RELEASE` prefers KSP's currently available `Undock`, otherwise executing `Decouple`. Nothing happens when `releasable: false`. Acquire a [vehicle control lease](../api/vehicle-control.md) first and set its IDs. Increase sequence monotonically across control commands within the same lease; zero or reused sequences are rejected.

Relative Pose/Twist, target selection, and Control From Here are outside this API.
