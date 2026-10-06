# Design and Validation {#設計と検証の観点}

Responsibilities to preserve and behavior to check when changing PyLoN core.

| Area | Responsibility | Checks after changes |
|---|---|---|
| Coordinates and units | Centralize frame and SI-unit conversion in `FrameConversions` | Known attitudes, attitude differences, rotation direction of angular velocity and torque |
| Simulation time | Manage within-session time mapping in `SimulationClock` and `FlightService` | Communication delay, reordering, time rewind |
| Sessions | Reset state on generation changes using heartbeat and `SessionTracker` | Vessel reload, bridge restart, packets from previous sessions |
| Vessel information | Manage vessel IDs/models in configuration, model, and session services | Lifecycle without sensors and with Ground Truth disabled |
| Capture | Manage rendering/resources in capture code, `SourceCamera`, `RgbCaptureResources` | Resolution changes, recovery from render failures, multiple sensors, rendering mods |
| State acquisition | Read state through `ActuatorTelemetry`, `VesselTelemetry`, `VesselParts` | Typed state, wheel geometry, topic units and values |
| Shared control and demos | Shared perception in `pylon_perception`, lease management in `LeaseCoordinator` | Independent package builds, lease reissue, stopping on missing data/cancellation |

Lifecycle retains KSP `runtime_instance`, `runtime_epoch`, and `runtime_generation`. ROS `generation` also identifies bridge restarts. Discard estimates and targets on generation changes and reacquire them in the new session.
