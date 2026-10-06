# Topic Reference {#topic一覧}

Topics belonging to the active vessel use `/ksp_vessel`; topics belonging to the bridge process use `/pylon`. Directions in the tables are described from the ROS2 node side.

Types use the ROS 2 `package/msg/TypeName` notation. Follow type links to fields, constants, and raw definitions. Browse all custom types in [Message and Service Types](/en/api/interfaces/).

## Bridge {#bridge}

| Direction | Topic | Type | QoS / content |
|---|---|---|---|
| Publish | `/pylon/status` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / Transient Local; bridge status |
| Publish | `/pylon/diagnostics` | [`diagnostic_msgs/msg/DiagnosticArray`](https://docs.ros.org/en/jazzy/p/diagnostic_msgs/msg/DiagnosticArray.html) | Motor diagnostics and Wrench allocation residuals |

## IMU {#imu}

Sensor timestamp intervals preserve KSP physics time. Their offset does not jump during Flight to match network latency or rendering speed. Lifecycle is generated from a session heartbeat independent of sensors. `udp_bridge --disable-ground-truth` disables all Ground Truth topics and world TF; `VesselLifecycle.world_frame` is empty in this mode. `runtime_instance`, `runtime_epoch`, and `runtime_generation` identify the KSP session; `generation` and `origin_sequence` are ROS-side generations updated on vessel switches, time rewind, and recovery from session timeout.

Every vessel outputs a three-axis gyroscope and accelerometer for the active vessel without extra parts or configuration. The same topic is used across vessel switches.

| Direction | Topic | Type | QoS / content |
|---|---|---|---|
| Publish | `/ksp_vessel/imu/data_raw` | [`sensor_msgs/msg/Imu`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Imu.html) | Best Effort / Volatile / depth 10; on physics sample updates, up to 30 Hz |

`header.frame_id=base_link`, with X forward, Y left, Z up. `angular_velocity` is relative to the inertial frame in rad/s (planet rotation is added in KSP's rotating physics frame). `linear_acceleration` is specific force in m/s² (inertial acceleration minus gravity): about +g when stationary with Z up, about zero in free fall. KSP's `perturbation_immediate` is transformed into vessel axes without added noise or bias. Absolute attitude is not measured, so `orientation_covariance[0]=-1`; angular velocity and acceleration covariances are all zero to indicate unknown values. This corresponds to `imu/data_raw` in [REP-145](https://www.ros.org/reps/rep-0145.html).

Timestamps map KSP simulation time to the existing bridge clock. No new measurements are output outside Flight, while packed, or while paused. One sample is skipped immediately after loading, a vessel switch, or unpacking. The virtual sensor expresses specific force at the vessel's center of mass in vessel axes; rotational acceleration at individual part positions is not modeled. No separate topics are created for inactive vessels.

## Star tracker {#スタートラッカー}

| Direction | Topic | Type | Content |
|---|---|---|---|
| Publish | `/ksp_vessel/star_tracker/<id>/state` | [`pylon_interfaces/msg/StarTrackerState`](/en/api/interfaces/msg/StarTrackerState) | Attitude, covariance, validity, and measurement failure reason together |
| Publish | `/ksp_vessel/star_tracker/<id>/attitude` | [`geometry_msgs/msg/QuaternionStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/QuaternionStamped.html) | Valid inertial attitude only |

With the dedicated part installed, publication defaults to 5 Hz, Reliable / Volatile / depth 10. Position is not measured. When `state.valid=false`, the quaternion is all zero and the first covariance element is −1. Communication loss also reports `stale`. See [Star Tracker](../parts/star-tracker.md) for frames, constraints, reacquisition, and topic lifetime.

## Vessel and model {#機体・モデル}

| Direction | Topic | Type | QoS / content |
|---|---|---|---|
| Publish | `/ksp_vessel/simulator/state` | [`pylon_interfaces/msg/SimulatorState`](/en/api/interfaces/msg/SimulatorState) | Reliable / Transient Local; pause, warp, packed, communication, and UT advancement |
| Publish | `/ksp_vessel/simulator/universal_time` | [`std_msgs/msg/Float64`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/Float64.html) | KSP UT [s]; Reliable / Transient Local. Constant while paused, decreasing on rewind |
| Subscribe | `/ksp_vessel/control/batch` | [`pylon_interfaces/msg/ControlBatch`](/en/api/interfaces/msg/ControlBatch) | Reliable; ordered renewal → attitude → thrust → separation |
| Publish | `/ksp_vessel/control/snapshot` | [`pylon_interfaces/msg/ControlSnapshot`](/en/api/interfaces/msg/ControlSnapshot) | Reliable; flight, all engines, and separators from the same frame. Disabled without Ground Truth |
| Publish | `/ksp_vessel/health/power` | [`pylon_interfaces/msg/VehicleHealth`](/en/api/interfaces/msg/VehicleHealth) | Charge, capacity, and balance estimate with quality, 2 Hz |
| Publish | `/ksp_vessel/health/thermal` | [`pylon_interfaces/msg/PartThermalState`](/en/api/interfaces/msg/PartThermalState) | Per-part temperature, limits, shielding, and charge, 2 Hz |
| Publish | `/ksp_vessel/lifecycle` | [`pylon_interfaces/msg/VesselLifecycle`](/en/api/interfaces/msg/VesselLifecycle) | Reliable / Transient Local; actual vessel ID and frame lifecycle |
| Subscribe | `/ksp_vessel/control/authority/command` | [`pylon_interfaces/msg/ControlAuthorityCommand`](/en/api/interfaces/msg/ControlAuthorityCommand) | Reliable; lease, SAS exclusion, and e-stop |
| Publish | `/ksp_vessel/control/authority/state` | [`pylon_interfaces/msg/ControlAuthorityState`](/en/api/interfaces/msg/ControlAuthorityState) | Reliable / Transient Local; confirmed owner |
| Subscribe | `/ksp_vessel/control/wrench_command` | [`pylon_interfaces/msg/BodyWrenchCommand`](/en/api/interfaces/msg/BodyWrenchCommand) | Reliable。lease-bound `base_link` Wrench |
| Subscribe | `/ksp_vessel/control/flight_command` | [`pylon_interfaces/msg/FlightControlCommand`](/en/api/interfaces/msg/FlightControlCommand) | Reliable; stock steering inputs and landing gear with a lease |
| Publish | `/ksp_vessel/ground_truth/flight` | [`pylon_interfaces/msg/FlightState`](/en/api/interfaces/msg/FlightState) | Best Effort; altitude, orbit, fuel, ground contact, and surface axes in body frame. Disabled without Ground Truth |
| Publish | `/ksp_vessel/control/wrench_feedback` | [`pylon_interfaces/msg/WrenchFeedback`](/en/api/interfaces/msg/WrenchFeedback) | requested / allocated / achieved / residual |
| Publish | `/ksp_vessel/ground_truth/pose` | [`geometry_msgs/msg/PoseStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/PoseStamped.html) | Best Effort; ENU position and attitude |
| Publish | `/ksp_vessel/ground_truth/nearby_vessels` | [`pylon_interfaces/msg/NearbyVessels`](/en/api/interfaces/msg/NearbyVessels) | Absolute positions and velocities of own and nearby vessels at the same time and origin. Up to 32 vessels within 2500 m, on the same celestial body, loaded/unpacked |
| Publish | `/ksp_vessel/ground_truth/twist` | [`geometry_msgs/msg/TwistStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/TwistStamped.html) | Best Effort; ENU velocity |
| Publish | `/ksp_vessel/ground_truth/twist_body` | [`geometry_msgs/msg/TwistStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/TwistStamped.html) | Best Effort; body velocity |
| Publish | `/ksp_vessel/ground_truth/frame_angular_velocity` | [`geometry_msgs/msg/Vector3Stamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/Vector3Stamped.html) | Rotation rate of planet-fixed ENU axes relative to the inertial frame, for evaluator comparison with inertial estimates |
| Publish | `/ksp_vessel/ground_truth/acceleration` | [`geometry_msgs/msg/AccelStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/AccelStamped.html) | Best Effort; ENU acceleration |
| Publish | `/ksp_vessel/joint_states` | [`sensor_msgs/msg/JointState`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/JointState.html) | State of all ROS servos |
| Publish | `/ksp_vessel/robot_description` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / Transient Local; proxy URDF |
| Publish | `/ksp_vessel/root_frame` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / Transient Local; RViz Fixed Frame name |
| Publish | `/tf` | [`tf2_msgs/msg/TFMessage`](https://docs.ros.org/en/jazzy/p/tf2_msgs/msg/TFMessage.html) | Dynamic TF for Ground Truth and the CoM-based proxy root |
| Publish | `/tf_static` | [`tf2_msgs/msg/TFMessage`](https://docs.ros.org/en/jazzy/p/tf2_msgs/msg/TFMessage.html) | Fixed proxy joints and sensor mounts |

Ground Truth ENU axes are planet-fixed. Ground Truth angular velocity is relative to these axes and is unaffected by altitude-dependent changes in KSP physics frames. For comparisons with inertial IMU attitude, the evaluator adds coordinate rotation and velocity transport terms using `frame_angular_velocity`. Demo estimators and controllers do not subscribe to this topic.

## Sensors {#センサー}

| Direction | Topic | Type |
|---|---|---|
| Publish | `/ksp_vessel/lidar_2d/<lidar_2d_id>/scan` | [`sensor_msgs/msg/LaserScan`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/LaserScan.html) |
| Publish | `/ksp_vessel/lidar_3d/<lidar_3d_id>/points` | [`sensor_msgs/msg/PointCloud2`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/PointCloud2.html) |
| Publish | `/ksp_vessel/camera/<camera_id>/image_raw` | [`sensor_msgs/msg/Image`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Image.html) |
| Publish | `/ksp_vessel/camera/<camera_id>/camera_info` | [`sensor_msgs/msg/CameraInfo`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/CameraInfo.html) |
| Publish | `/ksp_vessel/docking_ports/<id>/camera/image_raw` | [`sensor_msgs/msg/Image`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Image.html) |
| Publish | `/ksp_vessel/docking_ports/<id>/camera/camera_info` | [`sensor_msgs/msg/CameraInfo`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/CameraInfo.html) |

Set LiDAR and RGB camera IDs with `Edit ROS2 Sensor ID` in the VAB/SPH. New parts receive automatic `lidar_2d_...`, `lidar_3d_...`, or `camera_...` IDs. Sensor topics are created on the first complete data and removed on an inactive notification or silence for `--topic-timeout-sec`.

## Typed actuators {#型付きアクチュエータ}

Each type shares one `command` / `state` pair instead of per-instance topics. Every command selects its target with `id`, and state includes the source `id`. State `name` is an equivalent alias for existing clients.

| Target | Command Topic | State Topic | Type |
|---|---|---|---|
| ROS servo / linear motor | `/ksp_vessel/actuators/servo/command` | `/ksp_vessel/actuators/servo/state` | [`pylon_interfaces/msg/MotorCommand`](/en/api/interfaces/msg/MotorCommand) / [`pylon_interfaces/msg/MotorState`](/en/api/interfaces/msg/MotorState) |
| Stock KSP wheel | `/ksp_vessel/actuators/wheel/command` | `/ksp_vessel/actuators/wheel/state` | [`pylon_interfaces/msg/WheelCommand`](/en/api/interfaces/msg/WheelCommand) / [`pylon_interfaces/msg/WheelState`](/en/api/interfaces/msg/WheelState) |
| Engine | `/ksp_vessel/actuators/propulsion/command` | `/ksp_vessel/actuators/propulsion/state` | [`pylon_interfaces/msg/EngineCommand`](/en/api/interfaces/msg/EngineCommand) / [`pylon_interfaces/msg/EngineState`](/en/api/interfaces/msg/EngineState) |
| RCS module | `/ksp_vessel/actuators/rcs/command` | `/ksp_vessel/actuators/rcs/state` | [`pylon_interfaces/msg/RcsCommand`](/en/api/interfaces/msg/RcsCommand) / [`pylon_interfaces/msg/RcsState`](/en/api/interfaces/msg/RcsState) |
| Decoupler / fairing | `/ksp_vessel/actuators/separation/command` | `/ksp_vessel/actuators/separation/state` | [`pylon_interfaces/msg/SeparationCommand`](/en/api/interfaces/msg/SeparationCommand) / [`pylon_interfaces/msg/SeparationState`](/en/api/interfaces/msg/SeparationState) |

Operations and topics always target `active_vessel`. Commands execute while PyLoN has authority; omitted `vessel_id / controller_id / lease_id / sequence` values are filled by the bridge. Authority is either `STATE_PLAYER` or `STATE_PYLON`, with emergency stop as a separate flag. Commands use Reliable / Volatile / depth 10. Normal state uses Best Effort / Volatile / depth 10; separation state uses Reliable / Transient Local / depth 10.

Separation results use `/ksp_vessel/actuators/separation/result` ([`pylon_interfaces/msg/SeparationResult`](/en/api/interfaces/msg/SeparationResult), Reliable / Transient Local). The query service is `/ksp_vessel/actuators/separation/get_result` ([`pylon_interfaces/srv/GetSeparationResult`](/en/api/interfaces/srv/GetSeparationResult)). See [Vehicle Control API](vehicle-control.md) for retention, identity, and snapshots.

## Docking ports {#ドッキングポート}

| Direction | Topic | Type |
|---|---|---|
| Publish | `/ksp_vessel/docking_ports/<id>/state` | [`pylon_interfaces/msg/DockingPortState`](/en/api/interfaces/msg/DockingPortState) |
| Subscribe | `/ksp_vessel/docking_ports/<id>/command` | [`pylon_interfaces/msg/DockingPortCommand`](/en/api/interfaces/msg/DockingPortCommand) |

The default `<id>` is `docking_port_<persistentId>_<moduleIndex>`. Commands provide `SELECT_CAMERA`, `STOP_CAMERA`, and `RELEASE`.

## Main startup arguments {#主な起動引数}

| Target | Argument | Default |
|---|---|---|
| Vessel sensors | `--topic-prefix` | `/ksp_vessel` |
| Bridge status | `--bridge-prefix` | `/pylon` |
| Diagnostics | `--diagnostics-topic` | `/pylon/diagnostics` |
| Wrench command | `--body-wrench-command-topic` | `/ksp_vessel/control/wrench_command` |
| Authority command | `--control-authority-command-topic` | `/ksp_vessel/control/authority/command` |
| Authority state | `--control-authority-state-topic` | `/ksp_vessel/control/authority/state` |
| Wrench feedback | `--wrench-feedback-topic` | `/ksp_vessel/control/wrench_feedback` |
| Vessel lifecycle | `--vessel-lifecycle-topic` | `/ksp_vessel/lifecycle` |
| Ground Truth | `--ground-truth-prefix` | `/ksp_vessel/ground_truth` |
| Actuators | `--actuators-prefix` | `/ksp_vessel/actuators` |
| Docking ports | `--docking-ports-prefix` | `/ksp_vessel/docking_ports` |
| joint state | `--joint-states-topic` | `/ksp_vessel/joint_states` |
| URDF | `--robot-description-topic` | `/ksp_vessel/robot_description` |
| root frame | `--root-frame-topic` | `/ksp_vessel/root_frame` |

Check all options with `ros2 run pylon_bridge udp_bridge --help`.
