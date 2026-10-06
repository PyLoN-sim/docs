# Bridge Options {#bridge起動オプション}

## Basic usage {#基本形}

```bash
ros2 run pylon_bridge udp_bridge --host 127.0.0.1 --port 49010
```

## UDP and node {#udpとノード}

| Argument | Default | Meaning |
|---|---|---|
| `--host` | `0.0.0.0` | KSP → bridge UDP bind host |
| `--port` | `49010` | KSP → bridge UDP bind port |
| `--command-host` | `127.0.0.1` | Bridge → KSP command destination host |
| `--command-port` | `49011` | Bridge → KSP command destination port |
| `--max-datagram-bytes` | `65535` | Maximum bytes per UDP receive |
| `--node-name` | `pylon_bridge` | ROS2 node name |

For use on one PC, explicitly set `--host 127.0.0.1` instead of the default `0.0.0.0` to limit UDP reception to loopback.

## Sensors and frames {#センサーとframe}

| Argument | Default | Meaning |
|---|---|---|
| `--topic-prefix` | `/ksp_vessel` | Vessel sensor topic prefix |
| `--bridge-prefix` | `/pylon` | Bridge status prefix |
| `--frame-prefix` | `pylon` | Sensor frame prefix without a connected model |
| `--topic-timeout-sec` | `3.0` | Seconds after last data before removing dynamic publishers |
| `--docking-ports-prefix` | `<topic-prefix>/docking_ports` | Docking port state/command/camera prefix |

`--topic-timeout-sec` accepts only finite positive numbers. Set it above the longest sensor interval you use.

## Active vessel model {#active-vesselモデル}

| Argument | Default | Meaning |
|---|---|---|
| `--robot-description-topic` | `/ksp_vessel/robot_description` | URDF Topic |
| `--root-frame-topic` | `/ksp_vessel/root_frame` | root frame Topic |
| `--model-tf-rate` | `5.0` | Dynamic TF update Hz from CoM to proxy root; fixed joints use `/tf_static` |
| `--allow-remote-models` | Disabled | Allow model packets from non-loopback sources |

## Motor topics {#モーターtopic}

| Argument | Default |
|---|---|
| `--joint-states-topic` | `/ksp_vessel/joint_states` |
| `--diagnostics-topic` | `/pylon/diagnostics` |

## Vehicle control and typed actuators {#機体制御・型付きアクチュエータ}

| Argument | Default | Meaning |
|---|---|---|
| `--body-wrench-command-topic` | `/ksp_vessel/control/wrench_command` | Lease-bound Wrench input |
| `--control-authority-command-topic` | `/ksp_vessel/control/authority/command` | Lease and e-stop input |
| `--control-authority-state-topic` | `/ksp_vessel/control/authority/state` | KSP authority state |
| `--wrench-feedback-topic` | `/ksp_vessel/control/wrench_feedback` | Achieved Wrench state |
| `--vessel-lifecycle-topic` | `/ksp_vessel/lifecycle` | active vessel lifecycle |
| `--ground-truth-prefix` | `/ksp_vessel/ground_truth` | Pose / twist / acceleration prefix |
| `--actuators-prefix` | `/ksp_vessel/actuators` | Typed actuator topic prefix by type |
| `--vehicle-command-timeout-sec` | `0.5` | Default timeout for Body Wrench and typed commands |

`--vehicle-command-timeout-sec` accepts only finite positive numbers. Nonzero `timeout_sec` in typed wheel, Engine, RCS, and motor commands takes precedence. KSP clamps it to 0.05–10 seconds. Typed commands, including irreversible `SeparationCommand`, execute only while PyLoN has active_vessel authority. No vessel ID selection is needed.

## Example: move everything to a custom namespace {#すべてを独自namespaceへ移す例}

```bash
ros2 run pylon_bridge udp_bridge \
  --host 127.0.0.1 \
  --topic-prefix /my_rover \
  --bridge-prefix /my_bridge \
  --joint-states-topic /my_rover/joint_states \
  --diagnostics-topic /my_bridge/diagnostics \
  --body-wrench-command-topic /my_rover/control/wrench_command \
  --control-authority-command-topic /my_rover/control/authority/command \
  --control-authority-state-topic /my_rover/control/authority/state \
  --wrench-feedback-topic /my_rover/control/wrench_feedback \
  --vessel-lifecycle-topic /my_rover/lifecycle \
  --ground-truth-prefix /my_rover/ground_truth \
  --actuators-prefix /my_rover/actuators \
  --docking-ports-prefix /my_rover/docking_ports \
  --robot-description-topic /my_rover/robot_description \
  --root-frame-topic /my_rover/root_frame
```

Check all available options with:

```bash
ros2 run pylon_bridge udp_bridge --help
```
