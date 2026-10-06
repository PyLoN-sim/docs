# Architecture {#アーキテクチャ}

The repository is divided by responsibility boundaries rather than deployment locations. Dependencies point inward: adapters → application → domain. Domain code does not depend on KSP, Unity, ROS2, or demos.

## Bounded context {#bounded-context}

| Directory | Responsibility |
|---|---|
| `Source/PyLoN/Domain` | Pure rules for RCS allocation, authority, and safety limits |
| `Source/PyLoN/Application` | Compose control use cases within KSP |
| `Source/PyLoN/Api/Ksp` | KSP/Unity, UDP, and PartModule adapters |
| `Ros2/pylon_interfaces` | Explicit contract between KSP and ROS2 applications |
| `Ros2/pylon_bridge/pylon_bridge/domain` | Session identity, generation ordering, and KSP time alignment |
| `Ros2/pylon_bridge/pylon_bridge/application` | ROS-independent reception, session lifetime, transfer state, and command sending |
| `Ros2/pylon_bridge/pylon_bridge/services` | ROS message conversion, Topic/TF publication, and ROS state cleanup |
| `Ros2/pylon_vehicle_control` | Reusable 6DoF control domain and lease workflow |
| `Demo` | Examples using only public APIs; no shared control implementation |
| `Assets/PyLoN` | Tracked originals for distributed CFG files, models, and images |
| `GameData/` / `dist/` (untracked) | Installed mod and ZIPs manually uploaded to Releases |
| `build.sh` / `build.ps1` / `sync.sh` | Production build/sync using only public source |
| `Development` (local only, untracked) | Debugging tools, validation code, records, and model authoring sources |

The production C# project explicitly lists compilation inputs. `./sync.sh` builds and syncs public source. See the [Core Development Guide](index.md) for workflow and local file handling.

## Control boundaries {#制御の境界}

The authority aggregate governing control consistency lives in the KSP process. The target is always `active_vessel`; authority is either Player or PyLoN. PyLoN controllers share authority without priority preemption. Emergency stop is an independent latched flag.

The bridge fills omitted command identity/sequence and binds commands to the current Flight session. Internal vessel IDs and runtime epochs reject delayed commands from old vessels. Compatibility controller/lease IDs identify streams for duplicate rejection rather than creating another owner.

KSP enforces SAS exclusion, timeout, angular-rate limits, Wrench slew, continuous actuation duration, and emergency stop as the final safety boundary. These constraints remain if a ROS node stops.

RCS allocation evaluates each enabled nozzle's actual KSP thrust axis, CoM moment arm, and translation/rotation enable settings to allocate twelve positive/negative control channels, rather than dividing by total maximum thrust. Because this passes through normalized KSP flight inputs, it is not an exact force source. `WrenchFeedback` separates `requested / allocated / achieved / residual` to make the differences observable.

## TF and vessel lifecycle {#tfと機体ライフサイクル}

| TF / Topic | Handling |
|---|---|
| `pylon_ground_truth_enu -> base_link` | Dynamic TF based on KSP universal time |
| `base_link -> pylon_<vessel-id>_link_0000` | Dynamic TF including CoM changes |
| Fixed proxy joints | `/tf_static` |
| part link -> sensor frame | `/tf_static` with stable names derived from Sensor IDs |
| `/ksp_vessel/lifecycle` | `UNAVAILABLE / ACTIVE / CHANGED / STALE` and actual `vessel_id` |

At point cloud/image timestamps, Ground Truth pose is extrapolated to the same KSP universal time to supplement dynamic TF. Fixed mounts are not resent at sensor rates, avoiding future extrapolation and unnecessary proxy regeneration.

Velocity is exposed separately as world-frame `/ground_truth/twist` and body-frame `/ground_truth/twist_body`. High-level controllers accept world-frame setpoints and convert coordinates once in the shared implementation.
