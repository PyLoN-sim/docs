# Star Tracker {#スタートラッカー}

`PyLoN Star Tracker` is a surface-mounted part measuring absolute vessel attitude in space. Find it under Utility in the VAB/SPH. Its dedicated model has a gold housing, hollow black baffle, recessed blue lens, and four-point mounting flange. Dimensions are 22 × 19 × 29.3 cm; mass is 8 kg.

## Mounting and startup {#取り付けと起動}

1. Mount outside the vessel with the baffle opening facing space. The optical axis is part-local −Z; the mounting surface is z=0.
2. Set an identifier with `Edit ROS2 Sensor ID` in the right-click menu. If unset, `star_tracker_...` is generated automatically.
3. Supply ElectricCharge. Default consumption is 0.05 EC/s.
4. Outside the atmosphere, avoid the Sun, celestial body limbs, and vessel structure. Keep rotation below 2°/s; `tracking` begins after about two seconds.
5. Start the existing UDP bridge. Restart KSP to load the new part and DLL.

```bash
source ~/ros2_ws/install/setup.bash
ros2 run pylon_bridge udp_bridge
# In another terminal, replace with the actual ID
ros2 topic echo /ksp_vessel/star_tracker/star_tracker_example/state
ros2 topic echo /ksp_vessel/star_tracker/star_tracker_example/attitude
```

## Topic {#topic}

| Topic | Type | Publication conditions |
|---|---|---|
| `/ksp_vessel/star_tracker/<id>/state` | [`pylon_interfaces/msg/StarTrackerState`](/en/api/interfaces/msg/StarTrackerState) | Default 5 Hz for valid and invalid measurements; attitude, valid, reason, covariance, vessel/sensor IDs together |
| `/ksp_vessel/star_tracker/<id>/attitude` | [`geometry_msgs/msg/QuaternionStamped`](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/QuaternionStamped.html) | Only measurements with `valid=true` |

Both use Reliable / Volatile / depth 10. They follow `--topic-prefix` and remain available with `--disable-ground-truth`. Estimators should subscribe to `state` and check `valid` and timestamp. `attitude` alone has no invalidation notification.

When `state.valid=false`, the quaternion is all zero and `orientation_covariance[0]=-1`. Do not normalize or use it as an attitude. Neither the last valid value nor an identity quaternion is republished as a measurement. No position estimate is provided.

### Coordinates and accuracy {#座標と精度}

- `header.frame_id=kerbol_inertial`: KSP's fixed celestial reference, a right-handed frame projecting Unity world vectors onto `Planetarium.right / forward / up`. It differs from J2000 and Earth's ICRF.
- `measured_frame_id=base_link`: vessel X forward, Y left, Z up. The quaternion rotates from vessel coordinates to inertial coordinates; it is not the mounted part's attitude.
- Mounting angles affect observability. Attitude output is treated as calibrated to the vessel.
- Standard deviation is 20 arcsec per axis; covariance is `σ² I` (rad²) for small rotation errors in body axes. Independent small-angle Gaussian noise is added.
- Timestamps use the existing bridge simulation-time mapping. `universal_time` retains KSP UT.
- Since position is unknown, no TF or Pose is generated between `kerbol_inertial` and the existing ENU `world`.

### Reasons for invalid measurements {#測定不能の理由}

| Reason | Meaning |
|---|---|
| `tracking` | Valid attitude measurement |
| `acquiring` | Initial acquisition or reacquisition |
| `disabled` | Part switch is Off |
| `no_power` | Insufficient ElectricCharge |
| `atmosphere` | Inside the atmosphere; this space-use model invalidates all atmospheric measurements |
| `sun_exclusion` | Optical axis points within the Sun disk plus exclusion angle |
| `body_in_fov` | Celestial body disk plus half-FOV and limb margin overlaps the optical axis |
| `occluded` | Field blocked by vessel, fairing, another vessel, or terrain |
| `slew_rate_exceeded` | Optical head inertial rotation exceeds the limit, or rate measurement is initializing |
| `packed` | Outside KSP physics simulation |
| `sensor_unavailable` / `invalid_time` | Optical axis, reference data, or time unavailable |
| `inactive` | No longer on the active vessel, or a part shutdown notification |
| `stale` | Bridge detects communication loss for `--topic-timeout-sec` |

After an obstruction clears, acquisition requires two continuous seconds. UT rewind or sample intervals above two seconds restart acquisition. Pausing produces no new measurements, so bridge timeout reports `stale`. After communication loss, invalid heartbeats run at 4 Hz; topics are removed `max(30 seconds, timeout×3)` after last reception. Timeout also invalidates data if shutdown/packed notifications are lost. Subscribers must enforce timestamp expiry to detect bridge shutdown too.

Duplicate and out-of-order UDP within a session are discarded by sequence. Each sensor has independent state.

## Simulation scope {#シミュレーションの範囲}

This does not render star images and match a catalog. KSP vessel attitude passes through a sensor model with observability conditions and measurement error. Actual star counts, brightness, radiation, clouds, detailed stray light, optical distortion, and thermal calibration changes are not simulated.

Celestial body obstruction uses the apparent angle of a sphere. Vessel obstruction uses 17 rays—center plus two rings—from the opening out to 2 km, which may miss thin structures. The part's own housing colliders are excluded. The Sun exclusion angle applies even when another body hides it, and atmosphere invalidates measurements day and night, making the model conservative.

The design draws on real trackers' star-based attitude determination, Sun exclusion angles, and angular-rate limits. Defaults are game settings, not guaranteed specifications of a product. See [ESA's attitude and Sun exclusion discussion](https://resilience.esa.int/archives/projects/alphasat-tdp6-feasibility-study-star-tracker) and [NASA's star-based attitude explanation](https://www.nasa.gov/missions/lasers-stars-and-sensors-will-guide-nasas-orion-spacecraft/).

## part.cfg {#part-cfg}

| Key | Default | Meaning |
|---|---:|---|
| `sampleRateHz` | 5 | Publication frequency (wall-time limit, 1–20 Hz) |
| `fieldOfViewDegrees` | 20 | Full circular field of view (5–60°) |
| `sunExclusionDegrees` | 35 | Exclusion angle from the Sun disk |
| `bodyLimbMarginDegrees` | 5 | Margin from celestial body limbs |
| `maxAngularRateDegrees` | 2 | Optical head rotation limit (°/s) |
| `acquisitionSeconds` | 2 | Simulation seconds of continuous clear conditions |
| `noiseArcsec` | 20 | Attitude error standard deviation per axis |
| `electricChargePerSecond` | 0.05 | Consumption in EC/s |
| `PYLON_TRANSPORT.stateHost` / `PYLON_TRANSPORT.statePort` | `127.0.0.1` / `49010` | Destination for the existing bridge |
