---
title: Docker Setup and Operation
description: Pull a Jazzy image with the PyLoN bridge and connect to the host KSP mod. Container configuration, Compose, reception checks, stopping, and updating.
---

# Docker Setup and Operation {#dockerの構成・運用}

Pull and run a **Docker image containing ROS 2 Jazzy and the PyLoN bridge** from GHCR without installing ROS on the host. KSP 1.x and the PyLoN mod run on the host. This guide targets Linux KSP and Docker Engine on Ubuntu 24.04 x86_64.

## Docker distribution formats for ROS 2 OSS {#ros-2-ossのdocker配布形式}

The [official ROS images](https://hub.docker.com/_/ros) provide `ros-core` as the minimal configuration and `ros-base` with basic libraries and development tools. GUI variants such as `desktop` are provided as OSRF images. Containerized OSS adds ROS packages on top of these bases.

| Distribution | Purpose | User action |
| --- | --- | --- |
| Dockerfile and source | Define the base image, dependencies, and colcon build | Build an image with `docker build` |
| Prebuilt registry image | Obtain a built environment by tag or digest | Pull and run with `docker pull` |
| Compose file | Combine image, networking, environment variables, and startup settings | Start with `docker compose up` |

The official ROS [overlay workspace example](https://hub.docker.com/_/ros) and [Navigation2 Dockerfile](https://github.com/ros-navigation/navigation2/blob/main/Dockerfile) separate dependency resolution, build, and runtime stages, sourcing ROS through an entrypoint. PyLoN follows this approach, with its three core packages in one overlay.

PyLoN distributes **prebuilt GHCR images plus Dockerfile, entrypoint, and Compose configuration in the repository**. Mod ZIPs are on GitHub Releases; container images are on GitHub Packages (GHCR). The Dockerfile defines the build; users normally pull a prebuilt image.

## Container configuration {#コンテナ構成}

| Item | Details |
| --- | --- |
| Base | `ros:jazzy-ros-base-noble`, pinned to a validated digest in the Dockerfile |
| ROS / Python | Jazzy / Ubuntu 24.04 Python 3.12 |
| Build targets | `pylon_interfaces`, `pylon_bridge`, `pylon_vehicle_control` |
| Workspace | `/opt/pylon_ws/install`, independent of the host's `~/ros2_ws` |
| Execution | User `pylon`, UID 10001; the entrypoint sources ROS and the overlay, then runs commands with `exec` |
| DDS | Cyclone DDS, `ROS_DOMAIN_ID=0`, discovery range `LOCALHOST` |
| Networking | Linux host networking; KSP UDP uses loopback |
| Included | ROS, built PyLoN ROS packages, PyLoN LICENSE |
| On the host | KSP and the PyLoN mod; prepare RViz and demos separately if needed |

The `builder` stage resolves package.xml dependencies with rosdep and builds with colcon. The `test` stage runs regression tests; `runtime` copies installed artifacts and runtime dependencies. The `ros-base` foundation retains ROS development tools for CLI use and extension, but excludes PyLoN source, build directories, and local `Development/` files.

Configuration is in [core Docker/jazzy](https://github.com/PyLoN-sim/PyLoN/tree/main/Docker/jazzy). `.dockerignore` includes only core ROS source and container configuration in the build context. No KSP installation or game assets need to be copied or mounted.

## 1. Prepare the host and mod {#_1-ホストとmodを準備する}

Prepare Linux KSP following [Getting Started's Ubuntu and Steam/KSP requirements](getting-started.md#prerequisites). Install Docker Engine with the [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Install the Compose plugin if using Compose.

```bash
docker version         # Server information must appear
docker compose version # If using Compose

```

Follow the official [post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/) for Docker group permissions and make sure `docker version` succeeds.

Install the released mod using [Getting Started](getting-started.md#install-mod). For source builds, see [Core Development](../contributing/index.md#build-mod).

Keep KSP's `GameData/PyLoN/Config/Runtime.cfg` at its defaults.

```text
PYLON_TRANSPORT
{
    stateHost = 127.0.0.1
    statePort = 49010
    commandPort = 49011
}
```

Keep `PYLON_MODEL.allowRemoteUrdf=false` as well. Stop any existing host or Space ROS bridge so only one bridge receives UDP 49010.

## Distribution tags and version pinning {#配布タグとバージョン固定}

::: info Initial GHCR publication
A [PR adding the publication workflow](https://github.com/PyLoN-sim/PyLoN/pull/1) has been created. The pull commands below are unavailable until the first build and the Packages Public setting are complete. In that case, see [Core Development](../contributing/index.md#build-docker) for local builds.
:::

The image name is `ghcr.io/pylon-sim/pylon-bridge`.

| Reference | Purpose |
| --- | --- |
| `:jazzy` | Regular distribution, updated for main publication and official releases |
| `:jazzy-sha-<40-character commit SHA>` | Select the source commit used for publication |
| `:jazzy-vX.Y.Z` | Created when the `vX.Y.Z` GitHub Release is published |
| `@sha256:<digest>` | Pin the exact distributed image |

Check actual tags and digests in [Packages](https://github.com/orgs/PyLoN-sim/packages/container/package/pylon-bridge) or the GitHub Actions run summary. `vX.Y.Z` and `<digest>` are format examples. Match the source versions of the mod, host `pylon_interfaces`, and container. Public pulls do not need a GitHub login.

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
docker image inspect ghcr.io/pylon-sim/pylon-bridge:jazzy \
  --format '{{json .RepoDigests}}'
```

Use the resulting `ghcr.io/pylon-sim/pylon-bridge@sha256:...` as the image name in `docker run` to retain the same image even after `jazzy` changes.

## 2. Pull the image {#_2-イメージを取得する}

Normally, pull with:

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
```

To build an image after changing PyLoN source, see [Core Development](../contributing/index.md#build-docker).

## 3. Start the bridge container {#_3-bridgeコンテナを起動する}

```bash
docker run --rm -it --init --network host \
  --name pylon-jazzy \
  -e ROS_DOMAIN_ID=0 \
  ghcr.io/pylon-sim/pylon-bridge:jazzy
```

For a local build, replace the image name with `pylon-bridge:jazzy`.

`Listening on udp://127.0.0.1:49010` and command destination `127.0.0.1:49011` appear. Keep the terminal open and enter Flight in host KSP with the [Minimal Receiver](minimal-receiver.md) or another vessel, then unpause.

The [Docker host driver](https://docs.docker.com/engine/network/drivers/host/) shares the host network namespace. The container's `127.0.0.1` reaches KSP, so neither UDP destination changes nor `-p` are needed. On a normal Docker bridge network, loopback refers to the container itself and these instructions will not connect. Windows, macOS, WSL, and Docker Desktop are outside this validation scope.

To change bridge options, provide the entire command after the image name.

```bash
docker run --rm -it --init --network host --name pylon-jazzy \
  ghcr.io/pylon-sim/pylon-bridge:jazzy \
  ros2 run pylon_bridge udp_bridge --host 127.0.0.1 --disable-ground-truth
```

See [Bridge Options](../reference/bridge-options.md) for arguments.

## 4. Check reception from KSP {#_4-kspからの受信を確認する}

Run in another terminal. `docker exec` does not run the entrypoint automatically; **include `/pylon-entrypoint.sh`** to load ROS and PyLoN environments.

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic list --no-daemon
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-durability transient_local /pylon/status
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/simulator/state
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/lifecycle
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-durability transient_local /ksp_vessel/root_frame
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
```

Check continuous rates with `hz` and stop with Ctrl+C. `listening` on `/pylon/status` confirms the listener. To confirm **connection to KSP**, check `communication_alive: true` in `simulator/state`, `state: 1` and a nonempty `vessel_id` in lifecycle, and continuous IMU reception. In Flight with the model enabled, also confirm `model_ready: true` and a nonempty `root_frame`.

If the minimal vessel's LiDAR ID is `front_lidar`, check point clouds below. For other vessels, replace it with the actual ID from the topic list.

```bash
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz \
  /ksp_vessel/lidar_3d/front_lidar/points

# Shell for trying commands inside the container
docker exec -it pylon-jazzy /pylon-entrypoint.sh bash --norc
```

## 5. Start with Compose {#_5-composeで起動する場合}

Use the same image and settings with Compose. Stop the container from step 3 first. Obtain the Compose file by cloning the repository (Git is needed for this step), then change to its root. If already cloned, use that checkout.

```bash
mkdir -p ~/src
git clone https://github.com/PyLoN-sim/PyLoN.git ~/src/PyLoN
cd ~/src/PyLoN
```

```bash
docker compose -f Docker/jazzy/compose.yaml pull
docker compose -f Docker/jazzy/compose.yaml up --no-build -d
docker compose -f Docker/jazzy/compose.yaml logs -f bridge
# Stop following logs with Ctrl+C, then check reception separately
docker compose -f Docker/jazzy/compose.yaml exec bridge \
  /pylon-entrypoint.sh ros2 topic echo --once \
  --qos-reliability best_effort /ksp_vessel/simulator/state
docker compose -f Docker/jazzy/compose.yaml down
```

For a local build, start with `PYLON_JAZZY_IMAGE=pylon-bridge:jazzy docker compose -f Docker/jazzy/compose.yaml up --build -d`.

Change the DDS domain, for example with `ROS_DOMAIN_ID=7 docker compose -f Docker/jazzy/compose.yaml up -d`. Host networking means changing the domain does not avoid UDP port 49010 conflicts.

## Connect host ROS applications and RViz {#ホストのrosアプリ・rvizを接続する}

If Jazzy is installed on the host, access container topics through DDS. Getting Started checks reception only inside Docker; host applications require additional preparation.

If Jazzy is missing, register its repository with the [official ROS 2 Ubuntu 24.04 instructions](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html) and install `ros-jazzy-ros-base` and `ros-dev-tools`. Then [obtain PyLoN source](../contributing/index.md#source-setup) matching the container's version and run from its root.

```bash
source /opt/ros/jazzy/setup.bash
if [ ! -f /etc/ros/rosdep/sources.list.d/20-default.list ]; then
  sudo rosdep init
fi
rosdep update
rosdep install --from-paths \
  Ros2/pylon_interfaces Ros2/pylon_bridge Ros2/pylon_vehicle_control \
  --ignore-src --rosdistro jazzy -y
./sync.sh --skip-ksp-build --skip-ksp-sync
```

Source the environment in the terminal used for host applications.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
export ROS_DOMAIN_ID=0
export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST
ros2 topic list --no-daemon
ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/imu/data_raw
```

Applications using custom messages need `pylon_interfaces` from the same source version as the container. Update the host workspace with `./sync.sh --skip-ksp-build --skip-ksp-sync`. Build independently in each environment without sharing `build/` or `install/`. The container bridge receives KSP UDP, so run only applications on the host.

## Stopping, updating, and logs {#停止・更新・ログ}

Stop `docker run` with Ctrl+C or `docker stop pylon-jazzy` in another terminal. `--rm` removes the stopped container, leaving the image. Save logs before stopping if needed.

```bash
docker logs pylon-jazzy > pylon-jazzy.log
docker stop pylon-jazzy
```

Pull the distributed image with `docker pull`, then recreate the container. With Compose, use `pull` followed by `up --no-build -d`. For rebuilding local images after ROS source changes, see [Core Development](../contributing/index.md#build-docker). For mod changes, close KSP, update the mod, and restart KSP.

## Validation record {#検証記録}

Validated on 2026-10-06 (JST) with Ubuntu 24.04 x86_64, Docker Engine 29.1.3, and Linux KSP 1.12.5. The official base digest is `sha256:066420e07f60aa18262f2479981def87ebcfcec42eefb0c0c57c4a46098348ca`.

| Check | Result |
| --- | --- |
| Three core packages | Successful colcon build inside the container |
| Regression tests | 190 bridge tests and 28 vehicle control tests; all 218 passed |
| Real KSP IMU | 160 messages over about 12 seconds, continuously received with distinct timestamps |
| 3D LiDAR | 104 messages, 1289 points per frame |
| RGB images | 93 messages, 320×240, rgb8, 230400 bytes per frame |
| Vessel model | 12-link URDF, `model_ready=true`, dynamic/static TF received |
| Session | Matching lifecycle and simulator vessel IDs, continuous communication and advancing UT |
| Command round trip | Acquire → release authority without movement commands; KSP returned `lease_acquired` / `lease_released` and sequence 1 → 2, returning to Player |
| Host Jazzy / Fast DDS | Subscribed to IMU, point clouds, images, and model of the same vessel through DDS |
| Compose | Started with host networking and received `communication_alive=true` and advancing UT from real KSP |

The real KSP check used an existing rover, `rober B`, with LiDAR and camera, entering Flight from a copied original save through a local development launcher. This checked connectivity using a local mod with the launcher added; the container and public instructions do not depend on `Development/`. The minimal receiver was not newly assembled in this validation. Flight control demos and operation of every actuator were outside this check's scope.

## Troubleshooting {#トラブルシュート}

| Symptom | Check |
| --- | --- |
| Docker socket `permission denied` | Docker permissions and a new login |
| `Address already in use` | Host, Space ROS, or another container bridge using UDP 49010 |
| Name `pylon-jazzy` already in use | Check `docker ps -a` and stop the previous test container |
| Only `/pylon/status` is visible | Enter Flight; check mod placement, Runtime.cfg, and host networking |
| `ros2` or PyLoN types are missing | Include `/pylon-entrypoint.sh` in `docker exec` |
| No point clouds | LiDAR power, enable state, and actual Sensor ID |
| Host cannot see topics | Match domain and discovery range; check with `--no-daemon` |

This configuration receives models over loopback, so `--allow-remote-models` is unnecessary. For communication with another host, see [Model Transport](../api/vessel-model.md) and [Bridge Options](../reference/bridge-options.md).
