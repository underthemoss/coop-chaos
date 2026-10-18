# Asset pipeline

`assets/` holds source-art instructions and, later, appropriately licensed source
files/references. `public/assets/` holds only approved browser-ready exports.
No final models or third-party artwork ship in this foundation. Generated concept
boards stay under `art-direction/concepts/`; they are design evidence, not browser
textures or a substitute for mesh/rig qualification. Do not copy
copyrighted reference imagery into this public repository without rights.

1. Brief from story and the visual bible, using the accepted visual direction in
   [tree exploration](tree-design-exploration.md), the proposals in
   [chicken exploration](chicken-design-exploration.md), and
   [tree kinships](../story/tree-kinships.md) as appropriate. Generated concept
   PNGs are references, not shipped GLBs. Keep botanical family, tree growth form
   and individual identity separable; chicken lineage is not a job or moral caste.
   For a chicken, establish mobility and usable perch/access before authoring clips;
   never assume all future bodies can use the opening flock's flight. Brief identity,
   motive, scale,
   silhouette, emotional beats, camera distance, and required animation clips.
2. Author in Blender. Keep editable source, consistent naming, meter scale,
   applied transforms, a clear root, and stable animation clip names. Check wing
   and foot deformation. Agree a bone/clip contract before many characters depend on it.
3. Export glTF 2.0 binary (`.glb`) with supported PBR materials and embedded assets.
   Verify scale, handedness/orientation, origin, bounds, textures, and animations
   inside Babylon, not just in Blender.
4. Place approved exports under `public/assets/characters/` or `environment/`.
   Add provenance: author/source, license or permission, modifications, file and
   export version. Source and runtime bytes have distinct jobs.
5. Load through full `@babylonjs/loaders/glTF`; it is pinned
   alongside `@babylonjs/core`. Keep import/loading behind `src/game/`. Preserve
   simulation identities and presentation hooks when replacing procedural meshes.
6. Measure download size, GPU memory, draw calls, animation readability, and
   load failure behavior on the actual browser baseline before adding compression
   or texture budgets. No speculative decoder/CDN dependency yet.

Large binary source files may need Git LFS later; choose that policy with actual
assets. Do not introduce remote hosting or a build/export pipeline implicitly.

## Current Blender authoring proof

`npm run assets:build` runs [the portable authoring launcher](../assets/sculpted/build.py)
with Blender 4.5 LTS and Python 3. Set `BLENDER_BIN` to its executable when Blender
is not on PATH. Normal install, build and check consume the checked exports and
never require Blender. [Source provenance and coordinates](../assets/sculpted/README.md)
cover the original environment geometry, generated surface albedos and
[chicken pose contract](../assets/sculpted/chickens/README.md).

The sources retain editable `.blend` files, deterministic authoring recipes,
materials, named anchors and seven chicken action clips (including settled roost). These clips animate rigid
articulations; they are not finished skinned production rigs. The environment
kit includes three trees, a woven home and store, cut reeds, growing reeds and
understory. A separate editable dressing kit adds birch/willow silhouettes,
volumetric bushes, grass, cattails and rocks. The current terrain uses a quiet
world-located earth/grass/woodland albedo mask; generated albedos remain retained
palette studies and reproducible derivatives. Concept boards are references; no scene illustration is used as a
background. Generated ground albedos are surface detail with independent geometry
and lighting. Exact tile seams and material transfer need actual-camera inspection.

The previous [Node experiment](../assets/models/export-models.mjs) is visually
rejected and archived. Its output is confined to ignored `output/legacy-node-assets/`;
it cannot replace runtime exports. A successful GLB export or use of Blender is
not visual acceptance. The [art-led sandbox brief](opening-view-exploration.md)
sets the opening-view-v2 comparison, including close artifacts, the live fixed
camera, motion, materials and environment. Current visual acceptance remains open.

The renderer stages the complete kit, reports loading/failure, permits retry and
disposes late async loads on unmount. Preserve simulation identities, cargo,
perch/deck/ladder anchors and saved coordinates when replacing art. Smaller
secondary trees share one presentation transform with homes, ladder approaches,
flight endpoints and occupied perches; never scale only the visible tree. Keep fixed
responsive framing, with no camera navigation or zoom. Validate topology, finite
normals, PBR materials, embedded resources, anchors and clips, then qualify actual
movement/work, attachment alignment, narrow layout and measured local performance.

For the current lighting proof, compare assets at the same runtime camera before
changing effects. The close Blender renders use Cycles/AgX and studio key/fill/rim;
they are not a matched Babylon lighting baseline. The runtime now loads an original
analytic sky, prefiltered locally to a checked `.env`, alongside its directional
sun, contact shadows and restrained SSAO. See the [source/provenance and conversion
steps](../assets/sculpted/README.md#original-ambient-sky). No remote demo environment
is fetched. StandardMaterial diffuse colors use their documented gamma input;
imported linear glTF PBR factors remain untouched. The controlled comparison keeps
exposure, sun and camera fixed; image processing uses its standard output treatment
without an additional tone mapper. Geometry, material structure and composition
remain the quality owners; adding effects does not establish visual acceptance.

The workflow follows Babylon's [HDR environment guide](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment)
and [PBR environment irradiance documentation](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/masterPBR).
Helena Hansen's original [Lush Tree breakdown](https://gamesartist.co.uk/lush-tree/)
is a craft reference for authored foliage volume and material structure, not a
source of copied assets. Compare matched camera/light evidence before attributing
a flat crown to the exporter or adding another effect.

## Canopy additions

`assets/sculpted/technology/author_technology.py` is included in `assets:build`.
It authors the lateral sleeping deck and hauling basket with editable Blender
sources and checked GLBs. Its [contract](../assets/sculpted/technology/contract.json)
records tree-local perches, moving basket, cargo socket and scalable lift-rope
anchors. The runtime applies one shared tree transform to art and occupants;
saved simulation progress drives essential lift movement even under reduced motion.
The basket is an original woven beak-scale rig, not a powered elevator.
