# Valley rock kit — landscape-v3

Three original project-authored environment sculptures for the tree-free valley
landscape study. They are decorative presentation geometry, with no resource,
obstacle, traversal, building, or simulation meaning. This kit does not establish
new world canon or claim concept-image parity.

| Export in `public/assets/environment/` | Width × height × depth, meters | Triangles |
| --- | --- | ---: |
| `valley-cliff-ledge.glb` | 3 × 2 × 1.2 | 1,184 |
| `valley-boulder.glb` | 1.2 × .9 × 1 | 438 |
| `valley-scree.glb` | 1.8 × .3 × 1 | 1,526 |

The exact GLB bounds, hashes, download sizes, exported vertex counts, triangle
counts, draw primitives and validation results live in `gltf-checks.json`.
`qualification.json` records authoring metadata. Both are generated records.

`author_landscape.py` is a standalone deterministic Blender 4.5 LTS recipe. Three
`valley-*.blend` files retain editable meshes, separate rough rock/moss materials,
corner colors, applied unit transforms and a clear root. The `landscape-v3`
studio Blend and contact sheet are DCC inspection evidence; studio geometry,
labels, lights and camera never enter runtime exports.

```sh
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/landscape/author_landscape.py
python3 assets/sculpted/landscape/validate.py
BLENDER_BIN="$BLENDER_BIN" python3 assets/sculpted/landscape/reproduce.py
```

Append `-- --no-render` to export without a studio render. `-- --proof-only`
reconstructs the studio without touching runtime exports. The script writes only
this source folder and its three `public/assets/environment/valley-*.glb` files;
it neither imports other recipes nor changes the existing asset build launcher.
No Blender executable is needed for normal game install/build/check.

Every export has one root named `asset` at `(0,0,0)`, one mesh node named
`weathered-stone-and-moss`, and two opaque, single-sided PBR primitives reading
`COLOR_0`: `valley-mineral-rough` (roughness .94), `valley-moss-rough` (.99).
Metallic is zero. Retain imported vertex color and normals; use shared materials
and instances where appropriate. There are no textures, animations, cameras,
lights, skins or external resources. Export coordinates are glTF +Y up, +Z front.
The origin is horizontal bounds center at exact lowest Y=0, with unit scale.
Uniform scale and yaw variations are safe. The ledge's outward shelves face +Z;
its rear is volumetric and closed, not a view-dependent plane. Full bounds are
X[-1.5,1.5], Y[0,2], Z[-.6,.6]. Terrain overlap and ramp clearance belong to the
integration owner; the mesh alone does not prove a valid route.

The cliff combines interlocking irregular broad shoulders, broken shelf courses,
recessed seams and grounded toe chips. The boulder has asymmetrical angular
fracture courses rather than an icosphere. Scree is a composed fan of 24 varied
warm gravel stones. Gray-olive and taupe minerals, cool fissures, warm exposed
planes and restrained organic moss islands provide surface variation. Geometric
undercuts generate contact shadows at render time. No directional sunlight or
reference pixels are baked into the assets.

Provenance: original mesh, palette, seeded mathematical constructions and script
authored within this project on 2026-10-24, exported with Blender 4.5.3 LTS.
Internal visual references: `art-direction/concepts/chicken-civ-scene-v2.png` and
the live valley screenshot supplied in the task, alongside the visual bible and
asset pipeline. No third-party meshes, photographs, textures, licensed artwork,
image-generation output or secrets are embedded. This provenance does not select
a new repository license.

`validate.py` reads the actual GLB bytes and checks embedded glTF 2, exact grounded
bounds, finite indexed geometry, unit normals, nondegenerate triangles, positive
signed volume, the 300–2,000 triangle budget, corner-color variation and the
material/node/resource contract. `determinism.json` records repeated-export hash
comparison. Final Babylon loading, fixed-camera composition, narrow layout,
console and route acceptance remain with the renderer/browser integration owner.
No browser, global check, commit, publication or deployment is claimed here.
