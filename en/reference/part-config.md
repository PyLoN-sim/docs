# Part Configuration {#パーツ設定}

Installed defaults are in `GameData/PyLoN/Parts/*/part.cfg`. Source originals are in `Assets/PyLoN/Parts/*/part.cfg`. The repository's `GameData/` is regenerated on each build. Restart KSP after changes to reload DLLs and CFG files.

## Shared LiDAR settings {#lidar共通}

| Key | Meaning |
|---|---|
| `sensorMode` | `2D` or `3D` |
| `horizontalLaserCount` | Horizontal 2D ray count; UI range 1–2048 |
| `verticalLaserCount` | Vertical ray count for rectangular scanning; UI range 1–128 |
| `horizontalFovDegrees` | 0〜360° |
| `verticalFovDegrees` | 0〜180° |
| `maxDistance` | Maximum measurement distance [m] |
| `scanRateHz` | 1〜60 Hz |
| `streamAt20Fps` | When enabled, ignore `scanRateHz` and use 20 Hz |
| `udpEnabled` | Enable/disable UDP transmission |
| `lidarEnabled` | Enable/disable Flight scanning |
| `ignoreOwnVessel` | Exclude own-vessel collisions |
| `forwardAxis` / `upAxis` | Part-local axes for 2D or manual 3D |
| `rayOriginLocalPosition` | Ray origin in part-local coordinates |
| `originOffsetMeters` | Additional forward offset from the origin |
| `noHitValue` | UDP no-hit value; default `-1` |
| `maxLaserCount` | Maximum rays per scan; default 4096 |
| `maxDatagramBytes` | LiDAR JSON datagram limit; default 60000 |
| `includeHitPoints` | Include hit coordinates in UDP JSON |
| `includeDirections` | Include ray directions in UDP JSON |

Stock 3D parts use `align3DToAttachNormal = true`, with the mounting surface outward normal as hemisphere forward. Set `false` only when using manual axes.

## 3D LiDAR profile {#_3d-lidar-profile}

| Key | Default | UI range |
|---|---:|---:|
| `rangeProfile` | `medium` | `near` / `medium` / `long` |
| `nearRangeMeters` | 30 | 10〜30 m |
| `mediumRangeMeters` | 100 | 50〜150 m |
| `longRangeMeters` | 250 | 150〜250 m |
| `hemisphereDensity` | 160 / 320 / 1024 on profile selection | 1–1024 rays/sr |

## Shared configuration and vessel model {#共通設定と機体モデル}

Managed in `GameData/PyLoN/Config/Runtime.cfg`, independently of sensor parts.

| Node | Key | Default | Meaning |
|---|---|---|---|
| `PYLON_TRANSPORT` | `stateHost` / `statePort` | `127.0.0.1` / `49010` | Destination bridge |
| `PYLON_TRANSPORT` | `commandPort` | `49011` | Command reception port |
| `PYLON_MODEL` | `enabled` | `true` | Transmit vessel model |
| `PYLON_MODEL` | `refreshSeconds` | `2` | Retransmission interval |
| `PYLON_MODEL` | `chunkBytes` / `maxChunks` | `12000` / `256` | Compressed model chunk limits |
| `PYLON_MODEL` | `allowRemoteUrdf` | `false` | Allow sending outside loopback |

Set sensor IDs in each part's `ModulePyLoNSensorId.sensorId`. User-assigned IDs are not renamed.

## RGB camera {#rgbカメラ}

| Key | Default | Meaning |
|---|---:|---|
| `imageWidth` / `imageHeight` | 320 / 240 | Resolution |
| `frameRateHz` | 5 | 1〜15 Hz |
| `verticalFovDegrees` | 60 | 20〜120° |
| `useGameClipPlanes` | `true` | Retain the game camera's rendering range, including distant terrain and clouds |
| `nearClipMeters` / `farClipMeters` | 0.05 / 20000 | Local clip limits with `useGameClipPlanes = false` |
| `frameChunkBytes` | 12000 | Raw bytes per UDP chunk |
| `maxFrameBytes` | 4194304 | Raw RGB frame limit |
| `maxFrameChunks` | 512 | KSP chunk limit |
| `cameraEnabled` / `udpEnabled` | `true` | Capture / UDP transmission |
| `cameraTiltDegrees` | `90` | Body tilt, 0–180°, persisted in craft/save data |
| `cameraPivotTransformName` | `CameraPivot` | Body rotating about local X; reference rotation at 0° is identity |
| `cameraOpticalTransformName` | `CameraOptical` | Capture reference Transform in the rotating body; +Z viewing direction, +Y image up |
| `cameraOriginLocalPosition` | `0, 0, -0.272` | Capture origin for models without an optical Transform |
| `forwardAxis` / `upAxis` | `-Z` / `+Y` | Camera-local axes without an optical Transform |

## Shared motor settings {#モーター共通}

| Key | Servo default | Linear default | Meaning |
|---|---:|---:|---|
| `motorName` | Empty | Empty | ROS joint name; generated from ID if empty |
| `stateRateHz` | 20 | 20 | State transmission Hz; clamped to 1–60 at runtime |
| `commandTimeoutSeconds` | 0.5 | 0.5 | velocity mode timeout |
| Rated effort | `ratedEffortNm = 250` | `ratedEffortN = 4000` | Effort limit |
| Current conversion | `torquePerAmpNm = 40` | `forcePerAmpN = 800` | For estimated current |
