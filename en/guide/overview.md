# System Overview {#システム概要}

For a first installation, follow [Getting Started](getting-started.md) from software setup through reception checks.

PyLoN connects the KSP 1.x Flight scene and ROS2 nodes over two UDP paths. On the ROS2 side, work with topics converted into standard messages for each purpose; you do not need to handle UDP JSON directly.

<div class="topic-flow">
  <div><strong>KSP plugin</strong>Sends sensors, vessel state, and Ground Truth to UDP 49010</div>
  <div><strong>ROS2 bridge</strong>Converts between UDP JSON and standard ROS2 messages</div>
  <div><strong>ROS2 nodes</strong>Subscribe to topics and publish to command topics</div>
</div>

Commands travel in the reverse direction, from the ROS2 bridge to KSP on UDP 49011.

## Data flow {#データフロー}

| Direction | Content | Default path |
|---|---|---|
| KSP → bridge | Sensors, motor/actuator state, propulsion, Ground Truth, URDF | UDP `127.0.0.1:49010` |
| bridge → KSP | Authority, lease-bound Wrench, typed actuator commands | UDP `127.0.0.1:49011` |
| bridge → ROS2 | Sensors, state, diagnostics, Ground Truth, URDF, TF | ROS2 topics |
| ROS2 → bridge | Motor, propulsion, vessel, and actuator commands | ROS2 topics |

## Parts and capabilities {#パーツと機能}

| KSP side | Main ROS2 API | Purpose |
|---|---|---|
| PyLoN LiDAR 2D | `sensor_msgs/msg/LaserScan` | Planar range scans |
| PyLoN LiDAR 3D | `sensor_msgs/msg/PointCloud2` | Forward hemisphere point clouds |
| PyLoN RGB Camera | `Image` + `CameraInfo` | RGB images and camera intrinsics |
| PyLoN Size-0 Axial Servo | `MotorCommand` / `JointState` | Rotary joint control |
| PyLoN Slim Telescoping Actuator | `MotorCommand` / `JointState` | Linear joint control, extending to about twice its length |
| Stock KSP Wheel / Engine / RCS | `pylon_interfaces` | Typed control and state for individual parts |
| Stock KSP docking ports | `DockingPortCommand/State` + `Image` | State, separation, and selectable port cameras |
| active vessel | `BodyWrenchCommand` / `WrenchFeedback` / `PoseStamped` | Vessel requests with ownership, achieved output, and Ground Truth |

Stock Engine / RCS functionality uses existing parts. The `ModuleEngines` and `ModuleRCS` families in the active vessel are detected automatically after entering Flight.

## Topic lifetime {#topicの寿命}

- Bridge status, aggregate motor/propulsion, vehicle control, Ground Truth, and model topics exist from bridge startup.
- LiDAR and camera topics are created dynamically when the first data arrives from each part.
- `/ksp_vessel/actuators/<type>` is a permanent topic for each type; the command's `id` selects an instance. Detached separation state is retained until the active vessel changes.
- `/ksp_vessel/docking_ports/<id>` topics are created dynamically from the active vessel's docking port manifest and removed when a port disappears or communication times out.
- Sensor topics are removed on an inactive notification from KSP. If the notification is lost, they are removed three seconds after the last received data by default.
- On the next Flight, the same topics are recreated when the first data arrives.

## Names and coordinate frames {#名前と座標系}

Set the `<sensor_id>` used in sensor topics through the part's right-click menu in the VAB/SPH. IDs are normalized to alphanumeric characters and underscores. Duplicates within a vessel receive suffixes such as `_2` and `_3`.

LiDAR uses ROS sensor coordinates: `+X` forward and `+Z` up. Cameras use REP-103 optical coordinates: `+X` right, `+Y` down, and `+Z` forward. When an active vessel model is available, each message's `frame_id` is a stable name derived from the Sensor ID, connected to the corresponding vessel link through `/tf_static`.

## Inspect part IDs during Flight {#flight中にパーツidを確認する}

Hover over the `ID` button in Flight's stock toolbar to display IDs for ROS2-enabled parts on the active vessel. Click to pin the labels; click again and move the pointer away to hide them.

Labels cover sensors, motors, wheels, engines, RCS, separation mechanisms, docking ports, and movable fins. They show the IDs used in topics and commands, with lines pointing to each part. Multiple IDs on the same part are listed together. Labels follow the current active vessel after vessel switches, separation, or docking, and are hidden in map view or while the UI is hidden with F2.
