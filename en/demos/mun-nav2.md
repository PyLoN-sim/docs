# Mun Nav2 {#月面nav2}

First clone core and demos through [Shared Preparation](index.md). Run commands from the PyLoN core root.

Place a front-steering or front/rear-steering rover on the Mun and drive to RViz Nav2 Goal positions/headings. Pose and traversable terrain are estimated from 3D LiDAR, IMU, and wheel data.

## 1. Install the demo {#_1-デモをインストールする}

After installing the mod and bridge through [Getting Started](../guide/getting-started.md), run from the PyLoN repository root.

```bash
source /opt/ros/jazzy/setup.bash
rosdep install --from-paths \
  Ros2/pylon_interfaces Ros2/pylon_bridge Ros2/pylon_vehicle_control \
  Ros2/pylon_perception ../demos/pylon_demo_mun_rover \
  --ignore-src --rosdistro jazzy -y
./sync.sh --skip-ksp-build --skip-ksp-sync --demo mun_rover
source ~/ros2_ws/install/setup.bash
```

This also installs Nav2, RViz, and point-cloud dependencies.

## 2. Prepare the rover {#_2-ローバーを準備する}

1. Arrange four or six stock wheels symmetrically. Enable steering on front wheels only or both front/rear axles. Rear steering turns opposite the front; the center pair on a six-wheel rover may remain fixed.
2. Enable motors and brakes on all wheels and provide sufficient power.
3. Point the control point forward. For the Mk2 lander can, select `Control Point: Forward`.
4. Mount 3D LiDAR where it sees forward and ground. One sensor is selected automatically. On wide vessels, mount higher to see ground on both sides.
5. Place on the Mun through normal KSP operations, confirm all wheels are grounded, apply brakes, and stop.

Initialization collects at least 30 stationary IMU gravity/bias samples. Remain still while it initializes.

`rober B` works with all four wheels steering enabled. Set the control point Forward and use the saved LiDAR placement and medium-range profile. No LiDAR ID change or rear-steering disable is needed. Do not change the control point or wheel settings while driving; stop and reinitialize after changes.

## 3. Start Nav2 and RViz {#_3-nav2とrvizを起動する}

Stop any manually started bridge first, then run below. This launch also starts a bridge.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 launch pylon_demo_mun_rover demo.launch.py
```

With multiple 3D LiDARs, specify an ID such as `lidar_sensor_id:=lidar_3d_3bb3e35a`. A source change during automatic selection stops driving and resets mapping/estimation. Turning radius and footprint are configured from wheel/vessel data. Driving and goal positions reference the rear axle for front steering, or the axle midpoint for front/rear steering.

Use `start_bridge:=false` with an existing bridge. Run only one bridge at a time.

## 4. Set a goal {#_4-ゴールを指定する}

Wait for the URDF vessel, footprint, and white ground regions to appear in RViz, with `Ready: set Nav2 Goal` status.

1. Select RViz `Nav2 Goal`.
2. Click traversable ground and drag toward the desired final heading to place the arrow.
3. Check the displayed path and vessel motion.

Photo-covered areas retain lighting from capture time. Temporarily disable `Surface photos` when checking traversability. Gray map areas are unobserved and cannot be driven through. Begin with a nearby observed point and leave turning space. Because heading alignment uses forward motion, even nearby goals may require a detour. Maximum speed is 0.5 m/s; acceleration is 0.2 m/s².

Once position and heading are within tolerance, the parking brake is held; success follows Nav2's stopped-state confirmation. If the rear footprint enters unknown terrain during the first turn, first drive straight about 5 m to observe surrounding ground, then set a turning goal.

From your own node, use the public `/navigate_to_pose` action. `/pylon/mun_rover/navigate_to_pose` is internal.

## 5. Inspect state and maps {#_5-状態と地図を確認する}

Source ROS in another terminal and run below.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 topic echo /pylon/mun_rover/status
```

| Display / output | Topic |
|---|---|
| Map | `/pylon/mun_rover/map` |
| Pose estimate | `/pylon/mun_rover/odom`, `odom_3d` |
| Point cloud / ground / obstacles | `/pylon/mun_rover/points`, `ground`, `obstacles` |
| Planned path / trajectory | `/pylon/mun_rover/plan`, `trajectory` |
| Vessel geometry | `/pylon/mun_rover/geometry` |
| URDF at estimated pose | `/pylon/mun_rover/robot_description` |
| Accumulated photo map | `/pylon/mun_rover/photo_map` |
| Original camera image / calibration | `/pylon/mun_rover/camera/image_raw`, `camera/camera_info` |
| Photo count / area / wait reason | `/pylon/mun_rover/visualization_status` |

The map is 120 m square at 0.25 m resolution. TF is `map → pylon_rover_odom → pylon_rover_base_footprint → pylon_rover_base_link`. Included RViz settings show maps and trajectories in these estimated frames.

`Status` shows preparation, driving, and stop reasons. `Local costs` is hidden by default to keep white/gray terrain readable; enable it in Displays to inspect Nav2 costs.

Navigation 2 `Navigation: active` and map `Ready: set Nav2 Goal` indicate startup completion. This demo uses its own pose estimation; `Localization: inactive` in that panel is expected.

## 6. Overlay the rover and lunar photos {#_6-車体と撮影した月面を重ねて見る}

`Rover URDF` overlays primitive vessel geometry at the estimated pose. `Surface photos` projects camera photos onto LiDAR-observed ground and leaves them around the traveled area. A single camera is selected automatically; for multiple cameras specify, for example, `camera_sensor_id:=camera_c584088f`.

Mount the camera facing ground and enable image streaming. Sky, unknown terrain, and vessel-occluded areas are not projected. Photos are added after roughly 0.5 m movement or 8° heading change. The photo map is 120 m square on a 10 cm grid; overlaps prefer better downward angles and distances. Photo colors do not indicate traversability; driving decisions use the LiDAR map.

Add `show_camera:=true` at launch for live video alongside RViz. Video uses a dedicated viewer; photo map and URDF appear in RViz. RViz's Image panel is avoided because it crashes on some HiDPI systems. `3D LiDAR` and `Ground` are hidden by default to keep photos readable.

Photos accumulate in memory and clear on reinitialization, vessel switches, or teleportation. There is no automatic saving. Estimation error and sparse terrain observations can leave seams and gaps. This is not photogrammetric 3D reconstruction or long-range loop closure.

## Stopping and reinitializing {#停止と再初期化}

Canceling an active goal stops driving. Missing commands/sensors for at least 0.5 seconds, lost ground contact, authority loss, or estimation faults also stop the rover; old goals do not resume automatically.

Cancel RViz goals with Navigation 2 `Cancel`. Panel `Reset` stops/cleans up Nav2 itself. Use the service below to reset only mapping and pose estimation.

Terrain computation runs separately from sensor processing. Observations more than two seconds old also stop driving with `terrain_timeout`.

Resolve the cause, confirm stopped state, canceled goals, and ground contact, then initialize.

```bash
ros2 service call /pylon/mun_rover/reset std_srvs/srv/Trigger '{}'
```

Set a fresh goal once Ready returns. To finish, cancel the goal, confirm stopped state, and press `Ctrl-C` in the launch terminal.

## Main launch arguments {#主な起動引数}

| Argument | Default | Purpose |
|---|---|---|
| `lidar_sensor_id` | `auto` | Auto-select one streaming 3D LiDAR; specify ID if multiple |
| `camera_sensor_id` | `auto` | Auto-select one streaming camera; specify ID if multiple |
| `show_visualization` | `true` | Generate estimated-pose URDF and photo map |
| `show_camera` | `false` | Open live video in the dedicated viewer |
| `start_bridge` | `true` | Also start the bridge |
| `use_rviz` | `true` | Start RViz |
| `evaluate` | `false` | Start a comparison node using Ground Truth |
| `params_file` | Included `config/nav2.yaml` | Nav2 settings |
| `bt_xml` | Included `config/navigate.xml` | Navigation behavior settings |

For comparison with Ground Truth, add `evaluate:=true` and inspect `/pylon/mun_rover/evaluation`. Evaluation runs in a separate node. With an existing bridge, enable Ground Truth there too.

## If driving does not start or stops {#走り出さない・途中で止まる場合}

| State | Check |
|---|---|
| Not Ready | All wheels grounded and stationary on the Mun; control point Forward; symmetric front or front/rear steering |
| Ground stays gray | LiDAR sees forward and side ground; adjust height, angle, and distance profile |
| No path generated | Goal/path are observed and have footprint and turning clearance |
| Estimation fault stops driving | Terrain features, wheel contact, point cloud/IMU rates; reset after stopping |

This is a local-map demo rather than SLAM with long-range loop closure. Initial traversability thresholds are 12° slope, 0.25 m steps, and 0.15 m roughness. Unknown terrain or obstacles within the stopping distance, including the footprint and 0.5 m margin, also cause a stop.
