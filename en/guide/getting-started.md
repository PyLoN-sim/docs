---
title: Getting Started
description: Install the released PyLoN mod and Docker image, then receive vessel information and 3D LiDAR point clouds from KSP.
---

# Getting Started {#getting-started}

**Use the released PyLoN mod and Docker image to receive vessel information and 3D LiDAR point clouds from KSP.** KSP and the mod run on the host; ROS 2 Jazzy and the PyLoN bridge run in Docker.

## 1. Prepare KSP and Docker {#prerequisites}

This guide targets Linux KSP 1.x and Docker Engine on the same Ubuntu Desktop 24.04 LTS x86_64 PC. Connectivity has been checked with KSP 1.12.5.

1. Install and start [KSP](https://store.steampowered.com/app/220200/Kerbal_Space_Program/), then create a Sandbox save. No DLC or other mods are required.
2. Exit KSP and find its installation through Steam's “Manage” → “Browse local files.”
3. Install Docker Engine using the [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Complete the [post-installation permission setup](https://docs.docker.com/engine/install/linux-postinstall/) and confirm that the following displays Server information.

```bash
docker version
```

## 2. Install the PyLoN mod {#install-mod}

**With KSP closed**, download and extract `PyLoN-vX.Y.Z.zip` from [Releases](https://github.com/PyLoN-sim/PyLoN/releases). Copy the entire `GameData/PyLoN` folder into KSP's `GameData`. “Source code” archives do not contain a built mod.

```text
Kerbal Space Program/
└── GameData/
    └── PyLoN/
        ├── Plugins/PyLoN.dll
        ├── Config/Runtime.cfg
        ├── Config/ControlSafety.cfg
        ├── Models/
        └── Parts/
```

Do not nest it one level too deep, such as `GameData/GameData/PyLoN`. When updating, back up the existing `Config/Runtime.cfg` before copying. No configuration changes are needed for the first setup.

## 3. Download the Docker image {#download-image}

Pull the image containing ROS 2 Jazzy and the PyLoN bridge. You do not need ROS installed on the host.

```bash
docker pull ghcr.io/pylon-sim/pylon-bridge:jazzy
```

::: info Image publication preparation
Pulls are unavailable until the initial GHCR build and Packages Public setting are complete. See [Docker Setup and Operation](docker.md#配布タグとバージョン固定) for publication details.
:::

Use matching versions of the mod and container. [Docker Setup and Operation](docker.md#配布タグとバージョン固定) also explains version pinning. The image does not include KSP or the mod.

## 4. Start the bridge {#start-bridge}

Run in terminal A and keep it open. Commands are for bash.

```bash
docker run --rm -it --init --network host \
  --name pylon-jazzy \
  -e ROS_DOMAIN_ID=0 \
  ghcr.io/pylon-sim/pylon-bridge:jazzy
```

The bridge is listening when `Listening on udp://127.0.0.1:49010` and command destination `127.0.0.1:49011` appear. Linux host networking connects with the mod's default `Runtime.cfg`. Stop any other running bridge first.

## 5. Launch a vessel in KSP {#_5-kspで機体を出す}

Start KSP and build the [minimal receiver vessel “PyLoN Receiver”](minimal-receiver.md). It uses three parts: a Mk1 Lander Can, Z-100 battery, and PyLoN LiDAR 3D. Set the LiDAR Sensor ID to `front_lidar`.

Launch into Flight, unpause, and use normal speed (1×). You can check reception while sitting on the launchpad.

## 6. Check reception {#_6-受信を確認する}

Run these in order in a separate terminal B. Include `/pylon-entrypoint.sh` in `docker exec` to load the ROS environment. Stop each `hz` command with Ctrl+C after a few lines, then continue.

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo \
  --once --qos-reliability best_effort /ksp_vessel/simulator/state
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz \
  /ksp_vessel/lidar_3d/front_lidar/points
```

| Check | Expected result |
| --- | --- |
| simulator | `communication_alive: true` and `simulation_advancing: true` |
| IMU and 3D LiDAR | Continuous `average rate` output for each |

If reception fails, see [Troubleshooting](../reference/troubleshooting.md). For vessel model checks and more, see the [Minimal Receiver checks](minimal-receiver.md).

## Stop and continue {#停止と次のステップ}

Press Ctrl+C in terminal A, or stop with the command below. Next time, start from step 4.

```bash
docker stop pylon-jazzy
```

See [Docker Setup and Operation](docker.md) for updates, Compose, and RViz connections, [Building ROS2 Applications](application-development.md) for your own nodes, and the [Demo Index](../demos/index.md) for examples.

Environment setup and builds for changing PyLoN itself are in [Core Development](../contributing/index.md). For Space ROS, prepare KSP, Docker, and the mod with steps 1–2, then continue to [Running with Space ROS](space-ros.md).
