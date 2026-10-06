# Demos {#デモ}

Sample applications using PyLoN sensors and control APIs. Each page lists vessels, extra packages, startup order, how to inspect results, and stopping/resuming.

## Choose a demo {#デモを選ぶ}

| Demo | Capabilities | Vessel / sensors | Bridge startup |
|---|---|---|---|
| [Debris Orbit and Imaging](debris-orbit.md) | Relative motion estimation, RCS orbit control, imaging every 36° | Six-axis RCS, 3D LiDAR, RGB camera, nearby debris | Separate terminal |
| [2D LiDAR and SLAM](lidar-slam.md) | Mapping, saving maps, Nav2 with saved maps | Horizontally mounted 2D LiDAR, vessel capable of planar movement | Separate terminal |
| [Mun Nav2](mun-nav2.md) | Local mapping, autonomous driving to RViz goals | Front-steering rover on the Mun, 3D LiDAR | Started by launch |
| [Satellite Separation and Retropropulsive Landing](reusable-launch.md) | Lifecycle-managed launch, separation, and return (real flight unvalidated) | Included PyLoN Phoenix | Started by launch |

The repository also contains `pylon_demo_position_estimator` for estimating 6DoF position from 3D LiDAR alone. See `../demos/pylon_demo_position_estimator/README.md` for startup.

## Prepare the repositories {#リポジトリの準備}

Demo implementations are in [PyLoN-sim/demos](https://github.com/PyLoN-sim/demos). Clone beside the core repository. Commands in the following guides run from `~/src/PyLoN`.

```bash
git clone https://github.com/PyLoN-sim/demos.git ~/src/demos
cd ~/src/PyLoN
```

For another location, adjust `PYLON_DEMOS_DIR` and command paths using `../demos`.

## Shared preparation {#共通の準備}

1. Install the mod and Jazzy bridge in Docker and check communication with [Getting Started](../guide/getting-started.md). The core image does not include demos. Host instructions below additionally require host Jazzy, colcon, rosdep, and PyLoN packages. Dedicated Space ROS container instructions are available in individual guides where provided.
2. Prepare a suitable vessel using normal KSP operations. Demos do not generate vessels or saves automatically.
3. Install extra dependencies and sync demos following each page. Build ament packages; debris orbit runs directly from Python source.
4. Source ROS in every terminal used for startup.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
```

If using another workspace, replace `~/ros2_ws` with the actual path and set the same `ROS2_WS` for sync commands.

To install all demos together, run from the repository root.

```bash
source /opt/ros/jazzy/setup.bash
rosdep install --from-paths Ros2 ../demos --ignore-src --rosdistro jazzy -y
./sync.sh --skip-ksp-build --skip-ksp-sync --all-demos
source ~/ros2_ws/install/setup.bash
```

Install debris orbit's NumPy, SciPy, PyYAML, and other Python dependencies using its [preparation steps](debris-orbit.md#_1-pythonデモの実行環境を準備する). This demo is synced but not built by colcon.

This sync adds ROS2 components using the mod installed with Getting Started. To update the mod too, exit KSP, run `./sync.sh --all-demos`, then restart KSP.

## Choose the environment and vessel {#環境と機体を選ぶ}

First install the Docker bridge with [Getting Started](../guide/getting-started.md) and check communication with the [Minimal Receiver](../guide/minimal-receiver.md), then prepare the demo vessel. To combine a Space ROS bridge with host Jazzy demos, follow [host integration](../guide/space-ros.md#ホストのros-2から使う) and avoid starting a second host bridge.

Loading a `.craft` alone does not establish debris orbit's initial state. Check [pre/post-separation saves and startup conditions](debris-orbit.md#分離前の状態を保存する).

## Sensor IDs and startup order {#sensor-idと起動順}

`front_lidar` and `orbit_camera` on each page are examples. Set them with `Edit ROS2 Sensor ID` in VAB/SPH part menus, or change startup arguments to actual IDs.

Run only one bridge for the same KSP. If a demo starts its own bridge, stop the `pylon-jazzy` container from Getting Started first. Orbit and 2D SLAM use a separate bridge; Mun Nav2 uses its launch-managed bridge. Run one control demo at a time and stop it before switching.

## If inputs are missing {#入力を受信できない場合}

First check that `/ksp_vessel/lifecycle` is ACTIVE and sensor topics are arriving. See [Troubleshooting](../reference/troubleshooting.md) for checks and [Bridge Options](../reference/bridge-options.md) for endpoints.
