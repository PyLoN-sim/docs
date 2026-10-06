# 2D / 3D LiDAR {#_2d-3d-lidar}

2D LiDAR streams planar scans; 3D LiDAR streams forward hemisphere point clouds. Both use ROS sensor coordinates: `+X` forward, `+Z` up.

## Input and output topics {#入出力topic}

| Part | Input Topic | Output Topic | Type |
|---|---|---|---|
| PyLoN LiDAR 2D | None | `/ksp_vessel/lidar_2d/<lidar_2d_id>/scan` | [`sensor_msgs/msg/LaserScan`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/LaserScan.html) |
| PyLoN LiDAR 3D | None | `/ksp_vessel/lidar_3d/<lidar_3d_id>/points` | [`sensor_msgs/msg/PointCloud2`](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/PointCloud2.html) |

## 2D LaserScan {#_2d-laserscan}

- `angle_min` is `-1/2` of horizontal FOV.
- A 360° scan uses `angle_increment = FOV / horizontalCount`; narrower scans include both endpoints and use `FOV / (horizontalCount - 1)`.
- `scan_time` is `1 / scanRateHz`; `time_increment` is `scan_time / horizontalCount`.
- `range_min` is `0.0`; `range_max` is the part's maximum distance.
- KSP no-hit values `-1`, nonfinite values, and out-of-range values become ROS `+Inf`.
- `intensities` is empty.

```bash
ros2 topic echo /ksp_vessel/lidar_2d/front_lidar/scan
```

## 3D PointCloud2 {#_3d-pointcloud2}

- This is an unorganized point cloud with `height = 1`.
- Fields are `x`, `y`, `z`, all little-endian `FLOAT32`.
- `point_step = 12` bytes.
- Misses are excluded from the cloud, and `is_dense = true`.
- Current 3D parts use a Fibonacci hemisphere layout. KSP sends ranges only; the bridge reconstructs known ray directions and converts them to points.

```bash
ros2 topic echo --once /ksp_vessel/lidar_3d/roof_lidar/points
```

## Defaults {#既定設定}

| Setting | 2D | 3D |
|---|---:|---:|
| Scan rate | 10 Hz | 10 Hz |
| Horizontal FOV | 360° | 360° |
| Ray count | 180 | About 2011 with Medium |
| Maximum distance | 2000 m | 100 m with Medium |
| UDP destination | `127.0.0.1:49010` | `127.0.0.1:49010` |
| Ignore own-vessel collisions | Enabled | Enabled |

For 3D, select these profiles in the Part Action Window.

| Profile | Distance range | Density | Default distance | Approximate ray count |
|---|---:|---:|---:|---:|
| Near | 10〜30 m | 160 rays/sr | 30 m | 1005 |
| Medium | 50〜150 m | 320 rays/sr | 100 m | 2011 |
| Long | 150–250 m | 1024 rays/sr | 250 m | 4096 (ray limit) |

## Topic creation and removal {#topic作成と削除}

Transmission starts in Flight with `lidarEnabled` and `udpEnabled` enabled. Topics are created on the first scan and removed on the Flight-exit inactive notification or reception timeout. `streamAt20Fps` ignores `scanRateHz` and fixes the rate at 20 Hz.

Each LiDAR has a persistent ID editable with `Edit ROS2 Sensor ID` in the VAB/SPH. New 2D and 3D parts receive `lidar_2d_<8-digit UID>` and `lidar_3d_<8-digit UID>`, passed to the bridge as UDP `sensorId`.

## Frame {#frame}

When `partFlightId` matches the active vessel model, `frame_id` is a child LiDAR frame of the vessel link. Without a model, these fallbacks apply:

```text
<frame_prefix>_<sensor_id>_lidar
```

The default `frame_prefix` is `pylon`.

## Mounting and measurement origin {#取り付けと計測原点}

The 2D origin is part-local `(0, 0, -0.032)`; the 3D origin is `(0, 0, 0.059)`, 2 mm beyond the dome apex. 3D scans a hemisphere centered on the outward normal of the mounting surface. See [Part Configuration](../reference/part-config.md) for axes and origins.

## Laser preview {#レーザープレビュー}

Right-click a LiDAR in the VAB/SPH or Flight and select `Show Laser Preview` to display its laser lines. Use `Hide Laser Preview` to hide them. Add `Toggle Laser Preview` to an action group if desired.
