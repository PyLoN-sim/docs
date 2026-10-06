# Troubleshooting {#トラブルシュート}

## Bridge status is missing {#bridge-statusが見えない}

Make sure the bridge starts in a terminal with its environment sourced.

```bash
source /opt/ros/jazzy/setup.bash
source ~/ros2_ws/install/setup.bash
ros2 run pylon_bridge udp_bridge --host 127.0.0.1 --port 49010
```

Source the same ROS setup and workspace in other terminals too. `/pylon/status` exists even when KSP is not running.

If `ROS_DISTRO` is not `jazzy`, use a new terminal and source `/opt/ros/jazzy/setup.bash`; do not reuse a shell that sourced Humble.

## Sensor topics are missing {#センサーtopicが見えない}

LiDAR and camera topics are dynamic. Check:

1. The vessel with the relevant part is in Flight.
2. Sensor and UDP are enabled in the Part Action Window.
3. KSP `PYLON_TRANSPORT.stateHost` / `PYLON_TRANSPORT.statePort` match bridge `--host` / `--port`.
4. Scans or complete camera frames actually reach the bridge.
5. `--topic-timeout-sec` is longer than the sensor interval.

## Topics disappear after about three seconds {#topicが約3秒で消える}

Dynamic sensor publishers are removed three seconds after the last data by default. Increase the timeout for slower sensors.

```bash
ros2 run pylon_bridge udp_bridge \
  --host 127.0.0.1 \
  --topic-timeout-sec 10
```

## Motors do not move {#モーターが動かない}

- Copy the actual joint name from `/ksp_vessel/joint_states.name`.
- Check `MotorCommand.id`, lease, and increasing sequence.
- Specify servo positions in rad and linear positions in m.
- Attach `bottom` to the parent and moving structure to `top`.
- Check power, engage, and lock in KSP's Part Action Window.
- Match bridge `--command-host` / `--command-port` and shared `PYLON_TRANSPORT.commandPort`.

## Velocity commands or thrust stop quickly {#速度指令・推力がすぐ止まる}

This is normal failsafe behavior. Send commands faster than their timeout with increasing `sequence` in the same lease. `ros2 topic pub -r` with a fixed sequence is rejected as replay; use a controller node such as `pylon_vehicle_control` for continuous control.

## Vessel is missing in RViz {#rvizに機体が出ない}

```bash
ros2 topic echo --once /ksp_vessel/root_frame
ros2 topic echo --once /ksp_vessel/robot_description
```

An empty string means the model was cleared or expired. Check shared `PYLON_MODEL.enabled`, the UDP path, and permissions on both ends for remote use. Use the `root_frame` topic's value as RViz Fixed Frame.

## Camera images are intermittent {#カメラ画像が途切れる}

Camera frames publish only when all UDP chunks arrive. Start with 160 × 120 or a lower frame rate. Across a network, raw RGB is split into many UDP datagrams and is more sensitive to packet loss.

## KSP DLL does not update {#ksp-dllが更新されない}

KSP cannot reload a new DLL while running. Exit KSP, rerun `./sync.sh`, then restart KSP.

## Logs {#ログ}

KSP logs begin with `[PyLoN]`. The bridge logs invalid packets, publisher creation/removal, and UDP transmission failures through its node logger.
