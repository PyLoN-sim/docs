# Contributing to PyLoN Core {#pylon本体への貢献}

This section is for contributors changing the KSP mod, ROS2 bridge, shared controller, message definitions, or documentation.

## Development environment {#開発環境}

Prepare KSP, the mod, and Docker reception with [Getting Started](../guide/getting-started.md). For mod development, prepare the tools and source below. Host ROS2 sync/build additionally requires [host ROS 2 Jazzy and dependencies](../guide/docker.md#ホストのrosアプリ・rvizを接続する). See [Architecture](architecture.md) for responsibilities and dependency directions, and [Source Map](source-map.md) for files by feature.

Read the repository's `AGENTS.md` before working. If local `Development/AGENTS.md` exists, read it before investigation or KSP implementation changes. Keep experimental code, validation records, and model authoring sources in untracked `Development/`. Core builds must use public source alone.

## Tools for mod development {#mod-tools}

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y universe
sudo apt update
sudo apt install -y git curl ca-certificates locales build-essential cmake rsync dotnet-sdk-8.0
```

Install the .NET SDK from Ubuntu packages. The mod targets .NET Framework 4.8, but builds use the .NET SDK and obtain reference assemblies from NuGet. The first build needs network access. See also [Microsoft's Ubuntu installation guide](https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu-install#ubuntu-2404).

```bash
dotnet --list-sdks
locale charmap
```

You are ready when the SDK list contains `8.0.xxx` and the character encoding is `UTF-8`. If the encoding differs, run the following before continuing. An existing Japanese UTF-8 environment can be kept as it is.

```bash
sudo locale-gen en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

## Source and KSP installation path {#source-setup}

```bash
mkdir -p ~/src
git clone https://github.com/PyLoN-sim/PyLoN.git ~/src/PyLoN
cd ~/src/PyLoN

export KSPDIR="$HOME/.local/share/Steam/steamapps/common/Kerbal Space Program"
```

Use the current GitHub repository URL and clone into a local directory named `PyLoN`. If already cloned, change to that repository.

`KSPDIR` is the directory immediately above `GameData`. Adjust it for another Steam library drive or a manual installation. Check the path through Steam's “Manage” → “Browse local files.” Quote it because it contains spaces.

```bash
ls "$KSPDIR/GameData"
ls "$KSPDIR/KSP_x64_Data/Managed/Assembly-CSharp.dll"
```

In some installations, the second file is at `KSP_Data/Managed/Assembly-CSharp.dll`; build scripts check both locations. Managed DLLs are used when building the mod from source. When building and running ROS2 packages in Docker, a host ROS workspace is unnecessary.

## Build and install the mod {#build-mod}

Run from the repository root **with KSP closed**.

```bash
./sync.sh --skip-ros2-sync --skip-ros2-build
```

The command performs these steps. Run without `sudo`, as a user who can write to the KSP installation.

1. Build `PyLoN.dll` against KSP's Managed DLLs.
2. Sync `GameData/PyLoN` to `$KSPDIR/GameData/PyLoN`.

`GameData/` is untracked and does not exist immediately after cloning. The build assembles it from the originals in `Assets/PyLoN` and the generated DLL. After `PyLoN sync complete` appears, check installation. ROS2 sync and build are skipped.

```bash
test -f "$KSPDIR/GameData/PyLoN/Plugins/PyLoN.dll" && echo "MOD installed"
```

If `MOD installed` appears, installation is complete. The KSP layout is:

```text
Kerbal Space Program/
└── GameData/
    └── PyLoN/
        ├── Plugins/PyLoN.dll
        ├── Config/Runtime.cfg
        ├── Config/ControlSafety.cfg
        ├── Models/
        └── Parts/
```

Do not nest it one level too deep, such as `GameData/GameData/PyLoN`. The shared `Runtime.cfg` is installed initially, and subsequent syncs preserve the installed configuration.

### Manual installation and Windows builds {#手動配置とwindows向けビルド}

Build with `./build.sh --ksp-dir "$KSPDIR"`, then copy the entire generated `GameData/PyLoN` directory into KSP's `GameData`. The DLL alone is missing models and part configuration. Back up an existing `Runtime.cfg` before copying.

To build for Windows KSP, run the following in PowerShell with the .NET SDK installed. This guide covers running the bridge with Docker Engine on Ubuntu.

```powershell
.\build.ps1 -KspDir "C:\SteamLibrary\steamapps\common\Kerbal Space Program"
```

## Build the Jazzy Docker image {#build-docker}

After preparing the source above, run from the PyLoN repository root. The host does not need ROS, colcon, or rosdep for this build.

```bash
docker build -f Docker/jazzy/Dockerfile --target runtime -t pylon-bridge:jazzy .

# Also run regression tests (build on a network separate from KSP)
docker build -f Docker/jazzy/Dockerfile --target test -t pylon-bridge:jazzy-test .

docker image ls pylon-bridge
```

The first build downloads the base image and dependencies. `Successfully tagged` or completed BuildKit export indicates success. Python packages and custom messages are also built inside the image.

The base digest is pinned, but apt and rosdep distributions are not pinned to snapshots. Future rebuilds of the same Dockerfile may pick up dependency updates. To preserve an identical distribution, store the built image in a registry and reference its digest.

The Dockerfile builds `pylon_interfaces`, `pylon_bridge`, and `pylon_vehicle_control`. Follow [Docker Setup and Operation](../guide/docker.md#_3-bridgeコンテナを起動する) to run the image, replacing `ghcr.io/pylon-sim/pylon-bridge:jazzy` with `pylon-bridge:jazzy`. Rebuild after changing ROS source.

## Host ROS2 build and sync {#ホストのros2ビルドと同期}

Exit KSP and run from the repository root.

```bash
./sync.sh
```

This builds/installs the KSP plugin, syncs ROS2 packages, and runs colcon. Set environment variables to change destinations.

```bash
KSPDIR="/path/to/Kerbal Space Program" ROS2_WS="$HOME/ros2_ws" ./sync.sh
```

If only KSP or ROS2 changed, scope the run.

```bash
# KSP only
./sync.sh --skip-ros2-sync --skip-ros2-build

# ROS2 only
./sync.sh --skip-ksp-build --skip-ksp-sync
```

Where local `./dev` exists, use `./dev sync` with the same arguments. The tracked entrypoint is `./sync.sh`. The default ROS2 setup is `/opt/ros/jazzy/setup.bash`, overridable with `ROS_SETUP`.

## Validation and commits {#変更の検証とコミット}

1. Build the changed feature and run relevant tests. See [Design and Validation](design.md).
2. After changing code, configuration, assets, or documentation affecting the mod or bridge, run the sync command above.
3. Restart KSP and the bridge; check topic types, values, units, frames, and startup/shutdown behavior.
4. After API changes, update message definitions, user documentation, and runnable examples together.
5. Group commits by purpose and describe changes, user impact, and validation. If sync could not run, state why and provide the exact rerun command.

Exclude generated outputs and local validation records from commits.

## Editing documentation {#ドキュメントの編集}

Prepare Node.js 22 and pnpm 10 and run in the independent docs repository.

```bash
git clone https://github.com/PyLoN-sim/docs.git ~/src/docs
cd ~/src/docs
pnpm install --frozen-lockfile
pnpm run docs:dev
```

Build and preview the static site with:

```bash
pnpm run docs:build
pnpm run docs:preview
```

The build checks broken links; use the preview to verify navigation and code rendering. Deployment settings are at the docs repository root; Vercel Root Directory is `.`, and CLI commands run from this root too.

User-facing pages cover setup, application development, and API use. Core contribution steps and internal design belong in this final section.
