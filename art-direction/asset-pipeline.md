# Asset pipeline

`assets/` holds source-art instructions and, later, appropriately licensed source
files/references. `public/assets/` holds only approved browser-ready exports.
No final models or third-party artwork ship in this foundation. Do not copy
copyrighted reference imagery into this public repository without rights.

1. Brief the character from story and the visual bible: identity, motive, scale,
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
5. Load through full `@babylonjs/loaders/glTF` when GLBs arrive; it is pinned
   alongside `@babylonjs/core`. Keep import/loading behind `src/game/`. Preserve
   simulation identities and presentation hooks when replacing procedural meshes.
6. Measure download size, GPU memory, draw calls, animation readability, and
   load failure behavior on the actual browser baseline before adding compression
   or texture budgets. No speculative decoder/CDN dependency yet.

Large binary source files may need Git LFS later; choose that policy with actual
assets. Do not introduce remote hosting or a build/export pipeline implicitly.
