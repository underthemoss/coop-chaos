# Original valley surface tiles

Astra directed these original images using the built-in OpenAI image generator
on 2026-10-25. No reference images or third-party source art were supplied.
[Exact prompts and generation mode](generation-prompts.json) are preserved;
`meadow-turf-source.png` and `weathered-stone-source.png` retain the original
1254 × 1254 output bytes. The prompt requested 2048px; the actual output size
is recorded rather than inferred from the request.

Run the existing Blender runtime with `--background --python
assets/sculpted/surfaces/build.py` from the repository root. This standalone
pipeline resamples each source to a 1024px JPEG without redrawing it.
[Export receipt](exports.json) records exact source/runtime SHA-256 hashes,
dimensions and runtime byte sizes. The two JPEGs total 1,004,821 bytes.

The v2 valley's single terrain material samples mipmapped tiles in world space:
2.8m meadow repeats, 3m triplanar bluff stone, and the original earth tile at
3.7m in worn courts. Broad 1024px world color, 512px RGBA masks and gentle
512px normal relief preserve shore/soil transitions. They are baked once per
immutable map object and reused during the page session. Fine detail stays in
GPU texture sampling rather than a coarse point-sampled color bake.

Original rock GLB bytes remain unchanged. V2-only rendering adds UVs and
neutralizes the old dark mineral vertex tint, preserving its RGB stride and
leaving the separate moss material intact. Positions, indices, footprints and
instance transforms are unchanged. Woodland and valley v1 do not use these tiles.

[Actual-camera qualification](../../../output/landscape-qualification/surfaces-v1/README.md)
records overview/follow/narrow acceptance, measured load/frame costs and limits.
Seamless tiling was requested from the generator; camera inspection found no
conspicuous seams at the qualified scales, which is not proof of mathematically
seamless borders or suitability at arbitrary magnification.
