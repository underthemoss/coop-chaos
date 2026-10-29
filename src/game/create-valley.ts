import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3, Matrix } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Culling/ray";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { createMapTerrain } from "./map-terrain";
import type { MapDefinition, MapPoint } from "../content/maps";
import { mapPosition } from "../content/maps";
import type { Landscape, LandscapeBirdId } from "../simulation/landscape";
import { landscapeBirds, walkerPosition } from "../simulation/landscape";
import { followHalfSpan, hasTacticalPresentation } from "./valley-view";
import type { ValleyZoom } from "./valley-view";
import { createTreeStudy, studyBirds } from "./tree-study";
import { fitStudyBounds, type TreeStudyForm, type TreeStudyView } from "./tree-study-view";
import { terrainHeight } from "../content/maps";
import { habitatPresentation } from "../content/tree-habitats";
import habitationPresentation from "../../assets/sculpted/valley-trees/refinement-presentation.json";
import homeModulePresentation from "../../assets/sculpted/buildings/study-presentation.json";
export function createValley(
  canvas: HTMLCanvasElement,
  map: MapDefinition,
  options: {
    study?: boolean;
    studyLoaded?: (count: number) => void;
    pick: (at: MapPoint) => void;
    ready: () => void;
    zoomStep?: (direction: number) => void;
    error: (text: string) => void;
    labels: (positions: Record<string, { x: number; y: number }>) => void;
  },
) {
  const engine = new Engine(canvas, true, { stencil: true }, false);
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  if (options.study) canvas.tabIndex = -1;
  const scene = new Scene(engine);
  let alive = true;
  scene.clearColor = Color4.FromHexString("#c9d0bdff");
  scene.imageProcessingConfiguration.exposure = 1.15;
  scene.imageProcessingConfiguration.contrast = options.study ? 1.1 : 1.05;
  const camera = new ArcRotateCamera(
    "valley-camera",
    -Math.PI / 2.35,
    Math.PI / 3.25,
    75,
    new Vector3(0, 2, 0),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  const tactical = hasTacticalPresentation(map);
  let zoom: ValleyZoom = 2;
  let focus: LandscapeBirdId | null = null;
  let study: ReturnType<typeof createTreeStudy> | undefined;
  let studyView: TreeStudyView = "whole";
  const resize = () => {
    engine.resize();
    // Lower only the inhabited close study; whole-tree comparisons and the
    // chicken gauge retain the established strategy-camera basis.
    if (options.study) camera.beta = studyView === "detail" ? 1.1 : Math.PI / 3.25;
    const aspect = engine.getRenderWidth() / engine.getRenderHeight();
    const width = map.width * map.cellSize,
      depth = map.depth * map.cellSize;
    const heights = map.tiles.flatMap((t) => t.corners);
    const rise = Math.max(...heights) - Math.min(...heights);
    const halfWidth =
      (Math.abs(Math.sin(camera.alpha)) * width +
        Math.abs(Math.cos(camera.alpha)) * depth) /
      2;
    const halfHeight =
      (Math.abs(Math.cos(camera.alpha) * Math.cos(camera.beta)) * width +
        Math.abs(Math.sin(camera.alpha) * Math.cos(camera.beta)) * depth +
        Math.sin(camera.beta) * rise) /
      2;
    const h = focus
      ? tactical ? followHalfSpan(zoom) : Math.min(width, depth) * 0.25
      : Math.max(halfHeight, halfWidth / aspect) * 1.13;
    let span = h;
    if (study) {
      if (studyView !== "chicken") {
        const fitted = fitStudyBounds(studyView === "detail" ? study.detailBounds() : study.bounds(), camera.alpha, camera.beta, aspect);
        camera.target.set(fitted.center[0], fitted.center[1], fitted.center[2]);
        span = fitted.halfSpan;
      } else {
        camera.target.set(5.75, terrainHeight(map, 5.75, -1.5) + .65, -1.5);
        span = 4.2;
      }
    }
    camera.orthoTop = span;
    camera.orthoBottom = -span;
    camera.orthoLeft = -span * aspect;
    camera.orthoRight = span * aspect;
  };
  const hemi = new HemisphericLight("valley-sky", new Vector3(0, 1, 0), scene);
  hemi.intensity = map.terrain ? .42 : .62;
  if(map.terrain)hemi.diffuse=Color3.FromHexString("#d7e5ef");
  hemi.groundColor = Color3.FromHexString("#425c70");
  if (options.study) {
    hemi.intensity = .26;
    hemi.diffuse = Color3.FromHexString("#c7ddf2");
    hemi.groundColor = Color3.FromHexString("#637c7a");
  }
  const sun = new DirectionalLight(
    "valley-sun",
    new Vector3(-0.6, -1, 0.45),
    scene,
  );
  sun.position.set(15, 35, -20);
  sun.intensity = map.terrain ? 1.15 : 1;
  sun.diffuse = Color3.FromHexString(map.terrain ? "#ffe5bd" : "#fff0d4");
  if (options.study) {
    // A raking key reveals authored bark and fork relief. The playable valley
    // retains its own light and shadow projection without study overrides.
    sun.position.set(-12, 24, -15);
    sun.direction.set(18, -17, 16).normalize();
    sun.intensity = 1.8;
    sun.diffuse = Color3.FromHexString("#ffe5c4");
    sun.shadowFrustumSize = 32;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 65;
  }
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering = true;
  if (options.study) {
    shadows.useContactHardeningShadow = true;
    shadows.contactHardeningLightSizeUVRatio = .015;
    shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  }
  shadows.bias = 0.0005;
  shadows.normalBias = 0.005;
  shadows.setDarkness(options.study ? .2 : .28);
  const ao = new SSAO2RenderingPipeline(
    "valley-contact",
    scene,
    { ssaoRatio: 0.5, blurRatio: 0.5 },
    [camera],
  );
  ao.radius = 0.55;
  ao.totalStrength = options.study ? .8 : map.terrain ? .85 : .65;
  ao.samples = 8;
  ao.expensiveBlur = false;
  const environment = new CubeTexture(
    "/assets/materials/warm-neutral-sky.env",
    scene,
    null,
    false,
    null,
    () => {
      if (!alive) return;
      scene.environmentTexture = environment;
      scene.environmentIntensity = options.study ? .24 : .28;
    },
    () => {
      if (alive) options.error("The valley sky could not load; return to title and retry.");
    },
    undefined,
    true,
  );
  const ground = createMapTerrain(map, scene);
  ground.shadowCasters.forEach((m) => shadows.addShadowCaster(m));
  let state: Landscape | undefined,
    paused = false,
    selected: LandscapeBirdId = "fern";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const appearances = new Map<
    LandscapeBirdId,
    {
      root: TransformNode;
      clips: AnimationGroup[];
      pose: string;
      cargo: TransformNode;
    }
  >();
  const selection = MeshBuilder.CreateTorus(
    "selected-chicken",
    { diameter: tactical ? 0.9 : 1.15, thickness: tactical ? 0.035 : 0.055, tessellation: 32 },
    scene,
  );
  const marker = new StandardMaterial("selection-ochre", scene);
  marker.diffuseColor = Color3.FromHexString("#f4d98c");
  marker.emissiveColor = Color3.FromHexString("#70613c");
  selection.material = marker;
  selection.isPickable = false;
  selection.setEnabled(!options.study);
  const routeMaterial = new StandardMaterial("route-gold", scene);
  routeMaterial.diffuseColor = Color3.FromHexString("#ead298");
  routeMaterial.emissiveColor = Color3.FromHexString("#776445");
  let routeMeshes: ReturnType<typeof MeshBuilder.CreateSphere>[] = [];
  let lastRoute = "";
  if (options.study) study = createTreeStudy(scene, map, shadows, () => {
    resize();
    options.studyLoaded?.(study?.loaded() ?? 0);
  }, options.error, habitationPresentation, homeModulePresentation);
  const dressReady = ground.loadDressing(shadows);
  Promise.all([
    dressReady,
    ...landscapeBirds.map(async (id) => {
      const imported = await ImportMeshAsync(
        `/assets/characters/${id}.glb`,
        scene,
      );
      if (!alive) {
        imported.meshes.forEach((m) => m.dispose());
        imported.animationGroups.forEach((g) => g.dispose());
        return;
      }
      const root = new TransformNode(`${id}-landscape`, scene);
      root.scaling.setAll(habitatPresentation.adultScale * (tactical ? 1.25 : 1));
      imported.meshes[0].parent = root;
      imported.meshes.forEach((m) => {
        m.isPickable = false;
        shadows.addShadowCaster(m);
      });
      imported.animationGroups.forEach((g) => g.stop());
      // Cargo is a visible bundle on the real carrier, not another supply counter in the renderer.
      const cargo = new TransformNode(`${id}-cargo`, scene);
      cargo.parent = root;
      cargo.position.set(0, 1.2, -0.35);
      const reedMaterial = new StandardMaterial(`${id}-reeds`, scene);
      reedMaterial.diffuseColor = Color3.FromHexString("#c3aa6f");
      for (let i = 0; i < 5; i++) {
        const reed = MeshBuilder.CreateCylinder(
          `${id}-reed-${i}`,
          { height: 1.1, diameter: 0.1, tessellation: 5 },
          scene,
        );
        reed.parent = cargo;
        reed.rotation.z = Math.PI / 2;
        reed.position.set(0, (i % 2) * 0.12, Math.floor(i / 2) * 0.12);
        reed.material = reedMaterial;
        reed.isPickable = false;
        shadows.addShadowCaster(reed);
      }
      appearances.set(id, {
        root,
        clips: imported.animationGroups,
        pose: "",
        cargo,
      });
    }),
  ])
    .then(async () => {
      if (study) await study.ready;
      if (alive) {
        study?.attachBirds(appearances);
        if (study) await scene.whenReadyAsync();
        if (alive) options.ready();
      }
    })
    .catch(() => {
      if (alive)
        options.error(
          study ? "The study could not finish loading. Retry the study, or return to title."
            : "The chicken models could not be loaded. Return to title and retry; your saved game is retained.",
        );
    });
  const click = (event: PointerEvent) => {
    if (study) return;
    const rect = canvas.getBoundingClientRect();
    const hit = scene.pick(
      ((event.clientX - rect.left) * engine.getRenderWidth()) / rect.width,
      ((event.clientY - rect.top) * engine.getRenderHeight()) / rect.height,
      (m) => m === ground.terrain,
    );
    if (hit?.pickedPoint && hit.faceId >= 0) {
      const index = Math.floor(hit.faceId / 2);
      options.pick({ x: index % map.width, z: Math.floor(index / map.width) });
    }
  };
  canvas.addEventListener("pointerup", click);
  let lastWheel = -Infinity;
  const wheel = (event: WheelEvent) => {
    if (study || !tactical || event.ctrlKey || event.metaKey || !event.deltaY) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 200) return;
    lastWheel = now;
    options.zoomStep?.(event.deltaY < 0 ? 1 : -1);
  };
  canvas.addEventListener("wheel", wheel, { passive: false });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const instrumentation = new SceneInstrumentation(scene);
  let measuredFrames = 0;
  engine.runRenderLoop(() => {
    if (state) {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const bird of state.birds) {
        const appearance = appearances.get(bird.id);
        if (!appearance) continue;
        if (study) appearance.root.setEnabled(studyView !== "detail");
        const fixture = studyBirds[landscapeBirds.indexOf(bird.id)];
        const pos = study ? { ...fixture, y: terrainHeight(map, fixture.x, fixture.z) } : walkerPosition(state, bird);
        appearance.root.position.set(pos.x, pos.y + 0.035, pos.z);
        appearance.cargo.setEnabled(study ? bird.id === "wren" : bird.cargo > 0);
        if (study) appearance.root.rotation.y = [Math.PI - .3, Math.PI + .45, Math.PI - .55, Math.PI / 2][landscapeBirds.indexOf(bird.id)];
        const next = bird.route[0];
        if (next)
          appearance.root.rotation.y = Math.atan2(
            next.x - bird.at.x,
            next.z - bird.at.z,
          );
        const pose =
          (bird.route.length ? (bird.cargo ? "carry" : "walk") : "idle") +
          (reduced.matches || paused ? "-still" : "");
        if (appearance.pose !== pose) {
          appearance.clips.forEach((g) => g.stop());
          const clip = appearance.clips.find(
            (g) =>
              g.name ===
              (bird.route.length ? (bird.cargo ? "carry" : "walk") : "idle"),
          );
          if (clip) {
            clip.start(true);
            if (reduced.matches || paused) {
              clip.goToFrame(clip.from);
              clip.pause();
            }
          }
          appearance.pose = pose;
        }
        const projected = Vector3.Project(
          new Vector3(pos.x, pos.y + 1.05, pos.z),
          Matrix.Identity(),
          scene.getTransformMatrix(),
          camera.viewport.toGlobal(
            engine.getRenderWidth(),
            engine.getRenderHeight(),
          ),
        );
        positions[bird.id] = {
          x: (projected.x / engine.getRenderWidth()) * canvas.clientWidth,
          y: (projected.y / engine.getRenderHeight()) * canvas.clientHeight,
        };
        if (bird.id === selected) {
          selection.position.set(pos.x, pos.y + 0.055, pos.z);
          if (focus && !study) camera.target.set(pos.x, pos.y, pos.z);
        }
      }
      if (!focus && !study) camera.target.set(0, 2, 0);
      if (!tactical) options.labels(positions);
      const bird = state.birds.find((b) => b.id === selected)!;
      const signature = JSON.stringify([selected, bird.at, bird.route]);
      if (signature !== lastRoute) {
        routeMeshes.forEach((m) => m.dispose());
        routeMeshes = [];
        lastRoute = signature;
        for (const at of bird.route) {
          const p = mapPosition(map, at);
          const dot = MeshBuilder.CreateSphere(
            "planned-route",
            { diameter: 0.13, segments: 4 },
            scene,
          );
          dot.position.set(p.x, p.y + 0.1, p.z);
          dot.material = routeMaterial;
          dot.isPickable = false;
          routeMeshes.push(dot);
        }
      }
    }
    ground.animate(reduced.matches || paused ? 0 : performance.now() / 1000);
    scene.render();
    // After render, animated mesh bounds and camera matrices describe this frame.
    // Only the selected label is visible; the cargo is included only while enabled.
    if (tactical && state) {
      const appearance = appearances.get(selected);
      if (appearance) {
        let top = appearance.root.position.y;
        for (const mesh of appearance.root.getChildMeshes()) {
          if (mesh.isEnabled() && mesh.getTotalVertices())
            top = Math.max(top, mesh.getBoundingInfo().boundingBox.maximumWorld.y);
        }
        const projected = Vector3.Project(
          new Vector3(appearance.root.position.x, top + 0.24, appearance.root.position.z),
          Matrix.Identity(), scene.getTransformMatrix(),
          camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
        );
        options.labels({ [selected]: {
          x: projected.x / engine.getRenderWidth() * canvas.clientWidth,
          y: projected.y / engine.getRenderHeight() * canvas.clientHeight,
        } });
      }
    }
    if (++measuredFrames % 60 === 0) {
      canvas.dataset.fps = engine.getFps().toFixed(1);
      canvas.dataset.meshes = String(scene.meshes.length);
      canvas.dataset.vertices = String(scene.getTotalVertices());
      canvas.dataset.drawCalls = String(
        instrumentation.drawCallsCounter.current,
      );
      canvas.dataset.motion = reduced.matches ? "reduced" : "full";
    }
  });
  return {
    update(next: Landscape, id: LandscapeBirdId, isPaused: boolean) {
      state = next;
      selected = id;
      paused = isPaused;
    },
    studyView(form: TreeStudyForm, view: TreeStudyView, branches: boolean, structures = true) {
      studyView = view;
      study?.select(form, branches, structures);
      resize();
    },
    focus(id: LandscapeBirdId | null, level: ValleyZoom = 2) {
      focus = id;
      zoom = level;
      resize();
    },
    stats() {
      return {
        fps: engine.getFps(),
        meshes: scene.meshes.length,
        vertices: scene.getTotalVertices(),
        drawCalls: instrumentation.drawCallsCounter.current,
      };
    },
    dispose() {
      alive = false;
      observer.disconnect();
      canvas.removeEventListener("pointerup", click);
      canvas.removeEventListener("wheel", wheel);
      study?.dispose();
      instrumentation.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}
