# Sculpted asset proof — work in progress

Original project-authored Blender geometry is retained here alongside runtime
exports in `public/assets/`. The earlier Node-authored mesh pass was rejected;
these assets require fresh close-view and actual-camera acceptance. Tool use and
file format do not establish visual quality.

`author.py` authors three trees, woven home/store, fern understory, growing reeds and cut-reed bundle in Blender 4.5 LTS.
It retains fused trunk/root anatomy, editable foliage, explicit natural-perch,
deck and ladder reference nodes. `render-proof.py` creates inspection images in
ignored `output/playwright/sculpt-proof/`. Chicken sources have their own
[chicken contract](chickens/README.md).

The helpers use X right, Y up, Z forward; they convert to Blender coordinates
before glTF export. The tree's source origin is ground level. Stable Lowfork and
all simulation IDs remain unchanged. Natural perches are (-.86,3.15,.46) and
(.86,3.33,.46), deck is (0,2.25,-.5), ladder base is (0,0,-1.08), in exported units.

`ground-albedo-source.png` is an original OpenAI image_gen output supplied for
this project, not third-party reference art. Prompt: square seamless stylized
warm ochre compact soil 70%, sage/olive moss 30%, fine grit; no perspective,
objects, text or shadows; flat diffuse albedo. The original is preserved; a
1536-pixel JPEG derivative is retained for material experiments; the current
working court uses a quiet code-authored graded material. Generated seamlessness
must be inspected at repeat, and the texture is not a scene backdrop.

No imported commercial meshes, stock artwork or copyrighted reference pixels are
embedded. Generated concept sheets remain reference material in `art-direction/`.
This document records provenance, not a new repository license selection.

`woodland-albedo-source.png` is a second original OpenAI image_gen output:
square seamless flat diffuse 70% quiet grey-sage/moss/olive groundcover and 30%
muted taupe/ochre earth, few small stones, low contrast, no trees, objects,
perspective or shadows. The original is preserved and a 1536-pixel JPEG supplies
woodland surface detail. The warm court uses a restrained graded material; neither albedo is a background.

Regenerate with `npm run assets:build` using Blender 4.5 LTS and Python 3. Set
`BLENDER_BIN` to the Blender executable when it is not on PATH. This regenerates
the editable environment and chicken sources plus all runtime GLBs, without
rendering proof images. Normal app build/check never invokes Blender. The old
Node experiment now writes only ignored `output/legacy-node-assets/` and cannot
replace runtime exports. Close proof renders are separate optional inspection.
