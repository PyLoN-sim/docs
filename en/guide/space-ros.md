# Running with Space ROS {#space-rosで動かす}

You can build and run PyLoN's bridge and vehicle control packages in the official Space ROS container. KSP runs on the host PC.

The target platform is Linux x86_64. The official `osrf/space-ros:jazzy-2026.07.0` image is pinned by digest, using the ROS libraries at `/opt/ros/spaceros` in the container. Build outputs are separate from the host's `~/ros2_ws`.

## How to follow this page {#このページを読む順序}

- **Space ROS only**: Prepare Ubuntu, KSP, Docker, and the mod with [Getting Started, steps 1–2](getting-started.md) → build and run on this page → [Minimal Receiver](minimal-receiver.md). Skip step 3 onward for the Jazzy image.
- **Switching from the Jazzy container**: Confirm reception with Getting Started → stop the bridge with `docker stop pylon-jazzy` → start the Space ROS bridge on this page.
- **Using host Jazzy applications and RViz**: Prepare Jazzy and PyLoN packages from the same source version on the host, then follow “Using host ROS 2.”

KSP runs on the host in all configurations; it is not included in the Space ROS container. To build the mod from source, follow [Core Development](../contributing/index.md#mod-tools).

## Prerequisites {#準備}

If Docker is not yet installed on Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo usermod -aG docker "$USER"
```

Log out and back in, then check that `docker version` displays Server information. To refresh only the current terminal, run `newgrp docker`.

See [Getting Started](getting-started.md#install-mod) for installing the released KSP mod, or [Core Development](../contributing/index.md#build-mod) for source builds. [Obtain the source](../contributing/index.md#source-setup) before running the Space ROS scripts below. ROS does not need to be installed on the host.

## Build and run {#ビルドと起動}

Run from the repository root.

```bash
./spaceros.sh build
./spaceros.sh test
./spaceros.sh run
```

This builds `pylon_interfaces`, `pylon_bridge`, and `pylon_vehicle_control`. The first build downloads the official image. Run `build` again after changing sources. RViz is not included in this image.

Start the dedicated Phoenix launch, satellite separation, and retropropulsive landing demo with `pylon_demo_reusable/spaceros.sh demo` in the demos repository. See the [Demo Guide](../demos/reusable-launch.md) for lifecycle startup conditions, vessel placement, and validation scope.

`run` listens on UDP port 49010 and sends commands back to 49011. Stop the host bridge before starting it. Linux host networking allows KSP's `stateHost` and the bridge's `--command-host` to remain `127.0.0.1`.

Build the [Minimal Receiver](minimal-receiver.md) and enter Flight. Open another terminal in the PyLoN repository root and run the commands below. The minimal vessel page lists success criteria, including point clouds.

```bash
./spaceros.sh exec ros2 topic list --no-daemon
./spaceros.sh exec ros2 topic echo --once /ksp_vessel/lifecycle
./spaceros.sh exec ros2 topic echo --once /ksp_vessel/imu/data_raw
```

To try arbitrary Space ROS commands, open a new shell with `./spaceros.sh shell`. Stop the running bridge with Ctrl+C or `./spaceros.sh stop` in another terminal.

Pass bridge options after `run`.

```bash
./spaceros.sh run --disable-ground-truth
```

## Using host ROS 2 {#ホストのros-2から使う}

Space ROS uses Cyclone DDS. Existing Jazzy applications and RViz can communicate on the same `ROS_DOMAIN_ID`. The default is `0`, with DDS discovery set to `LOCALHOST`.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
export ROS_DOMAIN_ID=0
export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST
ros2 topic list --no-daemon
```

Only the Space ROS bridge receives UDP; host applications and RViz subscribe through DDS. Do not start another `udp_bridge` on the host. Keep `~/ros2_ws` and the container workspace separate: do not source both overlays together or share `build/` and `install/`. Build each environment from the same source revision.

For demos using Jazzy launch files, such as debris orbit, build and launch the demo on the host. The core `./spaceros.sh build` does not include demos. To run a demo entirely in Space ROS, check whether that demo provides dedicated Space ROS instructions.

Host applications using PyLoN's custom messages need `pylon_interfaces` built from the same source. You can update the host workspace with `./sync.sh --skip-ksp-build --skip-ksp-sync` as usual.

## Validation scope {#検証範囲}

On 2026-09-21, the three packages built successfully and 119 regression tests passed with the Space ROS image above. UDP/DDS integration tests covered IMU, 2D/3D LiDAR, split RGB images, command return, command suppression on communication timeout, and reconnection.

For real KSP integration, a development launcher started a Mun rover, and we received 320×240 RGB images, 3D point clouds, IMU, a 12-link vessel model, and TF. Authority acquisition and release were checked without sending movement commands. Subscription from host ROS 2 Jazzy / Fast DDS was also validated.

## Troubleshooting {#トラブルシュート}

- Docker socket `permission denied`: Log in again after joining the Docker group, or run `newgrp docker`.
- UDP `Address already in use`: Stop the other bridge running on the host.
- Container name `pylon-spaceros` already in use: Stop it with `./spaceros.sh stop` before retrying.
- Only `/pylon/status` is visible: Enter Flight in KSP and check the mod's destination and UDP ports.
- Topics are invisible from the host: Match `ROS_DOMAIN_ID` and discovery settings on both sides, and use `ros2 topic list --no-daemon` to avoid a stale CLI daemon.

Official resources: [Space ROS Getting Started](https://space-ros.github.io/docs/rolling/Getting-Started.html), [Official Images](https://hub.docker.com/r/osrf/space-ros/tags), [Docker Installation](https://docs.docker.com/engine/install/ubuntu/).
