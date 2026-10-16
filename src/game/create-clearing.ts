import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import "@babylonjs/core/Culling/ray";
import { Scene } from "@babylonjs/core/scene";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { BirdId, FlockState } from "../simulation/flock";
import { consequences } from "../simulation/flock";

export type BirdLabels = Record<
  BirdId,
  { x: number; y: number; visible: boolean }
>;

/** Procedural landscape and stand-ins. No external reference assets are shipped. */
export function createClearing(
  canvas: HTMLCanvasElement,
  onSelect: (id: BirdId) => void,
  onLabels: (positions: BirdLabels) => void,
  onZoom: (percent: number) => void,
) {
  const engine = new Engine(canvas, true, { stencil: true });
  if (engine.webGLVersion < 2) {
    engine.dispose();
    throw new Error("This landscape needs a browser with WebGL 2.");
  }
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#a9caccff");
  scene.ambientColor = new Color3(0.22, 0.26, 0.2);
  const camera = new ArcRotateCamera(
    "landscape-camera",
    -Math.PI / 2.6,
    Math.PI / 3.4,
    65,
    new Vector3(0, 0.2, 0),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 150;
  const defaultHalfHeight = () => (canvas.clientWidth < 600 ? 12 : 15);
  let framing = defaultHalfHeight();
  let halfHeight = framing;
  const resize = () => {
    engine.resize();
    const nextFraming = defaultHalfHeight();
    if (nextFraming !== framing) {
      halfHeight *= nextFraming / framing;
      framing = nextFraming;
      onZoom(Math.round((framing / halfHeight) * 100));
    }
    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera.orthoTop = halfHeight;
    camera.orthoBottom = -halfHeight;
    camera.orthoLeft = -halfHeight * aspect;
    camera.orthoRight = halfHeight * aspect;
  };
  const zoom = (factor: number) => {
    halfHeight = Math.max(5, Math.min(23, halfHeight * factor));
    resize();
    onZoom(Math.round((defaultHalfHeight() / halfHeight) * 100));
  };
  const reset = () => {
    halfHeight = defaultHalfHeight();
    camera.setTarget(new Vector3(0, 0.2, 0), false, false, true);
    resize();
    onZoom(100);
  };
  const pan = (dx: number, dy: number) => {
    const units = (halfHeight * 2) / canvas.clientHeight;
    const right = new Vector3(
      -Math.sin(camera.alpha),
      0,
      Math.cos(camera.alpha),
    );
    const up = new Vector3(-Math.cos(camera.alpha), 0, -Math.sin(camera.alpha));
    const next = camera.target
      .add(right.scale(-dx * units))
      .add(up.scale((dy * units) / Math.cos(camera.beta)));
    next.x = Math.max(-18, Math.min(15, next.x));
    next.z = Math.max(-16, Math.min(16, next.z));
    camera.setTarget(next, false, false, true);
  };
  const sky = new HemisphericLight("soft-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.7;
  sky.groundColor = Color3.FromHexString("#78815a");
  const sun = new DirectionalLight(
    "evening-sun",
    new Vector3(-0.6, -1, 0.45),
    scene,
  );
  sun.position = new Vector3(15, 25, -15);
  sun.intensity = 0.8;
  sun.diffuse = Color3.FromHexString("#fff0cf");
  const shadows = new ShadowGenerator(2048, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 20;
  shadows.setDarkness(0.2);
  function material(name: string, color: string) {
    const value = new StandardMaterial(name, scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.specularColor = new Color3(0.015, 0.015, 0.015);
    return value;
  }
  const landMaterial = material("meadow", "#96ad69");
  const sand = material("riverbank", "#c8bf8c");
  const pathMaterial = material("worn-earth", "#aea579");
  const bark = material("bark", "#6d5a40");
  const foliage = ["#607c45", "#718a4e", "#52713f"].map((color, i) =>
    material(`forest-${i}`, color),
  );
  const ochre = material("beak-and-feet", "#d49b40");
  const comb = material("comb", "#b94735");
  const eyes = material("eyes", "#252d28");
  const stone = material("stone", "#929581");
  const water = material("water", "#476f7e");
  water.emissiveColor = Color3.FromHexString("#040d10");
  const sea = MeshBuilder.CreateGround(
    "water",
    { width: 180, height: 180 },
    scene,
  );
  sea.position.y = -0.65;
  sea.material = water;
  // A hand-shaped shoreline and deterministic faceting; these are visual data, not simulation RNG.
  const coast = (z: number) =>
    10 + 2.8 * Math.sin(z * 0.16) + 1.1 * Math.sin(z * 0.39);
  const elevation = (x: number, z: number) => {
    const distance = Math.hypot(x, z);
    const hill = Math.max(0, Math.min(1, (distance - 8) / 9));
    const inland = Math.max(0, Math.min(1, (coast(z) - x) / 7));
    return (
      0.18 +
      hill * inland * (0.9 + Math.sin(x * 0.22) * Math.cos(z * 0.15) * 0.8)
    );
  };
  function surface(
    name: string,
    positions: number[],
    indices: number[],
    mat: StandardMaterial,
    colors?: number[],
  ) {
    // Babylon’s left-handed front-face winding is clockwise from above.
    for (let i = 0; i < indices.length; i += 3) {
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    }
    const mesh = new Mesh(name, scene);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    data.normals = normals;
    if (colors) data.colors = colors;
    data.applyToMesh(mesh);
    mesh.convertToFlatShadedMesh();
    mesh.material = mat;
    mesh.receiveShadows = true;
    return mesh;
  }
  const terrainPositions: number[] = [];
  const terrainIndices: number[] = [];
  const terrainColors: number[] = [];
  const columns = 30;
  const rows = 36;
  for (let row = 0; row <= rows; row++) {
    const z = -44 + row * 2.4;
    for (let col = 0; col <= columns; col++) {
      const x = -52 + ((coast(z) + 52) * col) / columns;
      terrainPositions.push(x, elevation(x, z), z);
      const shade = 0.91 + (Math.sin(row * 31 + col * 17) + 1) * 0.045;
      terrainColors.push(shade, shade, shade, 1);
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col;
        terrainIndices.push(
          a,
          a + columns + 1,
          a + 1,
          a + 1,
          a + columns + 1,
          a + columns + 2,
        );
      }
    }
  }
  surface(
    "faceted-terrain",
    terrainPositions,
    terrainIndices,
    landMaterial,
    terrainColors,
  );
  const shorePositions: number[] = [];
  const shoreIndices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const z = -44 + row * 2.4;
    const x = coast(z);
    shorePositions.push(
      x - 0.45,
      elevation(x - 0.45, z) + 0.02,
      z,
      x + 0.7,
      -0.54,
      z,
    );
    if (row < rows) {
      const a = row * 2;
      shoreIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  surface("soft-shoreline", shorePositions, shoreIndices, sand);
  // Irregular glade patches and chicken-worn paths give the terrain a place to inhabit.
  const patch = [
    [-6, -2],
    [-5, 2],
    [-2, 4.6],
    [2, 3.2],
    [5.5, 0],
    [3, -4.7],
    [-1.7, -5.3],
  ];
  const patchPositions = [0, 0.205, 0];
  const patchIndices: number[] = [];
  for (const [x, z] of patch)
    patchPositions.push(x, elevation(x, z) + 0.025, z);
  for (let i = 1; i <= patch.length; i++)
    patchIndices.push(0, i, i === patch.length ? 1 : i + 1);
  surface(
    "gathering-glade",
    patchPositions,
    patchIndices,
    material("glade-grass", "#a9b478"),
  );
  function trail(points: [number, number][], width: number) {
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1];
      const [bx, bz] = points[i];
      const mesh = MeshBuilder.CreateBox(
        "footpath",
        { width, height: 0.015, depth: Math.hypot(bx - ax, bz - az) + 0.15 },
        scene,
      );
      mesh.position.set(
        (ax + bx) / 2,
        elevation((ax + bx) / 2, (az + bz) / 2) + 0.04,
        (az + bz) / 2,
      );
      mesh.rotation.y = Math.atan2(bx - ax, bz - az);
      mesh.material = pathMaterial;
      mesh.receiveShadows = true;
    }
  }
  trail(
    [
      [-14, -7],
      [-9, -5],
      [-5, -3],
      [-2, -0.5],
      [-3.4, 2.2],
    ],
    0.65,
  );
  trail(
    [
      [-2, -0.5],
      [2.8, -0.8],
      [5, 1.2],
      [8.5, 3.5],
    ],
    0.55,
  );
  function ellipsoid(
    name: string,
    parent: TransformNode | null,
    pos: number[],
    scale: number[],
    mat: StandardMaterial,
    segments = 8,
  ) {
    const mesh = MeshBuilder.CreateSphere(
      name,
      { diameter: 1, segments },
      scene,
    );
    mesh.parent = parent;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scaling.set(scale[0], scale[1], scale[2]);
    mesh.material = mat;
    shadows.addShadowCaster(mesh);
    return mesh;
  }
  // Group like-material forest geometry to avoid hundreds of draw calls.
  const treeParts: Mesh[][] = [[], [], [], []];
  function tree(x: number, z: number, height: number, tone: number) {
    const y = elevation(x, z);
    const trunk = MeshBuilder.CreateCylinder(
      "pine-trunk",
      { diameter: 0.28, height: height * 0.65, tessellation: 5 },
      scene,
    );
    trunk.position.set(x, y + height * 0.325, z);
    treeParts[0].push(trunk);
    for (let tier = 0; tier < 2; tier++) {
      const crown = MeshBuilder.CreateCylinder(
        "pine-crown",
        {
          diameterTop: 0,
          diameterBottom: height * (tier === 0 ? 0.65 : 0.49),
          height: height * 0.74,
          tessellation: 6,
        },
        scene,
      );
      crown.position.set(x, y + height * (tier === 0 ? 0.57 : 0.8), z);
      treeParts[tone + 1].push(crown);
    }
  }
  for (let x = -26; x <= 14; x += 2.3) {
    for (let z = -24; z <= 25; z += 2.4) {
      const jitter = Math.sin(x * 42 + z * 17);
      const px = x + jitter * 0.65;
      const pz = z + Math.cos(x * 23 + z * 13) * 0.7;
      const inMass = (px < -8 && pz > -10) || pz > 10 || (px < -15 && pz < -12);
      if (!inMass || px > coast(pz) - 2.5 || Math.sin(x * 12 + z * 7) < -0.75)
        continue;
      tree(px, pz, 2.7 + (jitter + 1) * 0.7, Math.abs(Math.round(x + z)) % 3);
    }
  }
  for (let i = 0; i < treeParts.length; i++) {
    const merged = Mesh.MergeMeshes(treeParts[i], true, true);
    if (merged) {
      merged.material = i === 0 ? bark : foliage[i - 1];
      shadows.addShadowCaster(merged);
    }
  }
  // The old roots are the only shelter in this small authored scene.
  const trunk = ellipsoid(
    "old-tree",
    null,
    [-3.9, 1.8, 3.1],
    [1.2, 3.4, 1.2],
    bark,
  );
  trunk.rotation.z = -0.12;
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.52;
    const root = ellipsoid(
      "old-root",
      null,
      [-3.8 + Math.cos(angle) * 0.6, 0.45, 3 + Math.sin(angle) * 0.6],
      [0.5, 0.6, 2.5],
      bark,
    );
    root.rotation.y = -angle + Math.PI / 2;
  }
  for (const [x, y, z, size] of [
    [-4, 4.1, 3.3, 3.4],
    [-5.2, 3.8, 3.8, 2.5],
    [-2.9, 3.9, 4.2, 2.8],
  ]) {
    ellipsoid(
      "old-tree-crown",
      null,
      [x, y, z],
      [size, size * 0.7, size],
      foliage[1],
      4,
    ).convertToFlatShadedMesh();
  }
  const hollow = ellipsoid(
    "dry-hollow",
    null,
    [-3.2, 0.23, 2.2],
    [2.2, 0.08, 1.65],
    material("dry-leaves", "#c6b784"),
  );
  hollow.receiveShadows = true;
  for (let i = 0; i < 48; i++) {
    const x = Math.sin(i * 12.3) * 21;
    const z = Math.cos(i * 8.4) * 21;
    if (x > coast(z) - 0.9 || Math.hypot(x, z) < 6.8) continue;
    const rock = ellipsoid(
      "fieldstone",
      null,
      [x, elevation(x, z) + 0.18, z],
      [0.5 + (i % 3) * 0.3, 0.45 + (i % 2) * 0.3, 0.6],
      stone,
      4,
    );
    rock.rotation.y = i;
    rock.convertToFlatShadedMesh();
  }
  const ripples = material("water-ripples", "#a0c9c8");
  for (let i = 0; i < 22; i++) {
    const z = -24 + i * 2.3;
    const x = coast(z) + 2 + (i % 4) * 1.7;
    const ripple = MeshBuilder.CreateBox(
      "water-glint",
      { width: 0.9 + (i % 3) * 0.5, depth: 0.06, height: 0.006 },
      scene,
    );
    ripple.position.set(x, -0.64, z);
    ripple.material = ripples;
  }
  const chickens = new Map<
    BirdId,
    {
      root: TransformNode;
      body: TransformNode;
      head: TransformNode;
      wing: TransformNode;
      target: Vector3;
    }
  >();
  const positions: Record<BirdId, [number, number, number]> = {
    rowan: [2.7, 0.18, -0.7],
    mallow: [-1.1, 0.18, 0.8],
    bramble: [-2.3, 0.18, -3.2],
    pip: [-0.9, 0.18, -3.6],
  };
  function chicken(id: BirdId, color: string, scale: number, yaw: number) {
    const root = new TransformNode(id, scene);
    root.position = Vector3.FromArray(positions[id]);
    root.scaling.setAll(scale);
    root.rotation.y = yaw;
    const body = new TransformNode(`${id}-body`, scene);
    body.parent = root;
    const plumage = material(`${id}-plumage`, color);
    ellipsoid(`${id}-breast`, body, [0, 0.87, 0], [1, 1.13, 1.3], plumage);
    const wing = ellipsoid(
      `${id}-wing`,
      body,
      [0.46, 0.86, 0],
      [0.21, 0.63, 0.9],
      plumage,
    );
    ellipsoid(
      `${id}-far-wing`,
      body,
      [-0.46, 0.86, 0],
      [0.21, 0.63, 0.9],
      plumage,
    );
    const head = new TransformNode(`${id}-head`, scene);
    head.parent = body;
    head.position.set(0, 1.4, -0.44);
    ellipsoid(`${id}-neck`, head, [0, -0.12, 0.05], [0.55, 0.8, 0.6], plumage);
    ellipsoid(
      `${id}-face`,
      head,
      [0, 0.18, -0.12],
      [0.65, 0.66, 0.64],
      plumage,
    );
    for (const side of [-1, 1]) {
      ellipsoid(
        `${id}-eye`,
        head,
        [side * 0.3, 0.23, -0.28],
        [0.075, 0.095, 0.08],
        eyes,
      );
      ellipsoid(
        `${id}-foot`,
        root,
        [side * 0.24, 0.11, -0.1],
        [0.11, 0.22, 0.4],
        ochre,
      );
    }
    const beak = MeshBuilder.CreateCylinder(
      `${id}-beak`,
      { diameterTop: 0, diameterBottom: 0.26, height: 0.36, tessellation: 4 },
      scene,
    );
    beak.parent = head;
    beak.position.set(0, 0.1, -0.5);
    beak.rotation.x = -Math.PI / 2;
    beak.material = ochre;
    if (id !== "pip") {
      for (let i = 0; i < 3; i++)
        ellipsoid(
          `${id}-comb`,
          head,
          [0, 0.52 + (i === 1 ? 0.07 : 0), -0.3 + i * 0.18],
          [0.13, id === "rowan" ? 0.39 : 0.22, 0.24],
          comb,
        );
      ellipsoid(
        `${id}-wattle`,
        head,
        [0, -0.17, -0.4],
        [0.19, 0.25, 0.15],
        comb,
      );
    }
    for (let i = 0; i < 3; i++) {
      const tail = ellipsoid(
        `${id}-tail`,
        body,
        [(i - 1) * 0.15, id === "rowan" ? 1.3 : 1.08, 0.65],
        [0.22, id === "rowan" ? 1.2 : 0.65, 0.48],
        plumage,
      );
      tail.rotation.x = 0.5 + i * 0.16;
    }
    for (const mesh of root.getChildMeshes()) mesh.metadata = { birdId: id };
    chickens.set(id, { root, body, head, wing, target: root.position.clone() });
  }
  chicken("rowan", "#3e5149", 1.06, -0.45);
  chicken("mallow", "#eee0b8", 0.87, -0.15);
  chicken("bramble", "#b16e40", 0.87, 0.4);
  chicken("pip", "#ecc45e", 0.43, -0.25);
  const selection = MeshBuilder.CreateTorus(
    "selected-character",
    { diameter: 1.65, thickness: 0.045, tessellation: 32 },
    scene,
  );
  selection.material = material("selection-ochre", "#e9cd87");
  selection.parent = chickens.get("rowan")!.root;
  selection.position.y = 0.035;
  let dragging: { id: number; x: number; y: number; moved: number } | null =
    null;
  const pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    dragging = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: 0,
    };
  };
  const pointerMove = (event: PointerEvent) => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    dragging.moved += Math.abs(dx) + Math.abs(dy);
    if (dragging.moved > 4) pan(dx, dy);
    dragging.x = event.clientX;
    dragging.y = event.clientY;
  };
  const pointerUp = (event: PointerEvent) => {
    if (!dragging || dragging.id !== event.pointerId) return;
    if (dragging.moved <= 4 && event.type === "pointerup") {
      const bounds = canvas.getBoundingClientRect();
      const pick = scene.pick(
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      );
      const id = pick?.pickedMesh?.metadata?.birdId as BirdId | undefined;
      if (id) onSelect(id);
    }
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12);
  };
  const keyboard = (event: KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => pan(45, 0),
      ArrowRight: () => pan(-45, 0),
      ArrowUp: () => pan(0, 45),
      ArrowDown: () => pan(0, -45),
      "+": () => zoom(1 / 1.2),
      "=": () => zoom(1 / 1.2),
      "-": () => zoom(1.2),
      "0": reset,
    };
    if (actions[event.key]) {
      event.preventDefault();
      actions[event.key]();
    }
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("wheel", wheel, { passive: false });
  canvas.addEventListener("keydown", keyboard);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(engine.getDeltaTime() / 1000, 0.1);
    elapsed += delta;
    let i = 0;
    const labelPositions = {} as BirdLabels;
    const viewport = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    for (const [id, bird] of chickens) {
      bird.root.position = Vector3.Lerp(
        bird.root.position,
        bird.target,
        reducedMotion.matches ? 1 : Math.min(1, delta * 3),
      );
      const wave = reducedMotion.matches
        ? 0
        : Math.sin(elapsed * 1.8 + i++ * 1.7);
      bird.body.position.y = wave * 0.025;
      bird.head.rotation.x = wave * 0.045;
      bird.wing.rotation.z = wave * 0.035;
      const label = Vector3.Project(
        bird.root.position.add(new Vector3(0, id === "pip" ? 1.25 : 2.4, 0)),
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        viewport,
      );
      const x = (label.x * canvas.clientWidth) / engine.getRenderWidth();
      const y = (label.y * canvas.clientHeight) / engine.getRenderHeight();
      labelPositions[id] = {
        x,
        y,
        visible:
          x > 30 &&
          x < canvas.clientWidth - 30 &&
          y > 65 &&
          y < canvas.clientHeight - 65,
      };
    }
    onLabels(labelPositions);
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  reset();
  engine.runRenderLoop(() => scene.render());
  return {
    zoomIn: () => zoom(1 / 1.2),
    zoomOut: () => zoom(1.2),
    reset,
    select(id: BirdId) {
      selection.parent = chickens.get(id)!.root;
      selection.position.y = 0.035;
    },
    focus(id: BirdId) {
      const bird = chickens.get(id)!;
      camera.setTarget(bird.target.add(new Vector3(0, 0.5, 0)), false, false, true);
      halfHeight = 6;
      resize();
      onZoom(Math.round((defaultHalfHeight() / halfHeight) * 100));
    },
    update(state: FlockState) {
      const sheltered = consequences(state).sheltered;
      const targets: Partial<Record<BirdId, [number, number, number]>> =
        state.choice === "shelter"
          ? {
              bramble: [-3.35, 0.18, 1.9],
              pip: [-2.65, 0.18, 1.7],
              mallow: [-0.6, 0.18, -2.3],
            }
          : state.choice === "rank"
            ? {
                mallow: [-3.2, 0.18, 1.8],
                bramble: [-2.3, 0.18, -3.2],
                pip: [-0.9, 0.18, -3.6],
              }
            : {};
      for (const [id, bird] of chickens) {
        bird.target = Vector3.FromArray(targets[id] ?? positions[id]);
        if (sheltered.includes(id)) bird.root.rotation.y = -0.2;
      }
    },
    dispose() {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keyboard);
      scene.dispose();
      engine.dispose();
    },
  };
}
