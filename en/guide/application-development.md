# Building ROS2 Applications {#ros2アプリケーションを作る}

Once you can receive vessel information and point clouds with [Getting Started](getting-started.md), connect your ROS2 nodes to PyLoN topics. Use standard ROS2 messages for sensor processing and `pylon_interfaces` for vessel and part control.

The examples on this page run in ROS 2 Jazzy on the host. If you completed Getting Started using Docker alone, first follow [Connecting host ROS applications and RViz](docker.md#ホストのrosアプリ・rvizを接続する) to prepare the host environment and a matching version of `pylon_interfaces`. To inspect topics only, run ROS commands in the running container through `docker exec pylon-jazzy /pylon-entrypoint.sh`.

## 1. Choose your inputs and outputs {#_1-利用する入出力を選ぶ}

Select the data you need from the [Topic Reference](../api/topics.md), then check message types, QoS, coordinate frames, and update rates in the part APIs.

| Feature | Main inputs | Outputs / destination |
|---|---|---|
| Point cloud processing and mapping | LiDAR `LaserScan` / `PointCloud2`, TF | Your estimation and map topics |
| Image processing | Camera `Image` / `CameraInfo` | Your detection result topics |
| Attitude estimation | IMU, star tracker | Your estimated attitude topic |
| Vessel guidance and attitude control | Vessel Pose / Twist, lifecycle | `ControlSetpoint` or `BodyWrenchCommand` with a lease |
| Wheel and joint control | `WheelState` / `MotorState` | `WheelCommand` / `MotorCommand` with a lease |

Use the same ROS2 Jazzy environment as the bridge, and source it in the terminal where you start your node.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
```

## 2. Subscribe to sensor topics {#_2-センサーtopicを購読する}

Launch a vessel with sensors into Flight in KSP and check the actual topic names. Replace `front_lidar` below with the Sensor ID set in the VAB/SPH.

```bash
ros2 topic list
ros2 topic info --verbose /ksp_vessel/lidar_3d/front_lidar/points
ros2 topic echo --once /ksp_vessel/lidar_3d/front_lidar/points
ros2 interface show sensor_msgs/msg/PointCloud2
```

Create subscriptions using the confirmed message type and QoS compatible with the publisher. Sensor topics are created when the first data arrives and disappear when Flight ends or reception times out. Track the time of the last received data in your node as well.

When transforming positions or directions into another frame, look up TF using the message's `header.frame_id` and `header.stamp`. See [Vessel Model and TF](../api/vessel-model.md) for sensor frames and their connection to the vessel.

## 3. Control the vessel and its parts {#_3-機体・パーツを制御する}

To specify a target attitude or position, you can use `pylon_vehicle_control`, which renews the lease and assigns sequence numbers.

```bash
ros2 run pylon_vehicle_control setpoint_controller --ros-args \
  -p controller_id:=my_controller \
  -p setpoint_topic:=/my_controller/setpoint
```

Publish `pylon_interfaces/msg/ControlSetpoint` to `/my_controller/setpoint` from your guidance node. Inspect its fields and mode constants with the command below. The default controller uses Ground Truth Pose / Twist.

```bash
ros2 interface show pylon_interfaces/msg/ControlSetpoint
```

Nodes that command forces, torques, or individual parts directly must acquire control authority as described in the [Vehicle Control API](../api/vehicle-control.md).

1. Check lifecycle to confirm that `active_vessel` is available.
2. Send `ACTION_ACQUIRE` and confirm `STATE_PYLON` and `emergency_stop: false`.
3. Send commands. The bridge can fill in the vessel ID, controller/lease IDs, and sequence.
4. Send commands more frequently than the timeout and keep the authority heartbeat alive. Release authority when finished to return to `STATE_PLAYER`.

Authority is either Player or PyLoN. It is shared among PyLoN nodes; there is no priority arbitration.

Check each part's state and Wrench feedback for the achieved output. Discard targets on vessel changes, loss of authority, or missing input, and restart control based on the new state. Resuming the shared controller requires a new `MODE_IDLE` followed by a setpoint.

## 4. Explore the examples {#_4-サンプルを参照する}

The [Demo Index](../demos/index.md) provides vessel preparation and startup instructions.

- [Debris Orbit and Imaging](../demos/debris-orbit.md): relative motion estimation, RCS control, and image saving
- [2D LiDAR and SLAM](../demos/lidar-slam.md): mapping, saving maps, and Nav2 driving
- [Mun Nav2](../demos/mun-nav2.md): autonomous driving with point clouds, IMU, and wheels

See [Bridge Options](../reference/bridge-options.md) to change endpoints or topic names, and [Troubleshooting](../reference/troubleshooting.md) if you cannot connect.
