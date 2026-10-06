# Source Map {#ソース案内}

Find the files to change in PyLoN core. Paths are relative to the repository root.

`Assets/PyLoN` contains original distribution assets. `GameData/PyLoN` is generated during builds; edit the originals.

## Transport and sessions {#通信とセッション}

- `Ros2/pylon_bridge/pylon_bridge/application/connection.py`
- `Ros2/pylon_bridge/pylon_bridge/application/runtime.py`
- `Ros2/pylon_bridge/pylon_bridge/protocol.py`
- `Ros2/pylon_bridge/pylon_bridge/transport.py`
- `Source/PyLoN/Api/Ksp/CommandDispatcher.cs`
- `Source/PyLoN/Api/Ksp/TelemetryPacketCodec.cs`

## Active vessel model {#active-vesselモデル}

- `Source/PyLoN/Api/Ksp/PyLoNVesselModelManager.Geometry.cs`
- `Ros2/pylon_bridge/pylon_bridge/vessel_model.py`
- `Ros2/pylon_bridge/pylon_bridge/udp_bridge.py`

## RGB camera {#rgbカメラ}

- `Assets/PyLoN/Parts/RgbCamera/part.cfg`
- `Source/PyLoN/Api/Ksp/ModulePyLoNRgbCamera.cs`
- `Ros2/pylon_bridge/pylon_bridge/camera_packets.py`

## 2D / 3D LiDAR {#_2d-3d-lidar}

- `Assets/PyLoN/Parts/Lidar2D/part.cfg`
- `Assets/PyLoN/Parts/Lidar3D/part.cfg`
- `Source/PyLoN/Api/Ksp/ModulePyLoNLidar.cs`
- `Ros2/pylon_bridge/pylon_bridge/packet_conversion.py`

## Servos and linear motors {#サーボ-リニアモーター}

- `Assets/PyLoN/Parts/RosServo/part.cfg`
- `Assets/PyLoN/Parts/RosLinearMotor/part.cfg`
- `Source/PyLoN/Api/Ksp/PyLoNMotorSupport.cs`
- `Ros2/pylon_bridge/pylon_bridge/motor_packets.py`
- `Ros2/pylon_interfaces/msg/MotorCommand.msg`
- `Ros2/pylon_interfaces/msg/MotorState.msg`

## Engines and RCS {#エンジン-rcs}

- `Source/PyLoN/Api/Ksp/PyLoNVehicleSupport.cs`
- `Source/PyLoN/Api/Ksp/ActuatorTelemetry.cs`
- `Ros2/pylon_bridge/pylon_bridge/services/control.py`
- `Ros2/pylon_bridge/pylon_bridge/services/vehicle_state.py`
- `Ros2/pylon_bridge/pylon_bridge/udp_bridge.py`
- `Ros2/pylon_interfaces/msg/EngineCommand.msg`
- `Ros2/pylon_interfaces/msg/EngineState.msg`
- `Ros2/pylon_interfaces/msg/RcsCommand.msg`
- `Ros2/pylon_interfaces/msg/RcsState.msg`

## Stock KSP wheels {#ksp標準ホイール}

- `Source/PyLoN/Api/Ksp/PyLoNVehicleSupport.cs`
- `Ros2/pylon_interfaces/msg/WheelCommand.msg`
- `Ros2/pylon_interfaces/msg/WheelState.msg`
