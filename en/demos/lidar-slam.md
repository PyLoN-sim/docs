# 2D LiDAR and SLAM {#_2d-lidarとslam}

First clone core and demos through [Shared Preparation](index.md). Run commands from the PyLoN core root.

Estimate planar pose from 2D LiDAR and build a map with SLAM Toolbox. Try saving the map, localization with AMCL, and driving through RViz Nav2 Goal.

## 1. Install the demo {#_1-デモをインストールする}

After installing the mod and bridge through [Getting Started](../guide/getting-started.md), run from the PyLoN repository root.

```bash
source /opt/ros/jazzy/setup.bash
rosdep install --from-paths \
  Ros2/pylon_interfaces Ros2/pylon_bridge Ros2/pylon_vehicle_control \
  ../demos/pylon_demo_lidar_slam \
  --ignore-src --rosdistro jazzy -y
./sync.sh --skip-ksp-build --skip-ksp-sync --demo lidar_slam
source ~/ros2_ws/install/setup.bash
```

This also installs SLAM Toolbox, Nav2, and RViz.

## 2. Prepare the vessel and driving area {#_2-機体と走行場所を準備する}

1. Mount a 2D LiDAR horizontally on a vessel that can travel over flat ground.
2. Set Sensor ID to `front_lidar` and align LiDAR forward with vessel forward.
3. Enter Flight somewhere with walls, buildings, or structures visible in multiple directions, and remain stationary.
4. Enable sensor and UDP streaming. For driving, also check motors, steering, fuel, and power.

The estimated base frame is the LiDAR origin. Mount near the vessel center and keep height, roll, and pitch as constant as possible while moving. Choose a location where horizontal scans include shapes other than ground.

Mapping alone can use manual KSP movement. Default Nav2 driving uses forward/backward movement and yaw without generating lateral targets. Turning also needs in-place rotation. For front-steering rovers unable to turn in place, [Mun Nav2](mun-nav2.md) is more suitable.

## 3. Check the bridge and scans {#_3-bridgeとスキャンを確認する}

Start the bridge in terminal A.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 run pylon_bridge udp_bridge \
  --host 127.0.0.1 --port 49010 --disable-ground-truth
```

Check in terminal B.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 topic echo --once /ksp_vessel/lifecycle
ros2 topic hz /ksp_vessel/lidar_2d/front_lidar/scan
```

Once lifecycle is ACTIVE and scans arrive, stop `ros2 topic hz` with `Ctrl-C`. Set `scan_topic` below to the actual topic containing your Sensor ID.

## 4. Build a map with SLAM {#_4-slamで地図を作る}

Run in terminal B, leaving the bridge running in terminal A.

```bash
ros2 launch pylon_demo_lidar_slam mapping.launch.py \
  scan_topic:=/ksp_vessel/lidar_2d/front_lidar/scan \
  use_rviz:=true
```

RViz Fixed Frame is `map`. Display `/map` for the map and `/pylon/lidar_slam/scan` for LaserScan. Begin stationary, confirm scan/map alignment, then move slowly with manual KSP controls.

Check SLAM and odometry in another terminal.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 lifecycle get /slam_toolbox
ros2 topic echo --once /map_metadata
ros2 topic echo --once /pylon/lidar_slam/odom
```

Mapping is working when `slam_toolbox` is `active` and map/odometry update with movement. Large motion between scans can break matching; move slowly.

## 5. Save the map {#_5-地図を保存する}

Stop the vessel and run in another terminal while mapping remains active.

```bash
mkdir -p "$HOME/pylon_maps"
ros2 run nav2_map_server map_saver_cli \
  -f "$HOME/pylon_maps/site" \
  --ros-args -p save_map_timeout:=15.0
ls "$HOME/pylon_maps/site.yaml" "$HOME/pylon_maps/site.pgm"
```

After saving, press `Ctrl-C` in the mapping terminal. Keep the bridge running.

## 6. Start Nav2 with a saved map {#_6-保存地図でnav2を起動する}

```bash
ros2 launch pylon_demo_lidar_slam navigation.launch.py \
  scan_topic:=/ksp_vessel/lidar_2d/front_lidar/scan \
  map:="$HOME/pylon_maps/site.yaml" \
  use_rviz:=true
```

1. Use RViz `2D Pose Estimate` to set the current position and heading on the saved map.
2. Adjust position and heading until scans align with map walls and structures.
3. Use `Nav2 Goal` to specify a nearby free area and final heading.
4. Check the path, actual motion, and authority state.

```bash
ros2 lifecycle get /amcl
ros2 lifecycle get /controller_server
ros2 lifecycle get /planner_server
ros2 lifecycle get /bt_navigator
ros2 topic echo --once /amcl_pose
ros2 topic echo /ksp_vessel/control/authority/state
```

Set goals after all nodes become `active`. When Nav2 velocity commands arrive, the controller acquires an active-vessel lease and sends Body Wrench.

Nav2 Goal also works during mapping. Start only one launch: either mapping or navigation with a saved map.

## Stopping and resuming {#停止と再開}

Cancel the goal in RViz's Navigation panel. On missing velocity commands, the controller brakes and releases the lease. Confirm the vessel has stopped, terminate launch with `Ctrl-C`, then stop the bridge.

Control remains stopped after vessel switches, session changes, authority loss, or missing odometry. Cancel the Nav2 goal and restart the entire launch. For a saved map, set the current position again with `2D Pose Estimate`. Restarting mapping creates a new map; save any map you need before exiting.

## Launch arguments and tuning {#起動引数と調整}

| Argument | Default | Purpose |
|---|---|---|
| `scan_topic` | `/ksp_vessel/lidar_2d/front_lidar/scan` | KSP 2D scan input |
| `use_rviz` | `true` | Start RViz |
| `use_sim_time` | `false` | ROS clock setting; use the default for this procedure |
| `nav2_params` | Included `params/nav2_params.yaml` | Vessel dimensions, driving, ICP, and controller settings |
| `slam_params` | Included `params/slam_toolbox.yaml` | Mapping settings, mapping launch only |
| `map` | Required | Saved map YAML, navigation launch only |

To adapt to your vessel, copy the included settings and pass `nav2_params:=/absolute/path/to/nav2_params.yaml`.

```bash
cp "$(ros2 pkg prefix --share pylon_demo_lidar_slam)/params/nav2_params.yaml" \
  "$HOME/pylon_maps/nav2_params.yaml"
```

| Setting | What to adjust |
|---|---|
| `robot_radius` in both costmaps | Planar vessel radius from the LiDAR origin; default 1.0 m |
| `FollowPath.max_vel_x` / `max_speed_xy` | Forward/planar speed limits; default 0.5 m/s |
| `max_planar_force` / `max_yaw_torque` | Requested force/torque limits |
| `linear_gain` / `angular_gain` | Gains for velocity error |
| `nav_to_body_yaw` | Yaw correction from LiDAR forward to vessel forward [rad] |
| `max_correspondence_distance` / `max_rmse` | ICP correspondence distance and rejection conditions |

## Main outputs and frames {#主な出力と座標系}

| Output | Content |
|---|---|
| `/pylon/lidar_slam/scan` | LaserScan connected to estimated frames |
| `/pylon/lidar_slam/odom` | Odometry accumulated from 2D ICP |
| `/map` | SLAM Toolbox map or loaded saved map |
| `/amcl_pose` | Estimated pose in the saved map (navigation) |
| `/cmd_vel` | Nav2 `geometry_msgs/msg/Twist` commands |

TF is `map → pylon_slam_odom → pylon_slam_base_link`. Mapping uses SLAM Toolbox; saved-map localization uses AMCL. Jazzy velocity commands use `Twist`. See [Nav2 velocity message configuration](https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/core_servers/configuring_behavior_server/).

Estimation becomes unstable in feature-poor areas, with moving objects dominating the view, or on steep slopes. If scans drift from the map, stop driving and check mounting direction, surrounding geometry, speed, and sensor intervals.
