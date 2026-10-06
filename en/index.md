---
layout: home

hero:
  name: PyLoN
  text: Turn KSP into a ROS2 Robot
  tagline: Setup guides and API references for sensors, motors, wheels, propulsion, vehicle Wrench, and Ground Truth through ROS2.
  actions:
    - theme: brand
      text: Getting Started
      link: /en/guide/getting-started
    - theme: alt
      text: Browse Topics
      link: /en/api/topics

features:
  - icon: ◉
    title: Sensors
    details: Publish LaserScan, PointCloud2, Image, and CameraInfo to topics organized by Sensor ID.
    link: /en/parts/lidar
  - icon: ↻
    title: Robotics
    details: Control rotary/linear joints and stock KSP wheels through typed topics with leases.
    link: /en/parts/motors
  - icon: ▲
    title: Propulsion
    details: Automatically detect stock engines and RCS, controlling individual thrust, main throttle, and six-axis inputs.
    link: /en/parts/propulsion
  - icon: ◇
    title: Vehicle I/O
    details: Expose Body Wrench, Ground Truth, typed per-part actuators, proxy URDF, and TF.
    link: /en/api/vehicle-control
---

## Start developing with PyLoN {#pylonで開発を始める}

Documentation for building ROS2 nodes that process KSP sensor data and applications that control vessels through PyLoN.

1. Install the mod and start Jazzy and the bridge in Docker with [Getting Started](/en/guide/getting-started), then check vessel information and point clouds with the [Minimal Receiver](/en/guide/minimal-receiver).
2. Learn to subscribe to topics and connect control nodes in [Building ROS2 Applications](/en/guide/application-development).
3. Find message types, units, frames, and operating conditions in the [Topic Reference](/en/api/topics) and part APIs.

## Demos {#デモ}

The [Demo Index](/en/demos/) covers vessel preparation, startup, behavior checks, and stopping.

- [Debris Orbit and Imaging](/en/demos/debris-orbit)
- [2D LiDAR and SLAM](/en/demos/lidar-slam): mapping, saving maps, and Nav2 driving
- [Mun Nav2](/en/demos/mun-nav2)

## API reference {#apiリファレンス}

- [Topic Reference](/en/api/topics): sensor, vessel state, and actuator I/O
- [Vehicle Control](/en/api/vehicle-control): authority acquisition, Wrench commands, and Ground Truth
- [Vessel Model and TF](/en/api/vessel-model): receiving URDF and displaying it in RViz
- [Bridge Options](/en/reference/bridge-options) and [Part Configuration](/en/reference/part-config): communication endpoints and feature settings
- [Troubleshooting](/en/reference/troubleshooting): installation and operation checks

## Contributing to PyLoN core {#pylon本体への貢献}

Procedures for changing the mod, bridge, messages, and documentation are in the final [Contributing to PyLoN Core](/en/contributing/) section.
