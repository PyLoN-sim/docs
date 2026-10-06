# Vehicle Control and Ground Truth {#機体制御とground-truth}

Operations and topics always target KSP's `active_vessel`; you do not need to select a vessel with `vessel_id`. Authority is either `STATE_PLAYER` (Player) or `STATE_PYLON` (PyLoN), shared among PyLoN nodes. KSP makes the final decisions on SAS exclusion, timeouts, and safety limits.

## Control flow {#制御フロー}

Open `PyLoN ROS2 Control` from the Flight toolbar's `ROS` button and select `ROS2 control ON` to send vessel command topics without authority topic messages. ON persists without a heartbeat and disables SAS. Command timeouts, ordering, and safety limits still apply. `authority/state` reports `STATE_PYLON`; local ON has no expiry and reports `lease_remaining_sec=0`.

`ROS2 control OFF` clears steering, propulsion, and ROS motor commands, restores overrides and SAS, and returns to manual KSP control. Topic reacquisition is rejected while OFF. Vessel switches or communication session changes reset local ON to OFF; select ON again on the target vessel. With local ON, authority does not expire on communication loss, and Engine commands without individual timeouts remain held.

Before using the UI, the traditional topic method is also available:

1. Confirm that active_vessel is available through `/ksp_vessel/lifecycle`.
2. Send `ACTION_ACQUIRE` to `/ksp_vessel/control/authority/command`.
3. Confirm `STATE_PYLON` and `emergency_stop: false` on `/ksp_vessel/control/authority/state`.
4. Command while renewing the heartbeat. Engine commands are held; send other continuous commands more frequently than their timeouts.
5. Send `ACTION_RELEASE` when finished to return to Player. A heartbeat expiry also returns authority to Player on communication loss.

Command `vessel_id`, `controller_id`, `lease_id`, and `sequence` can be omitted. The bridge fills the active vessel session and a positive sequence. `lease_duration_sec` defaults to one second on acquisition or renewal. `priority` is ignored.

The retained `vessel_id` field guards against commands for an old active vessel; it does not route to other vessels. `controller_id + lease_id` optionally identify a command stream without creating additional authority owners. If specified, increase `sequence` as a positive signed 64-bit integer within the same path. Ordering is independent for authority, attitude (shared by Flight/Wrench), each actuator, motor, and docking port. `last_sequence` is the value from the last accepted path.

All PyLoN nodes share the same authority. Topic release returns all PyLoN control to Player. After selecting local ON, topic acquisition/renewal does not change ON's duration or SAS suppression; release clears current commands while retaining ON. If multiple nodes command the same actuator, consolidate their commands in the application.

## Topic {#topic}

| Direction | Topic | Type | QoS / content |
|---|---|---|---|
| Subscribe | `/ksp_vessel/control/authority/command` | [`pylon_interfaces/msg/ControlAuthorityCommand`](/en/api/interfaces/msg/ControlAuthorityCommand) | Reliable; acquire, renew, release, e-stop |
| Publish | `/ksp_vessel/control/authority/state` | [`pylon_interfaces/msg/ControlAuthorityState`](/en/api/interfaces/msg/ControlAuthorityState) | Reliable / Transient Local; KSP-confirmed owner |
| Subscribe | `/ksp_vessel/control/wrench_command` | [`pylon_interfaces/msg/BodyWrenchCommand`](/en/api/interfaces/msg/BodyWrenchCommand) | Reliable。lease-bound body Wrench |
| Publish | `/ksp_vessel/control/wrench_feedback` | [`pylon_interfaces/msg/WrenchFeedback`](/en/api/interfaces/msg/WrenchFeedback) | requested / allocated / achieved / residual |
| Publish | `/ksp_vessel/lifecycle` | [`pylon_interfaces/msg/VesselLifecycle`](/en/api/interfaces/msg/VesselLifecycle) | Reliable / Transient Local; vessel identity and frame state |

`BodyWrenchCommand.header.frame_id` accepts only empty or `base_link`. Coordinates are +X forward, +Y left, +Z up; force is in N and torque in N·m. `timeout_sec` ranges from 0.05 to 10 seconds.

Angular velocity and torque also use the ROS right-handed convention. Conversion from Unity swaps position/force axes and corrects the handedness sign of axial vectors. Angular velocity follows the same rotation direction as temporal differences of the Ground Truth attitude quaternion.

For manual checks, first confirm active_vessel availability through lifecycle.

```bash
ros2 topic echo --once /ksp_vessel/lifecycle
ros2 topic echo /ksp_vessel/control/authority/state
ros2 topic echo /ksp_vessel/control/wrench_feedback
```

For normal continuous control, use `pylon_vehicle_control` to renew leases and assign sequence numbers.

```bash
ros2 run pylon_vehicle_control setpoint_controller --ros-args \
  -p controller_id:=my_controller \
  -p setpoint_topic:=/my_controller/setpoint
```

The shared controller's `ATTITUDE_HOLD` and `SIX_DOF` convert attitude error into a target body angular velocity bounded by `attitude_hold_rate_limit_deg_s`, closing an inner rate loop. Torque components that further accelerate rotation above the limit are removed to prioritize braking. `DETUMBLE` generates torque only opposite body angular velocity.

## Requested versus achieved output {#「要求」と「実現」の違い}

Specify force in N and torque in N·m. Wrench is allocated to KSP control inputs; achieved output depends on nozzle layout, thrust limits, fuel, and vessel state. Check the difference between requests and achieved output with [`WrenchFeedback`](/en/api/interfaces/msg/WrenchFeedback).

The RCS allocator evaluates each currently enabled nozzle using KSP's axis rules and solves twelve positive/negative control channels:

- Actual nozzle thrust axes, including `useZaxis`
- Moment arms from nozzle positions and the current center of mass
- Enable settings for pitch / yaw / roll and X / Y / Z
- Module operating state and current maximum thrust

[`WrenchFeedback`](/en/api/interfaces/msg/WrenchFeedback) fields mean:

| Field | Meaning |
|---|---|
| `requested` | Value sent by the controller |
| `allocated` | Request after safety filtering and actuator allocation |
| `achieved` | Reconstructed from engine/RCS thrust observed in the previous KSP physics tick |
| `allocation_residual` | `requested - allocated` |
| `tracking_residual` | `requested - achieved` |
| `saturation_ratio` | Fraction that could not be allocated |
| `tracking_error_ratio` | Fractional difference from observation |

`achieved` excludes reaction wheels, tire contact forces, and aerodynamics. `achieved_quality` identifies measurement delay and exclusions. Rotation from translation and differences due to fuel or KSP control rules remain visible so the controller can assess saturation.

Typed `EngineCommand.target_thrust`, `RcsCommand.thrust_limit`, `WheelCommand.max_drive_torque`, and their states also use N/N·m.

## SAS, emergency stop, and safety limits {#sas・emergency-stop・安全上限}

Acquiring a lease with `suppress_sas: true` disables SAS throughout ownership and restores its previous state on release or expiry. This does not toggle with individual torque commands.

`ACTION_EMERGENCY_STOP` retains PyLoN authority, zeros normal Wrench and individual overrides, and latches with SAS still disabled. It does not create a third owner. While `emergency_stop` is true, ordinary commands and acquisition/renewal are rejected. `ACTION_CLEAR_EMERGENCY_STOP` returns to Player in topic mode or ROS2 control with local ON. Vessel switching does not automatically clear e-stop. The mod's `ROS2 control OFF` can also clear it and return to manual control. While local OFF, authority acquisition through a topic e-stop is rejected too.

E-stop and clearing also target active_vessel without an ID.

```bash
ros2 topic pub --once /ksp_vessel/control/authority/command \
  pylon_interfaces/msg/ControlAuthorityCommand \
  "{action: 4}"

ros2 topic pub --once /ksp_vessel/control/authority/command \
  pylon_interfaces/msg/ControlAuthorityCommand \
  "{action: 5}"
```

Configure final KSP limits in `GameData/PyLoN/Config/ControlSafety.cfg`.

| Setting | Default | Meaning |
|---|---:|---|
| `maxForceN` | 250000 | Force magnitude limit |
| `maxTorqueNm` | 100000 | Torque magnitude limit |
| `maxAngularSpeedRadSec` | 0.35 | Remove components that accelerate rotation above this rate |
| `maxForceSlewNPerSec` | 50000 | Force slew rate limit |
| `maxTorqueSlewNmPerSec` | 10000 | Torque slew rate limit |
| `maxContinuousActuationSec` | 30 | Continuous nonzero command duration limit |
| `continuousResetIdleSec` | 0.5 | Zero-command duration needed to reset the continuous limit |

Normally, set KSP limits above ROS-side limits and use KSP as the final boundary for failures.

## Ground Truth and frames {#ground-truthとframe}

| Topic | frame_id | Content |
|---|---|---|
| `/ksp_vessel/ground_truth/pose` | `pylon_ground_truth_enu` | Position in m, attitude quaternion |
| `/ksp_vessel/ground_truth/nearby_vessels` | `pylon_ground_truth_enu` | Own and nearby vessels' absolute positions/velocities at the same time and origin; subtract to obtain relative state |
| `/ksp_vessel/ground_truth/twist` | `pylon_ground_truth_enu` | World-frame velocity in m/s, angular velocity in rad/s |
| `/ksp_vessel/ground_truth/twist_body` | `base_link` | Body-frame velocity in m/s, angular velocity in rad/s |
| `/ksp_vessel/ground_truth/acceleration` | `pylon_ground_truth_enu` | World-frame kinematic acceleration |
| `/tf` | `pylon_ground_truth_enu -> base_link` | Dynamic TF based on KSP universal time |
| `/tf_static` | proxy fixed joint / sensor mount | Mounting pose |

Sensor timestamps map KSP universal time to the ROS clock. The latest Ground Truth pose is extrapolated up to 0.1 seconds to the same sensor timestamp to supplement TF, avoiding future extrapolation caused by pose updates slower than point clouds.

[`VesselLifecycle`](/en/api/interfaces/msg/VesselLifecycle) exposes `UNAVAILABLE / ACTIVE / CHANGED / STALE`, generation, origin sequence, and model readiness. `vessel_id` verifies observation identity; it does not select control targets. Vessel switches immediately invalidate existing authority and mismatching proxy models.

## Flight demo steering and state {#飛行デモ用の操舵・状態}

`/ksp_vessel/control/flight_command` accepts [`FlightControlCommand`](/en/api/interfaces/msg/FlightControlCommand).
`pitch / yaw / roll` are stock KSP normalized inputs (−1 to 1), passed to reaction wheels,
engine gimbals, and control surfaces. They are not ROS angles or torques.
`landing_gear` sets the Gear action group. Specify thrust through the existing [`EngineCommand`](/en/api/interfaces/msg/EngineCommand).

The bridge can fill command identity and sequence. `timeout_sec` ranges from 0.05 to 1 second.
Nonfinite or out-of-range input, old-vessel commands, and commands while Player owns authority are rejected. Steering and Body Wrench
cannot own the same attitude axes simultaneously; the later accepted method takes precedence.
Steering clears on timeout, lease loss, e-stop, or vessel changes. Landing gear deployment is retained.
This is a low-level stock-input API, separate from Body Wrench force/torque filters.

`/ksp_vessel/ground_truth/flight` publishes [`FlightState`](/en/api/interfaces/msg/FlightState) (Best Effort / depth 10).
It is disabled by `--disable-ground-truth`. Altitudes are ASL and vessel-reference AGL; mass is in kg,
velocity in m/s, dynamic pressure in Pa, and latitude/longitude in degrees. Fuel, oxidizer, and charge use KSP resource units.
It also includes apoapsis/periapsis altitude, seconds to apoapsis, and landed/splashed state.
`up_body / east_body / north_body` are unit vectors for local surface axes expressed in `base_link`;
velocity, orbital velocity, and angular velocity are also in `base_link`. `universal_time` is KSP measurement time.

This output is simulator Ground Truth. Terrain altitude is not the distance from the feet,
so landing control must account for vessel dimensions and CoM changes. See [Satellite Separation and Retropropulsive Landing](../demos/reusable-launch.md).

## Ordered flight commands {#順序付き飛行指令}

`/ksp_vessel/control/batch` ([`ControlBatch`](/en/api/interfaces/msg/ControlBatch)) converts one ROS message to one UDP datagram. Execution order is **lease renewal → attitude → engines in array order → one separation → lease release**. `release_lease=true` combines ignition OFF and release in one transaction without relying on arrival order across topics. Release cannot be combined with lease renewal or separation. Separation may change the vessel generation and therefore comes last among physical commands. Up to 16 engines; attitude timeout is 0.05–1 second. Engine commands set only thrust and ignition, held until the next update or authority ends.

The bridge's outer session and sequence are applied to every inner command. Entries with `has_flight / has_separation` false are not executed. `renew_lease=true` sends a heartbeat in the same tick as control. Local ON also accepts batches without renewal; `release_lease=true` clears commands while retaining ON. Use the authority topic for topic-mode acquisition, release, and e-stop. Do not duplicate an operation across batch and individual topics. Clients specifying sequence use an increasing counter across acquisition, batch, and release.

UDP stores inner commands as JSON strings in `flightJson / engineJson[] / separationJson`; KSP explicitly decodes and validates every command before execution. The ROS message structure is unchanged.

KSP rejects an entire stale batch and processes an accepted batch in order within one main-thread callback. This does not provide UDP retries, guaranteed delivery, or rollback on physical operation failure. Confirm separation through the result API below.

## Separation results and queries {#分離結果と再照会}

Give each `SeparationCommand.operation_id` a unique operation ID. If `original_runtime_instance / original_runtime_epoch / original_vessel_id` are omitted initially, the bridge fills the current identity. Reuse those initial values when querying.

Results use `/ksp_vessel/actuators/separation/result` ([`SeparationResult`](/en/api/interfaces/msg/SeparationResult), Reliable / Transient Local, depth 128). Confirm `completed && success && retained`. Results include old and new epochs/generations, current vessel ID, and post-separation vessel IDs observed from the original part group. Disappearance from the vessel manifest alone is not treated as success.

KSP retains completed results in-process for ten minutes, up to 128 entries. When full, new separations are rejected without evicting retained results. Repeated operation ID/original identity returns a retained result without reexecution. Reusing an ID for another target/controller is rejected. Results are resent in the current communication epoch, so they remain retrievable after separation changes the epoch. Process restart loses retained data.

Query `/ksp_vessel/actuators/separation/get_result` ([`GetSeparationResult`](/en/api/interfaces/srv/GetSeparationResult)) with the original operation identity. If the bridge has a result, it returns `found=true`; otherwise it sends a read-only query to KSP and returns `query_sent=true`. Query again after the result topic updates. Incomplete cached results also trigger a query. No new lease is needed, but contacting KSP requires a current unpacked session. Cached results can be queried while packed. `result_not_retained` does not prove that the operation never executed.

## Simulator state and consistent observations {#シミュレータ状態と一貫した観測}

`/ksp_vessel/simulator/state` ([`SimulatorState`](/en/api/interfaces/msg/SimulatorState)) is generated from a 10 Hz real-time heartbeat. It distinguishes pause, warp factor, physics warp, packed state, controllability, UT advancement, and elapsed real time since UT last advanced. States are `INITIALIZING / ADVANCING / PAUSED / STALLED / UNAVAILABLE / STALE`. `STALLED` means heartbeats arrive but UT has not advanced for at least 0.5 seconds; `STALE` means missing heartbeats. Communication loss alone cannot distinguish a stopped KSP process from a network failure. With `communication_alive=false`, pause and similar values are the last observations.

[`FlightState`](/en/api/interfaces/msg/FlightState) / [`EngineState`](/en/api/interfaces/msg/EngineState) / [`SeparationState`](/en/api/interfaces/msg/SeparationState) share `vessel_id / runtime_instance / runtime_generation / runtime_epoch / observation_sequence`. Observation sequence is the Unity frame number and is comparable only within an epoch. `/ksp_vessel/control/snapshot` ([`ControlSnapshot`](/en/api/interfaces/msg/ControlSnapshot)) returns flight state, all engines, and current separators from the same frame and UT in one message. Partial data and mixed epochs/frames/UT are rejected. Oversized snapshots exceeding UDP limits are omitted rather than partially published. Because snapshots include Ground Truth, `--disable-ground-truth` disables them as well.

## Shared checkpoints and resume validation {#共通checkpointと再開検証}

`MissionCheckpoint.capture` in `pylon_vehicle_control.application.checkpoint` records vessel identity, configuration IDs, resources, mass, celestial body, orbit, pending operations, and the old lease in an unpowered vacuum orbit. `to_dict / from_dict` save/restore JSON, validating schema, types, and limits during restoration.

Pass the current snapshot, SimulatorState, authority, and oldest reception time to `validate_resume` to receive a resume decision and reason. It checks fresh observations, the same vessel/epoch/configuration/orbit, resource tolerances, zero thrust, resolved pending operations, and authority returned to Player. After approval, acquire a new lease and revalidate acquisition. Restoring/reusing the old lease is rejected. The reusable demo's orbital HOLD resume uses this shared logic.

This API does not create/load KSP saves or perform warp. Resume is rejected if the epoch changes through quicksave loading, packing/unpacking, or similar events. Remapping to another epoch and an automatic runner from orbital saves require separate implementation.

## Input axes, applied results, heat, and power {#入力軸・適用結果・熱と電力}

Positive body-axis inputs map to stock inputs as below, fixed by the shared `pylon_vehicle_control.application.flight_axes.stock_inputs_for_body_axes` function and per-axis tests. Response magnitude depends on vessel, speed, and movable-part state.

| Positive body axis | Stock input |
|---|---|
| +X rotation | roll + |
| +Y rotation | pitch − |
| +Z rotation | yaw − |

`FlightState.applied_pitch / applied_yaw / applied_roll` are the last inputs PyLoN wrote to `OnFlyByWire`. Check `applied_input_sequence / applied_input_age / applied_input_valid / flight_command_active` as well. `input_at_limit` means normalized input reached its limit, rather than a measurement of torque saturation. Per-engine gimbal input uses existing [`EngineState`](/en/api/interfaces/msg/EngineState) fields. Actual control-surface deflections and each device's torque contribution are not measured.

`/ksp_vessel/health/thermal` ([`PartThermalState`](/en/api/interfaces/msg/PartThermalState)) publishes per-part internal/skin temperatures and limits (K), aerodynamic shielding, and charge/capacity at 2 Hz. `/ksp_vessel/health/power` ([`VehicleHealth`](/en/api/interfaces/msg/VehicleHealth)) reports vessel-wide charge/capacity and net balance estimated from UT differences (EC/s). Check `net_charge_rate_valid` and the estimation interval. Estimates are invalid immediately after epoch/capacity changes and while paused. Generation and consumption cannot be reconstructed separately, so both validity flags are false. A full battery does not imply zero generation.

## Shared conditions for typed actuators {#型付きアクチュエータの共通条件}

[`EngineCommand`](/en/api/interfaces/msg/EngineCommand), [`RcsCommand`](/en/api/interfaces/msg/RcsCommand), [`WheelCommand`](/en/api/interfaces/msg/WheelCommand), [`MotorCommand`](/en/api/interfaces/msg/MotorCommand), and [`SeparationCommand`](/en/api/interfaces/msg/SeparationCommand) also target active_vessel; the bridge can fill identity and sequence. KSP rejects them while PyLoN lacks authority or emergency stop is active. Irreversible separation follows the same conditions.


## Bridge startup arguments {#bridge起動引数}

| Argument | Default |
|---|---|
| `--body-wrench-command-topic` | `/ksp_vessel/control/wrench_command` |
| `--control-authority-command-topic` | `/ksp_vessel/control/authority/command` |
| `--control-authority-state-topic` | `/ksp_vessel/control/authority/state` |
| `--wrench-feedback-topic` | `/ksp_vessel/control/wrench_feedback` |
| `--vessel-lifecycle-topic` | `/ksp_vessel/lifecycle` |
| `--ground-truth-prefix` | `/ksp_vessel/ground_truth` |
| `--actuators-prefix` | `/ksp_vessel/actuators` |
| `--vehicle-command-timeout-sec` | `0.5` |

The shared setpoint controller discards targets on authority loss, missing inputs, or generation changes during execution. After recovery, it requires a new `MODE_IDLE` before accepting a subsequent fresh setpoint.
