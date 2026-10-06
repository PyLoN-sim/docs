# Minimal Receiver Vessel {#最小受信確認用機体}

**PyLoN Receiver** is a three-part vessel for checking lifecycle, IMU, the vessel model, and 3D point clouds while sitting on the launchpad. First install the mod and bridge through [Getting Started](getting-started.md), [Jazzy in Docker](docker.md), or [Space ROS](space-ros.md). Use a Sandbox save in KSP 1.x.

This page explains how to build and save the same configuration in the VAB. No downloadable `.craft` or in-flight save is included. This assembly procedure has not yet been freshly validated in a real KSP session.

## Parts and placement {#部品と取り付け}

If a part is difficult to find in a localized UI, enter part of its English name from the table in the part search.

| Part | Count | Placement and purpose |
| --- | ---: | --- |
| Mk1 Lander Can | 1 | Place first as the root, with the broad bottom facing down and one crew member aboard |
| Z-100 Rechargeable Battery Pack | 1 | Attach to the side of the pod and fill Electric Charge |
| PyLoN LiDAR 3D | 1 | Surface-attach to another side of the pod, with the dome facing outward |

1. Create a new vessel in the VAB and attach the three parts in the order above. Use one of each without symmetry. Keep all parts above the bottom of the pod.
2. Orient the LiDAR so that the ground is within the forward hemisphere on the dome side. Keep the battery and pod out of its field of view.
3. Right-click the LiDAR and set `Edit ROS2 Sensor ID` to `front_lidar`. Enable LiDAR and UDP streaming, and select Medium (100 m) at 10 Hz.
4. Save as `PyLoN Receiver`, confirm one crew member, and Launch. No engine, fuel tank, separator, RCS, or camera is needed.
5. Unpause Flight and use 1× time. Keep the same vessel active during reception checks and make sure the battery has not run out.

This vessel is for reception checks. Do not start control demos or `setpoint_controller`; there is no need to stage with Space. Add a power supply for extended use, and begin by checking reception briefly.

## Check reception with Jazzy in Docker {#dockerのjazzyで受信を確認する}

Keep the `pylon-jazzy` container from [Getting Started, step 4](getting-started.md#start-bridge) running and execute these commands in another terminal. Stop each `hz` command with Ctrl+C after a few lines.

```bash
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo --once --qos-durability transient_local /pylon/status
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/lifecycle
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/imu/data_raw
docker exec -it pylon-jazzy /pylon-entrypoint.sh ros2 topic hz /ksp_vessel/lidar_3d/front_lidar/points
docker exec pylon-jazzy /pylon-entrypoint.sh ros2 topic echo --once --qos-durability transient_local /ksp_vessel/root_frame
```

## Check reception with Space ROS {#space-rosで受信を確認する}

Stop the host bridge, then run `./spaceros.sh run` from the PyLoN repository root. Open another terminal in the same root and use the container's ROS CLI. You do not need to source host Jazzy.

```bash
./spaceros.sh exec ros2 topic echo --once --qos-durability transient_local /pylon/status
./spaceros.sh exec ros2 topic echo --once --qos-reliability best_effort /ksp_vessel/lifecycle
./spaceros.sh exec ros2 topic hz /ksp_vessel/imu/data_raw
./spaceros.sh exec ros2 topic hz /ksp_vessel/lidar_3d/front_lidar/points
./spaceros.sh exec ros2 topic echo --once --qos-durability transient_local /ksp_vessel/root_frame
```

## Success criteria and diagnosis {#成功条件と切り分け}

| Observation | Expected result |
| --- | --- |
| bridge | `listening` on `/pylon/status`. This alone does not confirm reception from KSP |
| lifecycle | `state: 1` (ACTIVE), nonempty `vessel_id` and `runtime_epoch` |
| IMU / point clouds | Continuous `average rate` output for both. LiDAR is configured for 10 Hz; the measured rate also depends on KSP execution speed |
| Vessel model | `model_ready: true` after loading and a nonempty `root_frame` |

If the point cloud topic exists but RViz shows nothing, check that the sensor is not pointing at the sky and that the ground is within its 100 m field of view. Use `Fixed Frame: base_link` and `Best Effort` in RViz. If the vessel wobbles, return to the VAB and move any parts that prevent the bottom from resting on the ground.

Once confirmed, stop the bridge with Ctrl+C and continue to [Application Development](application-development.md) or the [Demo Index](../demos/index.md). Prepare demo vessels separately using their guides.
