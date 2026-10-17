# Runtime assets

Original project-authored Blender exports live in `characters/` and `environment/`.
Editable sources and export recipes: [sculpted source](../../assets/sculpted/README.md)
and [chicken contract](../../assets/sculpted/chickens/README.md). Regenerate with
`npm run assets:build`; the running app never needs Blender. Six named bird clips
animate rigid articulations, not finished skinned rigs. Surface JPEGs in
`materials/` derive from original generated albedos with provenance in the source
README. Concept scene illustrations are not runtime backgrounds.

These are active art proofs, with actual-camera visual acceptance still open.
No third-party reference pixels or commercial models are embedded. No general
repository license has been selected. Preserve stable IDs, transforms, attachment
coordinates and load/failure/retry behavior under [the pipeline](../../art-direction/asset-pipeline.md).
