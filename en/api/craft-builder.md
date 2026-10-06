# Building Vessels from Layout Files {#配置ファイルから機体を組み立てる}

Specify part names, positions, rotations, parent-child relationships, and attachment nodes in JSON, then generate a `.craft` file with KSP's own save process. Start KSP and open the **VAB or SPH in Sandbox** first. No ROS node or additional construction mod is needed.

```bash
source ~/ros2_ws/install/setup.bash
ros2 run pylon_bridge craft_builder parts --filter pylon
ros2 run pylon_bridge craft_builder validate /path/to/assembly.json
ros2 run pylon_bridge craft_builder build /path/to/assembly.json --load
ros2 run pylon_bridge craft_builder inspect
```

`--load` loads only into an empty editor. Save an existing vessel and select “New” first. Without `--load`, it generates a file while preserving the current editor contents. Check `craftPath` in the response for the output location; the result can also be loaded through KSP's normal vessel loading UI.

You can also run directly from the repository without sourcing ROS.

```bash
PYTHONPATH=Ros2/pylon_bridge python3 -m pylon_bridge.craft_builder \
  build Assets/PyLoN/Examples/servo-stack.json --load
```

Set the KSP location with `KSPDIR` or `--ksp-dir` before the subcommand. The default is `~/.local/share/Steam/steamapps/common/Kerbal Space Program`. Change the response wait with `--timeout 60` (1–120 seconds, default 30). Restart KSP after updating the mod.

## Layout file {#配置ファイル}

The included `GameData/PyLoN/Examples/servo-stack.json` stacks two PyLoN servos. Edit its source at `Assets/PyLoN/Examples/servo-stack.json`.

```json
{
  "version": 1,
  "name": "My assembly",
  "facility": "VAB",
  "parts": [
    {
      "id": "base",
      "part": "pylon.servo.size0",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0, 1]
    },
    {
      "id": "upper",
      "part": "pylon.servo.size0",
      "position": [0, 0.14, 0],
      "rotation": [0, 0, 0, 1],
      "parent": "base",
      "attach": { "mode": "stack", "node": "bottom", "parent_node": "top" }
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `version` | `1` |
| `name` | Vessel name displayed in KSP; up to 80 characters |
| `facility` | Currently open `VAB` or `SPH` |
| `parts[].id` | Unique identifier in the file, used for parent references |
| `part` | Internal name returned by `parts`, rather than the display name |
| `position` | Position `[x,y,z]` in shared vessel coordinates, in meters; not relative to the parent |
| `rotation` | Unit quaternion `[x,y,z,w]` in shared vessel coordinates |
| `parent` | Parent `id`; omit or use an empty string for the root |
| `attach` | Connection between child and parent; omit for the root |
| `stage` | Initial stage value when saving; default `-1`, range `-1`–`99`. KSP reorganizes stages on loading, so this does not fix the displayed number |
| `autostrut` | Optional: `off` / `root` / `heaviest` / `grandparent`. Omission retains the part default. Overrides of forced autostrut, such as landing legs, are rejected |
| `rigid_attachment` | Optional: `true` enables rigid attachment; `false` disables it. Omission retains the part default |
| `separation_force_percent` | Optional: separation force multiplier, 0–100% of the default. Available only on parts with exactly one stock `ModuleDecouplerBase` |
| `role` | Optional role such as `return_engine` / `satellite_separator`. Starts with a letter, followed by alphanumerics, `_`, or `-`, up to 64 characters. Multiple parts can share a role |

For example, a separator can specify `"autostrut": "grandparent", "rigid_attachment": true, "separation_force_percent": 15, "role": "satellite_separator"`. `role` is stored as persistent custom part data and stays with the part through craft reloads, normal saves, and vessel changes after separation. Responses from `parts` / `build` / `inspect` also include these settings. Use `EngineState.role` and `SeparationState.role` to identify control targets. `separation_force_percent` is `null` for unsupported parts or parts with multiple separation modules; an unset `role` is an empty string.

Roles are stored in the `pylon.role=` entry of `Part.customPartData`, preserving other custom entries. No extra PartModule or ModuleManager is needed. Restart KSP after updating. Roles are identification metadata and do not automatically change authority or staging behavior.

Coordinates use **KSP/Unity editor coordinates**, which differ from ROS `base_link`. +Y is up; +X/+Z are the editor's horizontal axes. `inspect` reports measurements relative to the root position and attitude. Specify root position `[0,0,0]` and rotation `[0,0,0,1]`. Relative part placement is preserved independently of editor-wide centering.

`parts --filter TEXT` searches internal and display names and returns attachment node IDs, part-local positions, directions, and attachment compatibility. Node positions are offsets from the model origin, so account for rotated node positions when aligning attachment faces.

KSP may reset `stage` to `-1` on loading for non-staged parts such as probes. Check the normal staging UI before launch.

For stack attachment, specify the child's `node` and parent's `parent_node`. Surface attachment is specified as follows.

```json
"attach": { "mode": "surface", "node": "srfAttach", "parent_node": "" }
```

**Coordinates are not automatically snapped to attachment nodes.** As with editor offsets, connections preserve the specified positions. Parent-child relationships must form a single tree; duplicate use of attachment nodes is rejected. Children may appear before parents in the file.

## Saving and validation {#保存と検証}

Generation uses installed parts, passing default modules and resources plus explicit settings to KSP's save process. KSP reloads the saved data and validates counts, part types, hierarchy, connections, positions, rotations, and specified autostrut, rigid attachment, separation force, and roles before saving to `Ships/VAB` or `Ships/SPH` in the current save. Tolerances are 0.5 mm for position and 0.05 degrees for rotation.

Output names are `PyLoN_<request-id>.craft`; existing files are not overwritten. The displayed name comes from JSON `name`. `build` returns specification IDs; `inspect` returns identifiers formed by prefixing KSP craft IDs with `p`.

v1 limitations:

- Sandbox editor only. No Flight spawning or automatic launch.
- 1–256 parts, input at most 1 MiB, each position component within ±1000 m.
- Apart from the settings above, parts use default variants and states. Custom resource amounts, arbitrary PartModule settings, symmetry, extra strut/fuel-line targets, and initial robotics angles are unsupported.
- Connection and geometry validation does not guarantee physical stability, clearance, or flight capability. Overlapping placements are not corrected automatically.
- Placement is reproducible for the same environment and specification; byte-identical files are not guaranteed because they contain IDs issued by KSP and mods.

## Transport and errors {#通信とエラー}

Requests and responses are exchanged on the same PC through `<KSP>/PluginData/PyLoN/CraftBuilder/`; there is no external network listener. Session IDs and expiry are checked for each editor startup so old requests cannot run in a different editing session. Requests are processed once without automatic retry.

Standard output is JSON: success is `ok: true` with exit code 0; failure is `ok: false` with exit code 1. A timeout can leave the outcome unknown. Check `results/<id>.json` for the displayed request ID and any generated files. Processed responses remain in this directory.

For `Editor status heartbeat is stale`, check that KSP and the editor are running. If `facility` does not match, open the requested VAB/SPH. Use `parts` to check part and node names.

## Basis for public interface use {#公開インターフェースの根拠}

Checked on 2026-09-21. No KSP decompilation, reflection into private members, or method replacement is used. Local KSP DLLs are referenced at compile time and ordinary public members are called. Public member availability is separate from an official compatibility guarantee.

The following public mods were checked as examples of API calls. Their implementation code is not copied and there is no runtime dependency on these mods.

| API / owner | Calls and purpose checked | Public example |
| --- | --- | --- |
| Unity / KSP | `Object.Instantiate(partPrefab)`, `ShipConstruct`, `SaveShip()` to create saved data from parts | [Extraplanetary Launchpads / PartEditorView](https://github.com/taniwha/Extraplanetary-Launchpads/blob/0bb3c5b0bf083e4284611682cc4f65f6b4a9d77b/Source/UI/PartEditorView.cs) (GPLv3 or later) |
| KSP | `ShipConstruct.LoadShip(ConfigNode)` and disposal of temporary objects | [Extraplanetary Launchpads / BuildControl](https://github.com/taniwha/Extraplanetary-Launchpads/blob/0bb3c5b0bf083e4284611682cc4f65f6b4a9d77b/Source/BuildControl.cs) (GPLv3 or later) |
| KSP | `EditorLogic.LoadShipFromFile` and checking editor initialization | [kRPC / Editor](https://github.com/krpc/krpc/blob/8cfe77a515f39495e6c2c10b42010b2d206f0729/service/SpaceCenter/src/Services/Editor.cs) (SpaceCenter portion: GPLv3 or later) |
| KSP | Saving and restoring `ShipConstruction.ShipConfig` | [VesselMover / VesselSpawn](https://github.com/jrodrigv/VesselMover/blob/875bbcef2ec00501ebe673daecc0ae21263e9e6b/VesselSpawn.cs) (MIT declaration) |
| KSP | Applying structural settings with `Part.autoStrutMode` and `Part.rigidAttachment` | [EditorExtensionsRedux](https://github.com/linuxgurugamer/EditorExtensionsRedux/blob/bc7430b4e061987e847230e163986ed8bb68192c/EditorExtensionsRedux/EditorExtensionsRedux.cs) (MIT) |

Separation force uses KSP's public `ModuleDecouplerBase.ejectionForcePercent` field. Roles add a named entry to `Part.customPartData`, exposed for saving and loading. These also use production compile-time references and ordinary public access, without private reflection. See the community [Part member reference](https://kspmoddinglibs.github.io/KSPDocsSite/class_part.html) and [ModuleDecouple member reference](https://kspmoddinglibs.github.io/KSPDocsSite/class_module_decouple.html); these are not official compatibility guarantees.

Access to `PartLoader`, `Part.parent/children`, `AttachNode.attachedPart`, part transforms, and attachment rules also uses ordinary public member calls in production. The connection graph is an original implementation, checked through KSP save/reload and live testing. Investigation sources, test code, and logs stay in untracked `Development/` and are excluded from production builds.
