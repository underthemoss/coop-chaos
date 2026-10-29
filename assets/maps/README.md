# Constrained valley authoring

Run `npm run assets:maps` from the repository root on the supported Node version.
The pure TypeScript owner is `src/content/valley-generator.ts`; the script loads
it with the project's existing TypeScript compiler. No new runtime dependency,
Blender process or network service is required.

The fixed recipes combine one crescent landform, a diagonal creek with a pool,
smooth protected courts and several scales of seeded relief. Shared vertices
define both rendered height and navigation. Steep triangles, deep water and
content-owned rock footprints are blocked. The same height function extends
scenic land beyond the playable boundary; that exterior is not navigable.

`ochre-valley` v2, seed 7319, is the selected new-game default. Its snapshot lives
in `src/content/generated/ochre-valley-v2.json`. The two unselected recipe outputs
stay under `candidates/` and are imported only by tests. They are not production
catalog entries. `crescent-basin-art-v7.json` is a historical visual-review snapshot
with the same selected geometry and an unreleased candidate identity.

The script validates all candidates before writing any snapshot: scenario points
must connect, closing the direct ford must leave a longer route through the flank
ford, and courts must retain contiguous buildable area. `authoring-receipt.json`
records source/snapshot hashes, physical route lengths and areas. Repeating the
command with unchanged inputs produces identical bytes. Tests also check shared
triangles, slope blocking, physical movement speed, conservation and map-version
compatibility. These constraints establish traversability, not battle balance.

The production catalog also retains the exact hand-authored `ochre-valley` v1.
Changing an accepted snapshot requires a new map version; saved games never
silently adopt another seed or geography. No arbitrary-seed runtime generator,
large-map optimization, combat, unit collision, trees or construction is included.
