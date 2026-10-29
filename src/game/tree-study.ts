import type { Scene } from "@babylonjs/core/scene";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { terrainHeight, type MapDefinition } from "../content/maps";
import { treeStudyForms, unionStudyBounds, type StudyBounds, type StudyHabitation, type TreeStudyForm } from "./tree-study-view";

export const studyOrigin = { x: 6, z: 1 };
export const studyBirds = [{ x: 4.3, z: -2.6 }, { x: 5.4, z: -2.3 }, { x: 6.5, z: -2.7 }, { x: 7.6, z: -2.4 }];
/** One scene lifetime: stale asynchronous imports are disposed and cannot reappear. */
export function createTreeStudy(scene: Scene, map: MapDefinition, shadows: ShadowGenerator,
  changed: () => void, report: (message: string) => void, habitation?: StudyHabitation,
  homeModules?: { assetUrl: string }) {
  let alive = true, form: TreeStudyForm = "longbough", branches = false, structures = true;
  const roots = new Map<TreeStudyForm, TransformNode>();
  const bounds = new Map<TreeStudyForm, StudyBounds>();
  const sourceFrames = new Map<TreeStudyForm, TransformNode>();
  let templates: ReadonlyMap<string, { root: TransformNode; cargo: TransformNode }> | undefined;
  const deckBirds: TransformNode[] = [];
  const y = terrainHeight(map, studyOrigin.x, studyOrigin.z); // Anatomical Y0; authored root underside is intentionally buried.
  const ready = Promise.all(treeStudyForms.map(async asset => {
    const imported = await ImportMeshAsync(asset.id === "longbough" && habitation
      ? habitation.assetUrl : `/assets/environment/studies/${asset.file}`, scene);
    if (!alive) {
      imported.meshes.forEach(m => m.dispose(false, true));
      imported.animationGroups.forEach(a => a.dispose());
      return;
    }
    const root = new TransformNode(`study-${asset.id}`, scene);
    root.position.set(studyOrigin.x, y, studyOrigin.z);
    root.rotation.y = Math.PI; // Open +Z authoring face looks toward the fixed camera.
    imported.meshes[0].parent = root;
    sourceFrames.set(asset.id, imported.meshes[0]);
    // Separate host-fitted reed modules keep the accepted tree bytes intact.
    // Both glTF frames share the same parent/handedness conversion: nesting one
    // conversion inside the other would reflect the authored attachment positions.
    if (asset.id === "longbough" && homeModules) {
      try {
        const modules = await ImportMeshAsync(homeModules.assetUrl, scene);
        modules.meshes[0].parent = root;
        imported.meshes.push(...modules.meshes);
      } catch (error) {
        root.dispose(false, true); sourceFrames.delete(asset.id); throw error;
      }
      if (!alive) { root.dispose(false, true); sourceFrames.delete(asset.id); return; }
    }
    const meshBounds: StudyBounds[] = [];
    imported.meshes.forEach(mesh => {
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      shadows.addShadowCaster(mesh);
      mesh.computeWorldMatrix(true);
      if (mesh.getTotalVertices()) {
        const b = mesh.getBoundingInfo().boundingBox;
        meshBounds.push({ min: b.minimumWorld.asArray(), max: b.maximumWorld.asArray() });
      }
    });
    bounds.set(asset.id, unionStudyBounds(meshBounds));
    roots.set(asset.id, root);
    populateDecks();
    apply();
    changed();
  }));
  // Individual successes remain viewable if another asset fails; retry remounts the scene.
  void ready.catch(() => { if (alive) report("A tree could not load. Retry the study to reload its assets."); });
  function populateDecks() {
    const parent = roots.get("longbough");
    const sourceFrame = sourceFrames.get("longbough");
    if (!habitation || !templates || !parent || !sourceFrame || deckBirds.length || !alive) return;
    const sourceToWorld = sourceFrame.computeWorldMatrix(true);
    for (const fixture of habitation.birdFixtures) {
      const floor = habitation.deckFloors.find(deck => deck.floorTag === fixture.floorTag
        && Math.abs(deck.center[1] - fixture.position[1]) <= .001);
      if (!floor)
        throw new Error(`Invalid study floor for ${fixture.id}`);
      const template = templates.get(fixture.character);
      if (!template) throw new Error(`Missing study bird ${fixture.character}`);
      const bird = template.root.clone(`study-deck-bird-${fixture.id}`, parent)!;
      // glTF's handedness root is part of the coordinate contract, not bird scale.
      bird.setAbsolutePosition(Vector3.TransformCoordinates(Vector3.FromArray(fixture.position), sourceToWorld));
      const heading = Vector3.TransformNormal(new Vector3(Math.sin(fixture.yawRadians), 0, Math.cos(fixture.yawRadians)), sourceToWorld);
      const yaw = Math.atan2(heading.x, heading.z) - parent.rotation.y;
      bird.rotation.set(0, Math.atan2(Math.sin(yaw), Math.cos(yaw)), 0);
      const cargo = bird.getChildTransformNodes().find(node => node.name.endsWith(template.cargo.name));
      cargo?.setEnabled(fixture.cargo);
      bird.getChildMeshes().forEach(mesh => { mesh.isPickable = false; mesh.receiveShadows = true; shadows.addShadowCaster(mesh); });
      deckBirds.push(bird);
    }
    apply();
  }
  function apply() {
    roots.forEach((root, id) => {
      root.setEnabled(id === form);
      root.getChildMeshes().forEach(mesh => {
        if (mesh.name === "crown-foliage") mesh.setEnabled(!branches);
        if (mesh.name.startsWith("study-structure-")) mesh.setEnabled(structures);
      });
    });
    deckBirds.forEach(bird => bird.setEnabled(form === "longbough" && structures));
  }
  return {
    ready,
    select(next: TreeStudyForm, showBranches: boolean, showStructures = true) {
      form = next; branches = showBranches; structures = showStructures; apply();
    },
    attachBirds(next: ReadonlyMap<string, { root: TransformNode; cargo: TransformNode }>) {
      templates = next; populateDecks();
    },
    detailBounds() {
      const local = habitation?.detailBounds ?? { min: [-3, 3, -2], max: [3, 8, 3] };
      const frame = sourceFrames.get("longbough");
      if (frame) {
        const matrix = frame.computeWorldMatrix(true), corners: StudyBounds[] = [];
        for (const x of [local.min[0], local.max[0]]) for (const y of [local.min[1], local.max[1]]) for (const z of [local.min[2], local.max[2]]) {
          const point = Vector3.TransformCoordinates(new Vector3(x, y, z), matrix).asArray();
          corners.push({ min: point, max: point });
        }
        return unionStudyBounds(corners);
      }
      return { min: [studyOrigin.x - local.max[0], y + local.min[1], studyOrigin.z - local.max[2]],
        max: [studyOrigin.x - local.min[0], y + local.max[1], studyOrigin.z - local.min[2]] };
    },
    bounds() {
      // Until every candidate loads, a conservative authoring envelope keeps the first preview stable.
      const provisional = { min: [studyOrigin.x - 7, y, studyOrigin.z - 5], max: [studyOrigin.x + 7, y + 13, studyOrigin.z + 5] };
      return unionStudyBounds([...(bounds.size === 3 ? [] : [provisional]), ...bounds.values(),
        { min: [3.2, y - .4, -3.2], max: [8.8, y + 1, -1.8] }]);
    },
    loaded() { return roots.size; },
    dispose() { alive = false; roots.forEach(root => root.dispose(false, true)); roots.clear(); sourceFrames.clear(); },
  };
}
