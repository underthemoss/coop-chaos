# Playable Longbough reed habitat

Shape revision `clearing-crown-shape-v3` preserves the accepted v4 golden-green palette, living sculpt, staged woven kit and exact habitat profile. Crown geometry now has unequal elongated sprays, variable shoulder heights/depth, tapered ends and recessed support cores, with no added vertices or triangles. Whole original foliage components near the measured natural approaches are retained to protect actual body clearance. One hero still has two natural places, an earned lower two-place home and an earned middle two-place deck; no top platform or new capacity.

`shape-baseline-v4/` preserves the accepted prior GLBs, receipts and authoring evidence. `crown-shape-checks.json` proves every COLOR_0 value, wood attribute, triangle index, UV, material, node and embedded image unchanged. Only crown POSITION/NORMAL and their bounds change. Actual animated flight/roost/access, sole and basket/support checks were rerun against the current hero hash. Prior palette-only proofs are historical. Current `candidate-whole/detail/strategy/grove.png` images are actual exported shape-v3 source evidence; actual runtime camera qualification belongs to the integration owner.

The new `valley-bank-family-v1` contains three original economical fractured rock forms for blocked banks and shore edges. They have warm grey mineral planes, cooler wet lower faces and protected upper moss. Their full source footprints must be partly buried into runtime-owned blocked bank placements; they do not change terrain, ford support or navigation.

The single numeric source is [`src/content/valley-habitat.json`](../../../src/content/valley-habitat.json). Python authoring/qualification and TypeScript consumers read it. Its metre-space is anatomical ground Y0, +Y up, +Z front; keep the buried negative-Y root allowance. Ground the anatomical origin to terrain, never normalize to the asset's minimum Y. The runtime compensates the Babylon glTF source reflection once for the living asset and kit alike. Map placement is owned separately by the generated inhabited-valley map and placement files.

## Assets and stages

- `/assets/environment/valley/longbough-living.glb`: only `living-wood` and opaque `crown-foliage`. Current shape preserves every living-wood attribute, crown topology/UV/color, hierarchy/material and embedded image byte against `shape-baseline-v4`; crown positions/normals are selectively reauthored. Earlier warm/cool appearance work is preserved in that baseline. `appearance-geometry.json` proves the boundary. Editable `longbough-living.blend` imports these actual final bytes.
- `/assets/environment/valley/longbough-woven-kit.glb`: original bound-reed woven bays, paired folded-wing hoods, lashes, open climbing rails/grips, compact middle tier and functional basket. Editable `longbough-woven-kit.blend` and deterministic `author_valley.py` recipe are supplied.
- `profile.stages` names actual render meshes. `basket` and `lift-rope` are functional empty controls; their visible children are `basket-weave` and `lift-rope-fiber`. No timber floors, decorative inventory or free third tier.
- `/assets/environment/valley/valley-grove-{oak,spread,shrub}.glb`: two independently authored asymmetrical broadleaf trees and a low shrub, two opaque rough PBR primitives each. These are original continuous fused limbs with small folded leaves concentrated on exposed crown shoulders and recessed dark support cores. All use anatomical Y0, metres and +Z front; negative root tips are buried. `grove-assets.json` provides exact bounds, low-wood bounds and hashes. Runtime owns placements outside playable terrain or within reserved blocked space.

The measured lower/middle woven areas are 5.891m² and 3.840m². Their useful flat sole supports and .65m front circulation are preserved. An open arrival notch is a climbing aperture, not a continuously grounded walking ramp. Source supports visibly enter the living wood; their contact report is geometric evidence, not an engineering-strength claim. Grounded approach waypoints circle the ladder's open front rather than crossing a side rail.

Natural body origins are solved from actual roost toe projections and whole evaluated adult meshes, with required outward settled yaws. A ray under the body origin alone is insufficient on a sculpted branch. The accepted folded landing turns/folds over saved progress .66→.73; source path begins after saved .10. Source animation qualification uses five flight frames through authored .70 and three folded-roost frames from authored2/3 (saved .70), including overlapping transition coverage and actual settled roosts. Freely reversed natural rest headings remain rejected diagnostics in `source-fit.json`.

The map work cell remains authoritative for ground routing. `groundWorkPoint` describes the authored court center; the current grid work point is not identical. `groundApproach` and `naturalGroundApproach` are consumed after the normal route reaches the map work cell. `source-access-animation.json` records both actual map-local and court-reference first legs. No teleport or hidden route migration is implied.

## Bank family

All three use metres, center-bottom Y0, +Y up, +Z exposed outward face and +X tangent. One mesh and two opaque nonmetal PBR primitives per asset: mineral roughness .94, moss .99. Vertex colors are embedded, without textures. `bank-assets.json` records true bounds and hashes; `bank-checks.json` qualifies the actual exports.

| Asset | Dimensions X/Y/Z (m) | Triangles | Bytes |
| --- | --- | --- | --- |
| valley-bank-shoulder.glb | 3.6 / 1.5 / 1.4 | 1,526 | 157,936 |
| valley-bank-shelf.glb | 3.2 / .4 / 1.4 | 1,254 | 130,204 |
| valley-shore-outcrop.glb | 2.2 / .9 / 1.5 | 936 | 97,732 |

`author_banks.py` reuses this repository's original `../landscape/author_landscape.py` fracture-course helpers for new unequal interlocking compositions and protected moss. No external imagery or meshes. Runtime owns rotation/scale, partial burial, lighting and full-footprint blocked-bank safety. Do not form a regular picket wall or place these on crossings/walkable cells.

## Lift interface

`basket` is translated from `basket-ground` by `travelY × progress`. `cargo-socket` alone is basket-local, including its yaw; all other named anchors are hero-local. The actual half-scale reed bundle lies across the basket floor, about 3mm above the woven surface. Apply authored socket yaw once, not once at both asset and payload.

`lift-rope` stays at its fixed top. Its child is authored one metre downward; scale its Y length by `(ropeRestLength − travelY × progress) / ropeAuthoredLength`. The ground and upper basket floor/bridle locations are derived from the shared profile. Source proof sweeps the whole basket plus actual payload through 21 positions; it does not add passenger, ladder-cargo or elevator abilities.

## Provenance and reproduction

No external assets or copied reference pixels. The accepted original Longbough is preserved byte-identically; its original painted bark provenance remains in `../valley-trees/`. New structures reuse the original reed-family builders in `../buildings/author_buildings.py`, with explicit mesh/material grouping and new fitted geometry. The original generated reed image and exact prompt/provenance are `../buildings/reed-weave-v1-source.png` and `reed-material-provenance.json`. It has some woven shading; no verified perfect-seamless or physically unlit-texture claim is made. Old building GLBs remain byte-identical.

From the repository root, with Blender4.5.3:

```sh
/tmp/coop-landscape-blender/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/sculpted/valley-playable/author_crown_shape.py
/tmp/coop-landscape-blender/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/sculpted/valley-playable/author_banks.py
python3 assets/sculpted/valley-playable/verify_reproducibility.py
```

The current crown generator reads frozen accepted-v4 GLBs, never the last output. The bank generator starts from its deterministic original recipe. `verify_reproducibility.py` performs two fresh Blender processes for each generator and requires all eight shipped GLB hashes and the profile to stay exact. Editable Blend file bytes are not asserted deterministic. Historical extraction/geometry/appearance/grove generators are preserved but are not the current one-step regeneration path.

Run `check_shapes.py`, `check_artifacts.py`, `check_grove.py`, `validate_animation_fit.py`, `validate_access_animation.py`, `validate_soles.py` and `validate_support.py` with the same `Blender -b --python-exit-code 1 --python` entrypoint. Current shape qualification replaces historical `check_appearance.py` and `check_palette.py` position-identity assumptions. `render_valley.py -- detail whole strategy floors`, `render_grove.py` and `render_banks.py` render the actual exports. These are DCC evidence, not saved-game/runtime proof; adults/payload are proof-only fixtures.

Grove limbs reuse the original geometric helper functions in `../valley-trees/author_trees.py`, with new individual growth paths; they do not duplicate a full hero. Their diffuse bark uses the original generated `../valley-trees/bark-painted-v1-source.png`, whose prompt/source provenance is retained there. Blender embeds a JPEG85 derivative to bound payload; the original PNG is unchanged. No external imagery or reference pixels were copied. Leaf shapes and all grove geometry are original procedural meshes.

`root-sections.json` contains exact wood/plane intersection segments and conservative radial envelopes at several terrain-relative heights. The current canonical map deliberately reserves the conservative full low-wood envelope including buried portions, plus .35m clearance. It does not use an exact plane-collision mask. These surface sections preserve evidence for future tightening; canopy bounds are not the current root mask. Diagnostic search scripts/outputs retain rejected/provisional evidence; they are not another anchor table.

## Qualification boundary

See `asset-receipt.json`, `asset-checks.json`, `appearance-geometry.json`, `grove-checks.json`, `crown-shape-checks.json`, `bank-checks.json`, `determinism.json`, `source-fit.json`, `source-animation-fit.json`, `source-access-animation.json`, `source-soles.json`, and `source-support.json` for real byte hashes, dimensions, counts and sampled checks. Current hero+kit total 18,293,416 bytes / 161,964 triangles / 22 primitives; triangle/vertex delta is zero and kit/wood exact. Scenic oak/spread/shrub add 4,896,504 bytes / 53,039 triangles / six primitives across three reusable assets. Bank family adds 385,872 bytes / 3,716 triangles / six primitives across three reusable assets. Runtime performance and transformed/reopened journeys belong to the integration owner.

The broader sculpt and leaf-lobe rhythm remain stylized. Bark is original painted diffuse plus existing sculpt relief; foliage lighting is simplified and opaque. Grove-v2 was accepted for layered scenic/background use at normal gameplay camera, with occasional exposed core shoulders and lobe rhythm remaining; it is not a new close-up hero. Natural bark is curved: toe samples record small local penetration/gaps without an IK/grasp or zero-collision claim. There is no structural-strength, automatic navigation, production-art fidelity, new population capacity or future body-mobility proof. Original maps, tree habitats, v8 studies and prior building exports are preserved. This lane runs source asset/fit checks; required npm checks and actual Babylon camera/journey/performance qualification remain with the runtime owner.

## Versioned source package

The source package retains current editable Blends, original texture inputs,
recipes, receipts and the `shape-baseline-v4` GLBs required by the current crown
regeneration and validation commands above. Older appearance/palette baseline
folders, rejected tree-study studio iterations, duplicate render evidence and
transient authoring logs remain local historical archives outside the versioned
package. Historical generator/check scripts preserve context; their archived
inputs are not the current one-step regeneration contract. Normal game
installation, build and play use the included runtime exports and need no Blender.
