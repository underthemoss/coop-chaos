import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { defaultValley } from "../content/small-valley";
import { createTreeStudy } from "./tree-study";
import type { StudyHabitation } from "./tree-study-view";
vi.mock("@babylonjs/core/Loading/sceneLoader", () => ({ ImportMeshAsync: vi.fn() }));
const importer = vi.mocked(ImportMeshAsync);
const engines: NullEngine[] = [];
afterEach(() => { engines.forEach(e => e.dispose()); engines.length = 0; importer.mockReset(); });
function setup() {
  const engine = new NullEngine(); engines.push(engine);
  const scene = new Scene(engine);
  const shadows = new ShadowGenerator(64, new DirectionalLight("sun", new Vector3(0, -1, 1), scene));
  const loaded = vi.fn(), failed = vi.fn();
  return { scene, shadows, loaded, failed };
}
function asset(scene: Scene) {
  const root = new Mesh("asset", scene);
  const wood = MeshBuilder.CreateBox("living-wood", { height: 8, width: 3 }, scene);
  wood.position.y = 4; wood.parent = root;
  const crown = MeshBuilder.CreateBox("crown-foliage", { size: 10 }, scene);
  crown.position.y = 5; crown.parent = root;
  const deck = MeshBuilder.CreateBox("study-structure-deck", { width: 3, height: .2 }, scene);
  deck.position.y = 3.1; deck.parent = root;
  return { meshes: [root, wood, crown, deck], animationGroups: [], root, wood, crown, deck };
}
describe("tree-study scene lifetime", () => {
  it("switches one candidate without changing the union fit and hides only foliage", async () => {
    const env = setup(), assets = [asset(env.scene), asset(env.scene), asset(env.scene)];
    assets.forEach(a => importer.mockResolvedValueOnce(a as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>));
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed);
    await study.ready;
    const bounds = study.bounds();
    study.select("crowncourt", true);
    expect(assets[0].wood.isEnabled()).toBe(false);
    expect(assets[1].wood.isEnabled()).toBe(true);
    expect(assets[1].crown.isEnabled()).toBe(false);
    study.select("windward", false);
    expect(assets[2].crown.isEnabled()).toBe(true);
    expect(study.bounds()).toEqual(bounds);
    expect(study.loaded()).toBe(3);
    expect(env.failed).not.toHaveBeenCalled();
    study.dispose();
    expect(assets.every(a => a.wood.isDisposed())).toBe(true);
  });
  it("disposes late imports after exit without reporting readiness", async () => {
    const env = setup();
    let finish!: (a: Awaited<ReturnType<typeof ImportMeshAsync>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof ImportMeshAsync>>>(resolve => { finish = resolve; });
    importer.mockReturnValue(pending);
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed);
    study.dispose();
    const late = asset(env.scene);
    finish(late as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>);
    await study.ready;
    expect(late.wood.isDisposed()).toBe(true);
    expect(env.loaded).not.toHaveBeenCalled();
    expect(study.loaded()).toBe(0);
  });
  it("reports a load failure once", async () => {
    const env = setup();
    importer.mockRejectedValue(new Error("missing study"));
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed);
    await expect(study.ready).rejects.toThrow("missing study");
    expect(env.failed).toHaveBeenCalledTimes(1);
    study.dispose();
  });
  it("ignores a late rejection after exit", async () => {
    const env = setup();
    let reject!: (reason: Error) => void;
    importer.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed);
    study.dispose();
    reject(new Error("exited"));
    await expect(study.ready).rejects.toThrow("exited");
    expect(env.failed).not.toHaveBeenCalled();
  });
  it("fits separate home modules in the same source frame and toggles them only with Longbough structures", async () => {
    const env = setup(), assets = [asset(env.scene), asset(env.scene), asset(env.scene)];
    const modules = asset(env.scene);
    modules.wood.name = "study-structure-boughhome-reeds";
    for (const value of [assets[0], modules]) {
      value.root.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI);
      value.root.scaling.z = -1;
    }
    assets.forEach(a => importer.mockResolvedValueOnce(a as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>));
    importer.mockResolvedValueOnce(modules as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>);
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed,
      undefined, { assetUrl: "/home-modules.glb" });
    await study.ready;
    expect(modules.root.parent).toBe(assets[0].root.parent);
    expect(modules.wood.getAbsolutePosition().asArray()).toEqual(assets[0].wood.getAbsolutePosition().asArray());
    study.select("longbough", true, false);
    expect(modules.wood.isEnabled()).toBe(false);
    expect(assets[0].wood.isEnabled()).toBe(true);
    study.select("longbough", false, true);
    expect(modules.wood.isEnabled()).toBe(true);
    study.select("crowncourt", false, true);
    expect(modules.wood.isEnabled()).toBe(false);
    study.dispose(); expect(modules.wood.isDisposed()).toBe(true);
  });
  it("disposes the fitted host when its dependent module fails and reports one retryable error", async () => {
    const env = setup(), assets = [asset(env.scene), asset(env.scene), asset(env.scene)];
    assets.forEach(a => importer.mockResolvedValueOnce(a as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>));
    importer.mockRejectedValueOnce(new Error("missing fitted reed modules"));
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed,
      undefined, { assetUrl: "/home-modules.glb" });
    await expect(study.ready).rejects.toThrow("missing fitted reed modules");
    expect(assets[0].wood.isDisposed()).toBe(true);
    expect(env.failed).toHaveBeenCalledTimes(1);
    study.dispose();
    expect(assets.every(a => a.wood.isDisposed())).toBe(true);
  });
  it("disposes an in-flight host and late home modules when the study exits", async () => {
    const env = setup(), assets = [asset(env.scene), asset(env.scene), asset(env.scene)];
    assets.forEach(a => importer.mockResolvedValueOnce(a as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>));
    let finish!: (a: Awaited<ReturnType<typeof ImportMeshAsync>>) => void;
    importer.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed,
      undefined, { assetUrl: "/home-modules.glb" });
    // Allow the host imports to publish or begin their dependent module import.
    await Promise.resolve();
    study.dispose();
    const late = asset(env.scene);
    finish(late as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>);
    await study.ready;
    expect(late.wood.isDisposed()).toBe(true);
    expect(assets.every(a => a.wood.isDisposed())).toBe(true);
    expect(study.loaded()).toBe(0);
    expect(env.failed).not.toHaveBeenCalled();
  });
  it("keeps supported deck figures at adult scale and toggles structures independently of foliage", async () => {
    const env = setup(), assets = [asset(env.scene), asset(env.scene), asset(env.scene)];
    // Actual glTF loader conversion, followed by the study's fixed Y rotation.
    assets[0].root.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI);
    assets[0].root.scaling.z = -1;
    assets.forEach(a => importer.mockResolvedValueOnce(a as unknown as Awaited<ReturnType<typeof ImportMeshAsync>>));
    const presentation: StudyHabitation = {
      revision: "fixture", assetUrl: "/assets/environment/studies/longbough-habitation-study.glb", anatomicalGroundY: 0, front: "+Z",
      deckFloors: [{ id: "lower", floorTag: "study-structure-deck", center: [0, 3.2, 1], outline: [[-1, 3.2, 0], [1, 3.2, 0], [1, 3.2, 2], [-1, 3.2, 2]] }],
      birdFixtures: [{ id: "lower-fern", floorTag: "study-structure-deck", position: [.3, 3.2, 1], yawRadians: .2, character: "fern", cargo: true }],
      detailBounds: { min: [-2, 3, 0], max: [4, 6, 3] },
    };
    const study = createTreeStudy(env.scene, defaultValley, env.shadows, env.loaded, env.failed, presentation);
    const template = new TransformNode("fern-template", env.scene); template.scaling.setAll(.45625);
    const cargo = new TransformNode("fern-cargo", env.scene); cargo.parent = template;
    cargo.position.set(0, 1.2, -.35); cargo.setEnabled(false);
    study.attachBirds(new Map([["fern", { root: template, cargo }]]));
    await study.ready;
    const bird = env.scene.getTransformNodeByName("study-deck-bird-lower-fern")!;
    [-.3, 3.2, 1].forEach((v, i) => expect(bird.position.asArray()[i]).toBeCloseTo(v));
    expect(bird.scaling.asArray()).toEqual([.45625, .45625, .45625]);
    expect(bird.rotation.y).toBeCloseTo(-.2);
    expect(bird.getChildTransformNodes().find(n => n.name.endsWith("fern-cargo"))?.isEnabled()).toBe(true);
    expect(importer).toHaveBeenCalledWith(presentation.assetUrl, env.scene);
    const whole = study.bounds(), detail = study.detailBounds();
    expect(detail.min[0]).toBeCloseTo(4); expect(detail.max[0]).toBeCloseTo(10);
    expect(detail.min[2]).toBeCloseTo(-2); expect(detail.max[2]).toBeCloseTo(1);
    study.select("longbough", true, true);
    expect(assets[0].deck.isEnabled()).toBe(true); expect(bird.isEnabled()).toBe(true);
    expect(assets[0].crown.isEnabled()).toBe(false);
    study.select("longbough", false, false);
    expect(assets[0].deck.isEnabled()).toBe(false); expect(bird.isEnabled()).toBe(false);
    expect(assets[0].crown.isEnabled()).toBe(true); expect(assets[0].wood.isEnabled()).toBe(true);
    study.select("crowncourt", false, true); expect(bird.isEnabled()).toBe(false);
    study.select("longbough", false, true); expect(bird.isEnabled()).toBe(true);
    expect(study.bounds()).toEqual(whole); expect(study.detailBounds()).toEqual(detail);
    study.attachBirds(new Map([["fern", { root: template, cargo }]]));
    expect(env.scene.transformNodes.filter(n => n.name === bird.name)).toHaveLength(1);
    study.dispose(); expect(bird.isDisposed()).toBe(true);
  });
});
