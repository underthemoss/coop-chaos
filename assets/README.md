# Source and reference assets

[sculpted/](sculpted/README.md) contains original editable Blender sources,
authoring recipes, pose clips and generated albedo provenance. Rebuild with
`npm run assets:build` using Blender 4.5 LTS and Python 3 (`BLENDER_BIN` may select
the executable). App build/check use the checked runtime exports without Blender.

[models/export-models.mjs](models/export-models.mjs) is the archived, visually
rejected Node experiment. It writes only ignored experimental output and cannot
overwrite runtime art. Follow [the asset pipeline](../art-direction/asset-pipeline.md).
Source files are not shipped automatically; exports live in `public/assets/`.
