# Active Vessel Model {#active-vesselモデル}

The shape and part placement of the active vessel in Flight are exposed as a simplified URDF and TF for RViz.

## Output topics {#出力topic}

| Topic | Type | QoS | Content |
|---|---|---|---|
| `/ksp_vessel/robot_description` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / transient local / depth 1 | URDF string |
| `/ksp_vessel/root_frame` | [`std_msgs/msg/String`](https://docs.ros.org/en/jazzy/p/std_msgs/msg/String.html) | Reliable / transient local / depth 1 | Root link name |
| `/tf` | [`tf2_msgs/msg/TFMessage`](https://docs.ros.org/en/jazzy/p/tf2_msgs/msg/TFMessage.html) | dynamic | From `base_link` to the CoM-based proxy root |
| `/tf_static` | [`tf2_msgs/msg/TFMessage`](https://docs.ros.org/en/jazzy/p/tf2_msgs/msg/TFMessage.html) | Reliable / transient local | Fixed joints and sensor mount frames |
| `/ksp_vessel/lifecycle` | [`pylon_interfaces/msg/VesselLifecycle`](/en/api/interfaces/msg/VesselLifecycle) | Reliable / transient local | vessel ID、generation、model readiness |

```bash
ros2 topic echo --once /ksp_vessel/root_frame
ros2 topic echo --once /ksp_vessel/robot_description
```

## RViz2 {#rviz2}

1. Check the root name with `ros2 topic echo --once /ksp_vessel/root_frame`.
2. Set RViz2's Fixed Frame to that value.
3. Set RobotModel's Description Source to Topic.
4. Set Description Topic to `/ksp_vessel/robot_description`.

The bridge publishes fixed URDF joints to `/tf_static` and updates only the root edge affected by CoM changes through `/tf`, at 5 Hz by default. A separate `robot_state_publisher` is unnecessary for this display.

## Updates and expiry {#更新と期限切れ}

- The active vessel model is sent during Flight, including vessels without sensor parts.
- Each update captures every part's current shape and relative pose. URDF and TF reflect deployment, movement, and resizing as well as configuration changes, as periodic snapshots rather than continuous animation.
- The default refresh interval is two seconds.
- Received models expire after `max(3 seconds, refresh interval × 3)`, six seconds by default.
- A clear message is sent on active vessel switches or Flight exit.
- Periodic retransmission with the same vessel ID and model hash does not recreate the proxy.
- If Ground Truth detects a vessel switch first, a mismatching model is disconnected immediately.
- On clear or expiry, empty strings are published to the URDF and root frame topics.

## Connecting sensor frames {#センサーframeとの接続}

When a received sensor packet's `partFlightId` exists in the URDF part mapping, the bridge publishes the sensor pose as a child of the corresponding link through `/tf_static`. LiDAR / Image / CameraInfo `frame_id` values match stable child frames named `pylon_<sensor_id>_<kind>_frame`.

The same sensor frame name is used when the model is absent, expired, or lacks the part mapping, but it is not connected to vessel TF. Check `VesselLifecycle.model_ready` to distinguish these cases.

## Model geometry and acceptance rules {#モデルの形状と受信条件}

- Link names are anonymous and include a short prefix from KSP's persistent vessel ID. They remain stable when the same vessel is reloaded and do not collide between vessels.
- All vessel parts are scanned without a stock/DLC/mod part-name lookup table.
- Visual / collision geometry uses only boxes, cylinders, and spheres approximating render elements. SkinnedMesh animation local bounds are approximated with boxes.
- If no render element exists, non-trigger colliders are approximated. Parts without either receive a 25 cm box.
- Each part has at most 48 shapes; excess shapes are combined into one enclosing box.
- Link coordinates are in meters. Part scale is applied to positions and dimensions; cylinder axes are converted to URDF's Z axis.
- Mesh colliders are also simplified to nearby primitives; original meshes are not included.
- No `GameData` paths, part names, manufacturer names, or textures are included.
- gzip, base64, SHA-256, chunk counts, and expanded size are validated.
- XML accepts only allowed URDF tags and attributes, rejecting `mesh`, external URIs, DTDs, and entities.
- The bridge retains URDF only in memory without writing a file.

By default, model packets from non-loopback sources are rejected. Only for a separate host, enable both KSP's `allowRemoteUrdf = true` and the bridge's `--allow-remote-models`. ROS2 topic reach follows DDS configuration; use `ROS_LOCALHOST_ONLY=1` or SROS2 if needed.

## Shared model configuration {#共通モデル設定}

Configure transmission under `PYLON_MODEL` in `GameData/PyLoN/Config/Runtime.cfg`; destinations are shared under `PYLON_TRANSPORT`. This is independent of LiDAR presence or settings. See [Part Configuration](../reference/part-config.md). Model settings are reloaded on vessel switches or Flight entry.
