import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
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
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Settlement, Cell } from "../simulation/settlement";
import { cost, key, validCell } from "../simulation/settlement";
import { settlers, trees } from "../content/settlement";
import { treeScale, presentedBirdPosition } from "./tree-presentation";
import type { SettlerId as BirdId } from "../content/settlement";

export type BirdLabels = Record<
  string,
  { x: number; y: number; visible: boolean }
>;

/** Original GLB characters/trees over a procedural landscape; simulation owns every outcome. */
export function createClearing(
  canvas: HTMLCanvasElement,
  onSelect: (id: BirdId) => void,
  onLabels: (positions: BirdLabels) => void,
  onPick: (at: Cell) => void,
  onAssets: (status: "loading" | "ready" | "failed") => void,
) {
  const engine = new Engine(canvas, true, { stencil: true });
  if (engine.webGLVersion < 2) {
    engine.dispose();
    throw new Error("This landscape needs a browser with WebGL 2.");
  }
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#bac6b3ff");
  scene.ambientColor = new Color3(.06,.07,.04);
  scene.imageProcessingConfiguration.exposure = 1.15;
  scene.imageProcessingConfiguration.contrast = 1.03;
  const camera = new ArcRotateCamera(
    "landscape-camera",
    -Math.PI / 2.6,
    Math.PI / 3.2,
    65,
    new Vector3(0, 0.2, 0),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 150;
  const resize = () => {
    engine.resize();
    const aspect = canvas.clientWidth/Math.max(1,canvas.clientHeight);
    const halfHeight = Math.max(8.8,10.8/aspect);
    camera.orthoTop=halfHeight;camera.orthoBottom=-halfHeight;
    camera.orthoLeft=-halfHeight*aspect;camera.orthoRight=halfHeight*aspect;
  };
  camera.setTarget(new Vector3(-.6,2.7,.5),false,false,true);
  const sky = new HemisphericLight("soft-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.65;
  sky.groundColor = Color3.FromHexString("#485744");
  sky.diffuse=Color3.FromHexString("#c9dfec");
  const sun = new DirectionalLight(
    "evening-sun",
    new Vector3(-0.6, -1, 0.45),
    scene,
  );
  sun.position = new Vector3(15, 25, -15);
  sun.intensity = 0.8;
  sun.diffuse = Color3.FromHexString("#ffe9c5");
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering=true;
  shadows.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias=.0005;shadows.normalBias=.004;
  sun.autoCalcShadowZBounds=true;
  shadows.setDarkness(.3);
  // Small-scale occlusion gives layered foliage and woven seams local depth.
  const occlusion = new SSAO2RenderingPipeline("grove-contact",scene,{ssaoRatio:.5,blurRatio:.5},[camera]);
  occlusion.radius=.65;occlusion.totalStrength=.65;occlusion.samples=8;occlusion.expensiveBlur=false;
  function material(name: string, color: string) {
    const value = new StandardMaterial(name, scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.specularColor = new Color3(0.015, 0.015, 0.015);
    return value;
  }
  const landMaterial = material("meadow", "#ffffff");

  // World-located earth/grass regions, rather than a repeating camouflage tile.
  // Quiet color variation is subordinate to sculpted trees and moving workers.
  landMaterial.diffuseColor=Color3.FromHexString("#ffffff");
  function soilNoise(x:number,z:number) {
    const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
    const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
    const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
    return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;
  }
  function groundColor(x:number,z:number) {
    // Earth is the open commons, not an isolated pale oval. Three broad,
    // irregular grass islands meet a continuous shaded forest floor.
    const edge=.09*Math.sin(x*.7+z*.35)+.06*Math.sin(z*1.2-x*.4);
    const islands=Math.min(Math.hypot((x-6)/2.8,(z-1)/3.2),Math.hypot((x+7)/2.5,(z+6)/2.4),Math.hypot((x-1)/3,(z+10)/2));
    const patch=Math.max(0,Math.min(1,(1-islands+edge)*4));
    const forest=Math.max(0,Math.min(1,Math.max((z-4.5)/5,(-x-7)/4)));
    const earth=Color3.FromHexString("#c2a878"),sage=Color3.FromHexString("#92996b"),litter=Color3.FromHexString("#697c59");
    const color=Color3.Lerp(Color3.Lerp(earth,sage,patch*.8),litter,forest*.92);
    const plane=1+.035*Math.sin(x*1.6+z*.8)+.018*Math.sin(z*2.3-x*.4);
    return color.scale(plane);
  }
  const groundAlbedo=new DynamicTexture("world-located-painted-ground",{width:1024,height:1024},scene,true);
  const context=groundAlbedo.getContext(),pixels=new ImageData(1024,1024);
  for(let row=0;row<1024;row++)for(let col=0;col<1024;col++){
    const x=(col/1024-.5)*64,z=(row/1024-.5)*64;
    const c=groundColor(x,z),i=(row*1024+col)*4;
    // Broad brush-sized planes, not high-frequency speckles or a blurred photo.
    const brush=1+.055*(soilNoise(x*1.3,z*1.3)-.5)+.025*(soilNoise(x*4.1+17,z*4.1-6)-.5);
    pixels.data[i]=Math.min(255,c.r*255*brush);pixels.data[i+1]=Math.min(255,c.g*255*brush);pixels.data[i+2]=Math.min(255,c.b*255*brush);pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);groundAlbedo.update(false);
  groundAlbedo.uScale=14/64;groundAlbedo.vScale=14/64;groundAlbedo.uOffset=.5;groundAlbedo.vOffset=.5;
  landMaterial.diffuseTexture=groundAlbedo;

  const pathMaterial = material("worn-earth", "#827658");
  const water = material("water", "#ffffff");
  water.specularColor=Color3.FromHexString("#8ea8a5");water.specularPower=110;
  // The creek is a narrow landscape feature; only the left bank is playable ground.
  const coast = (z: number) => 10.5 + 1.4*Math.sin(z*.25)+.6*Math.sin(z*.61+.4);
  const creekWidth=(z:number)=>1.7+.38*Math.sin(z*.43+.8)+.2*Math.sin(z*1.1);
  const elevation = (x: number, z: number) => {
    // All legal work cells and their perched offsets share one ground datum.
    // Relief belongs to the scenic woodland beyond the playable rectangle.
    const outside = Math.hypot(Math.max(0, Math.abs(x) - 9.2), Math.max(0, Math.abs(z) - 7.2));
    const hill = Math.min(1, outside / 9);
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
    data.uvs=positions.flatMap((_,i)=>i%3===0?[positions[i]/14,positions[i+2]/14]:[]);
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
  const rows = 60;
  for (let row = 0; row <= rows; row++) {
    const z = -72 + row * 2.4;
    for (let col = 0; col <= columns; col++) {
      const x = -52 + ((coast(z)-.75 + 52) * col) / columns;
      terrainPositions.push(x, elevation(x, z), z);
      terrainColors.push(1,1,1,1);
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
  const terrain = surface(
    "faceted-terrain",
    terrainPositions,
    terrainIndices,
    landMaterial,
    terrainColors,
  );
  // Cross-sections form shallow shelves, irregular banks and a darker deep channel.
  const creekPositions:number[]=[],creekIndices:number[]=[],creekColors:number[]=[],bankPositions:number[]=[],bankIndices:number[]=[],bankColors:number[]=[];
  const riverSteps=160;
  for(let i=0;i<=riverSteps;i++){
    const z=-80+i*1.05,x=coast(z),width=creekWidth(z);
    for(const [t,y] of [[0,-.055],[.18,-.06],[.55,-.075],[.85,-.06],[1,-.055]]){
      creekPositions.push(x+width*t,y,z);
      const deep=Math.sin(t*Math.PI);const c=Color3.Lerp(Color3.FromHexString("#789b91"),Color3.FromHexString("#3c7778"),deep);
      creekColors.push(c.r,c.g,c.b,1);
    }
    for(const [xx,y] of [[x-.85-.08*Math.sin(z*1.7),elevation(x-.85,z)],[x+.04,-.065],[x+width-.04,-.065],[x+width+.8+.15*Math.sin(z*1.3),.23],[x+width+1.5,.28],[55,.8]]){
      bankPositions.push(xx,y,z);bankColors.push(.95,.97,.95,1);
    }
    if(i<riverSteps){
      for(let j=0;j<4;j++){const q=i*5+j;creekIndices.push(q,q+5,q+1,q+1,q+5,q+6);}
      for(const j of [0,2,3,4]){const q=i*6+j;bankIndices.push(q,q+6,q+1,q+1,q+6,q+7);}
    }
  }
  const creek=surface("shallow-winding-creek",creekPositions,creekIndices,water,creekColors);creek.isPickable=false;
  const banks=surface("irregular-creek-banks",bankPositions,bankIndices,landMaterial,bankColors);banks.isPickable=false;
  const ripples=material("water-ripples","#c3d8cd");ripples.alpha=.22;
  const currents:Mesh[]=[];
  for(let i=0;i<30;i++){
    const z=-20+i*1.45,x=coast(z)+creekWidth(z)*(.2+(i%4)*.18);
    const a:Vector3[]=[],b:Vector3[]=[];
    for(let j=0;j<7;j++){const xx=x+Math.sin(j*.6)*.04,zz=z+j*.1;a.push(new Vector3(xx,-.046,zz));b.push(new Vector3(xx+.016,-.046,zz));}
    const stroke=MeshBuilder.CreateRibbon("restrained-creek-current",{pathArray:[a,b],sideOrientation:Mesh.DOUBLESIDE},scene);stroke.material=ripples;stroke.isPickable=false;currents.push(stroke);
  }
  const chickens = new Map<
    BirdId,
    {
      root: TransformNode;
      body: TransformNode;
      head: TransformNode;
      wing: TransformNode;
      target: Vector3;
      clips: AnimationGroup[];
      pose: string;
    }
  >();

  // Controllers survive asset replacement so cargo, selection and saved poses stay attached.
  for (const person of settlers) {
    const root = new TransformNode(person.id, scene);
    root.position.set(-6, .18, -4);
    root.scaling.setAll(.73);
    const body = new TransformNode(`${person.id}-body`, scene);
    body.parent = root;
    const head = new TransformNode(`${person.id}-head`, scene);
    head.parent = body;
    const wing = new TransformNode(`${person.id}-wing`, scene);
    wing.parent = body;
    chickens.set(person.id, { root, body, head, wing, target: root.position.clone(),clips:[],pose:"" });
  }
  let disposed = false;
  let loading = false;
  const assetRoots: TransformNode[] = [];
  const templates = new Map<string,Mesh>();
  async function loadAssets() {
    if (loading || disposed) return;
    loading = true;
    onAssets("loading");
    const staged: TransformNode[] = [];
    let environment: CubeTexture | undefined;
    try {
      // The checked prefiltered sky is local, original, and part of the retryable asset set.
      environment = await new Promise<CubeTexture>((resolve, reject) => {
        const texture = new CubeTexture("/assets/materials/warm-neutral-sky.env", scene,
          null, false, null, () => resolve(texture), (message) => reject(new Error(message)), undefined, true);
      });
      if (disposed) { environment.dispose(); return; }
      // Stage the complete set before publishing: retry cannot duplicate a partial forest.
      const tasks = [
        ...trees.map(t => ({ path: `environment/${t.id}.glb`, tree: t, bird: null,template:null })),
        ...settlers.map(b => ({ path: `characters/${b.id}.glb`, tree: null, bird: b,template:null })),
        ...["reed-bundle","woven-home","woven-store","understory","reed-clump","dressing-birch","dressing-willow","dressing-bush-a","dressing-bush-b","dressing-bush-c","dressing-grass","dressing-cattails","dressing-rock-a","dressing-rock-b"].map(id=>({path:`environment/${id}.glb`,tree:null,bird:null,template:id})),
      ];
      for (const task of tasks) {
        const imported = await ImportMeshAsync(`/assets/${task.path}`, scene);
        const root = imported.meshes[0];
        if (disposed) { root.dispose(false, true); return; }
        root.setEnabled(false);
        staged.push(root);
        if(task.template)templates.set(task.template,root as Mesh);
        if(task.tree){
          const locations=task.tree.id === "lowfork" ? [[-11,5,.6],[-12,10,.64],[-8,12,.55],[-5,15,.48]] : task.tree.id === "splitcrown" ? [[-11,8,.4]] : [[-14,3,.36]];
          for(const [x,z,scale] of locations){const copy=root.clone(`${task.tree.id}-woodland`,null)!;copy.position.set(x,elevation(x,z),z);copy.scaling.scaleInPlace(scale);copy.rotation.y=(x+z)*.13;copy.setEnabled(false);staged.push(copy);}
        }
        if (task.tree) { root.position.set(task.tree.x*2, elevation(task.tree.x*2, task.tree.z*2), task.tree.z*2); root.scaling.scaleInPlace(treeScale[task.tree.id]); }
        if (task.bird) {
          const controller = chickens.get(task.bird.id)!;
          root.parent = controller.root;
          const nodes = [...imported.transformNodes, ...imported.meshes];
          controller.body = nodes.find(n => n.name === "body")!;
          controller.head = nodes.find(n => n.name === "head")!;
          controller.wing = nodes.find(n => n.name === "wing")!;
          imported.animationGroups.forEach(g=>g.stop());
          controller.clips=imported.animationGroups;controller.pose="";
          for (const mesh of root.getChildMeshes()) mesh.metadata = { birdId: task.bird.id };
        }
        for (const mesh of root.getChildMeshes()) { shadows.addShadowCaster(mesh); mesh.receiveShadows = true; }
      }
      if (!disposed) {
        scene.environmentTexture?.dispose();
        scene.environmentTexture = environment;
        scene.environmentIntensity = .45;
        staged.forEach(root => {
          for (const mesh of root.getChildMeshes()) { shadows.addShadowCaster(mesh); mesh.receiveShadows = true; }
          root.setEnabled(true);
        });
        templates.forEach(root=>root.setEnabled(false));
        function dress(id:string,x:number,z:number,scale:number,turn:number,yOffset=0){
          const template=templates.get(`dressing-${id}`)!;
          const copy=template.clone(`clearing-${id}`,null)!;copy.position.set(x,elevation(x,z)+yOffset,z);copy.scaling.scaleInPlace(scale);copy.rotation.y=turn;copy.setEnabled(true);staged.push(copy);
          copy.getChildMeshes().forEach(m=>{m.isPickable=false;shadows.addShadowCaster(m);m.receiveShadows=true;});return copy;
        }
        // A dense layered left/back woodland, not a ring of equal oaks.
        for(const [x,z,scale] of [[-11,-5,.85],[-13,-1,1],[-10,3,.9],[-10,7,1.05],[-6,10,.8],[-2,11,.82],[3,12,.72],[-15,5,.95]])dress("birch",x,z,scale,x*.4);
        dress("willow",coast(8)+creekWidth(8)+1.8,8,.9,1.4);
        dress("willow",coast(-8)+creekWidth(-8)+2,-8,.8,-.4);
        const edges=[[-11,-7],[-12,-3],[-11,1],[-11,5],[-9,8],[-6,9],[-2,10],[3,10],[7,8],[-7,-9],[-2,-10],[4,-9]];
        for(let i=0;i<edges.length;i++){
          const [x,z]=edges[i];
          for(let j=0;j<3;j++)dress(`bush-${["a","b","c"][(i+j)%3]}`,x+Math.sin(j*2.4)*1.2,z+Math.cos(j*2.1)*.85,.8+(i%3)*.16,i+j);
          dress(i%2?"rock-a":"rock-b",x+1,z-.8,.65+(i%3)*.12,i);
          for(let j=0;j<3;j++)dress("grass",x+Math.sin(j*2)*1.8,z+Math.cos(j*2)*1.4,.9+(j%2)*.3,j+i);
        }
        // Root skirts remain low and clear of the trunk's work/ladder approach.
        dress("bush-b",-6.1,4.8,.5,1);dress("bush-a",-3.4,6,.45,2);dress("rock-b",-5.8,5.8,.5,.8);
        // Asymmetric submerged rock groups and cattails break the creek's outline.
        for(const [x,z,scale] of [[-6.5,2.5,.36],[-5.4,5.3,.42],[-2.9,6.9,.35],[-8.7,-5.7,.5],[-3.6,-8.4,.45],[5.5,-6.9,.4],[7.6,-.8,.38],[7.9,4.1,.4]]) {
          dress("grass",x,z,scale,x*.8-z*.3);
          dress("rock-b",x+.35,z+.18,scale*.32,z*.7,-.025);
        }
        for(let group=0;group<14;group++){
          const z=-20+group*3.1+Math.sin(group*2.7)*.7;
          const right=group%3===0,base=coast(z)+(right?creekWidth(z):0);
          for(let j=0;j<2+group%3;j++){
            const zz=z+Math.sin(j*2.3)*.6,x=base+(right?.15:-.15)+Math.cos(j*2.1)*.48;
            dress((group+j)%2?"rock-a":"rock-b",x,zz,.5+(j%3)*.22,group+j,-.27);
          }
          if(group%3!==1) dress("cattails",base+(right?.5:-.65),z+.8,.65+(group%3)*.12,group,-.06);
          if(group%2===0)dress("bush-c",coast(z)-1.35,z+1.5,.6,group);
        }
        const bundle=templates.get("reed-bundle")!;
        for(const [id,bird] of chickens){
          cargoMeshes.get(id)?.dispose();
          const carried=bundle.clone(`${id}-carried-reeds`,bird.root)!;
          carried.position.set(0,.72,.6);carried.scaling.scaleInPlace(.85);
          carried.setEnabled((renderState?.birds.find(b=>b.id===id)?.cargo??0)>0);
          carried.getChildMeshes().forEach(m=>{m.isPickable=false;shadows.addShadowCaster(m);});
          cargoMeshes.set(id,carried);
        }
        layoutSignature="";
        if(renderState)rebuild(renderState);
        assetRoots.push(...staged);
        onAssets("ready");
      }
    } catch (error) {
      staged.forEach(root => root.dispose(false, true));
      environment?.dispose();
      if (!disposed) { console.error("Coop Chaos model load failed", error); onAssets("failed"); }
    } finally { loading = false; }
  }
  void loadAssets();
  const selection = MeshBuilder.CreateTorus(
    "selected-character",
    { diameter: 1.65, thickness: 0.045, tessellation: 32 },
    scene,
  );
  selection.material = material("selection-ochre", "#e9cd87");
  selection.parent = chickens.get("fern")!.root;
  selection.position.y = 0.035;
  let selectedBird: BirdId = "fern";
  let renderState: Settlement | null = null;
  let layoutSignature = "";
  const cargoMat = material("reed-bundles", "#d9bb69");
  const shelterMat = material("woven-grass", "#ad9657");
  const gridMat = material("grid", "#bcc08b");
  gridMat.alpha = 0.24;
  const gridRoot = new TransformNode("placement-grid", scene);
  for (let x = -4; x <= 4; x++)
    for (let z = -3; z <= 3; z++) {
      const marker = MeshBuilder.CreateGround(
        "cell",
        { width: 1.85, height: 1.85 },
        scene,
      );
      marker.position.set(x * 2, elevation(x * 2, z * 2) + 0.045, z * 2);
      marker.material = gridMat;
      marker.parent = gridRoot;
      marker.isPickable = false;
    }
  gridRoot.setEnabled(false);
  const cursor = MeshBuilder.CreateTorus(
    "placement-cursor",
    { diameter: 1.6, thickness: 0.08, tessellation: 24 },
    scene,
  );
  cursor.material = material("cursor", "#fff0b3");
  cursor.setEnabled(false);
  cursor.isPickable = false;
  const cargoMeshes = new Map<BirdId, Mesh>();
  for (const [id, bird] of chickens) {
    const bundle = MeshBuilder.CreateCylinder(
      "carried-reed-bundle",
      { height: 1.1, diameter: 0.34, tessellation: 6 },
      scene,
    );
    bundle.parent = bird.root;
    bundle.position.set(0, 0.5, -0.9);
    bundle.rotation.z = Math.PI / 2;
    bundle.material = cargoMat;
    bundle.setEnabled(false);
    bundle.isPickable = false;
    cargoMeshes.set(id, bundle);
  }
  let builtMeshes: Mesh[] = [];
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    mat = shelterMat,
  ) {
    const m = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    m.position.set(x, y, z);
    m.material = mat;
    m.isPickable = false;
    m.receiveShadows = true;
    shadows.addShadowCaster(m);
    builtMeshes.push(m);
    return m;
  }
  function rebuild(state: Settlement) {
    for (const mesh of builtMeshes) {
      shadows.removeShadowCaster(mesh);
      mesh.dispose();
    }
    builtMeshes = [];
    for (const path of state.paths) {
      const [x, z] = path.split(",").map(Number);
      box(
        "player-path",
        x * 2,
        elevation(x * 2, z * 2) + 0.05,
        z * 2,
        0.6,
        0.025,
        0.6,
        pathMaterial,
      );
      for (const [dx, dz] of [
        [1, 0],
        [0, 1],
      ])
        if (state.paths.includes(key({ x: x + dx, z: z + dz }))) {
          const xx = x * 2 + dx,
            zz = z * 2 + dz;
          box(
            "connected-path",
            xx,
            elevation(xx, zz) + 0.05,
            zz,
            dx ? 2 : 0.6,
            0.025,
            dz ? 2 : 0.6,
            pathMaterial,
          );
        }
    }
    function model(id:string,x:number,y:number,z:number,scale=1){
      const template=templates.get(id);if(!template)return null;
      const copy=template.clone(`${id}-placed`,null)!;copy.position.set(x,y,z);copy.scaling.scaleInPlace(scale);copy.setEnabled(true);
      for(const m of copy.getChildMeshes()){m.isPickable=false;shadows.addShadowCaster(m);m.receiveShadows=true;}
      builtMeshes.push(copy);return copy;
    }
    function bundles(x:number,z:number,count:number){
      for(let i=0;i<Math.min(12,count);i++)model("reed-bundle",x+((i%3)-1)*.3,elevation(x,z)+.08+Math.floor(i/6)*.13,z+((Math.floor(i/3)%2)-.5)*.38,.5);
    }
    for(const patch of state.patches){
      const x=patch.at.x*2,z=patch.at.z*2;
      for(let i=0;i<patch.remaining;i++){
        const a=i*2.39996,r=Math.sqrt((i+.5)/patch.capacity)*.64,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;
        const clump=model("reed-clump",xx,elevation(xx,zz),zz,.7);if(clump)clump.rotation.y=a;
      }
    }
    for (const pile of state.piles)
      bundles(pile.at.x * 2, pile.at.z * 2 + (pile.kind === "source" ? .8 : 0), pile.stock);
    for (const site of state.sites) {
      const x = site.at.x * 2,
        z = site.at.z * 2,
        y = elevation(x, z);
      if (site.kind === "store") {
        const basket=model("woven-store",x,y,z);
        if(basket&&!site.complete)basket.scaling.y*=.3;
        bundles(x, z, site.complete ? site.stock : site.delivered);
      } else {
        const stage = site.complete
          ? 3
          : site.progress >= 10
            ? 2
            : site.delivered >= cost(site)
              ? 1
              : 0;
        if(stage>0){
          const home=model("woven-home",x,y,z,site.tree?treeScale[site.tree]:1);
          if(home)for(const m of home.getChildMeshes()){
            const name=m.name.toLowerCase();
            if(name.includes("rainhood")&&stage<2||name.includes("ladder")&&stage<3)m.setEnabled(false);
          }
        }
        if (!site.complete) bundles(x + 1.15, z - 0.6, site.delivered);
      }
    }
  }
  let pointer: {id:number;x:number;y:number;moved:boolean}|null=null;
  const pointerDown=(event:PointerEvent)=>{
    if(event.button!==0||pointer){pointer=null;return;}
    canvas.focus({preventScroll:true});
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
  };
  const pointerMove=(event:PointerEvent)=>{
    if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>5)pointer.moved=true;
  };
  const pointerUp=(event:PointerEvent)=>{
    const p=pointer;pointer=null;
    if(!p||p.id!==event.pointerId||p.moved||event.type!=="pointerup")return;
    const bounds=canvas.getBoundingClientRect(),x=event.clientX-bounds.left,y=event.clientY-bounds.top;
    const pick=scene.pick(x,y),id=pick?.pickedMesh?.metadata?.birdId as BirdId|undefined;
    if(id){onSelect(id);return;}
    const ground=scene.pick(x,y,mesh=>mesh===terrain);
    if(ground?.pickedPoint){const at={x:Math.round(ground.pickedPoint.x/2),z:Math.round(ground.pickedPoint.z/2)};if(validCell(at))onPick(at);}
  };
  canvas.addEventListener("pointerdown",pointerDown);
  canvas.addEventListener("pointermove",pointerMove);
  canvas.addEventListener("pointerup",pointerUp);
  canvas.addEventListener("pointercancel",pointerUp);
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(engine.getDeltaTime() / 1000, 0.1);
    currents.forEach((stroke,i)=>{stroke.position.z=reducedMotion.matches?0:Math.sin(performance.now()*.0005+i)*.12;});
    const labelPositions = {} as BirdLabels;
    const viewport = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    for (const [id, bird] of chickens) {
      bird.root.position = Vector3.Lerp(
        bird.root.position,
        bird.target,
        reducedMotion.matches ? 1 : Math.min(1, delta * 12),
      );
      const worker = renderState?.birds.find((b) => b.id === id);
      const action=worker?.perch?"roost":worker?.flight?(worker.flight.sheltered?"walk":"flight"):worker?.edge?(worker.cargo?"carry":"walk"):worker?.job?.kind==="build"?"weave":worker?.job?.kind==="gather"&&worker.gatheringProgress>0?"gather":"idle";
      const pose=action+(reducedMotion.matches?"-still":"");
      if(pose!==bird.pose){
        bird.clips.forEach(g=>g.stop());
        const clip=bird.clips.find(g=>g.name===action);
        if(clip){clip.start(true);if(reducedMotion.matches){clip.goToFrame(action==="roost"?clip.to:clip.from);clip.pause();}}
        bird.pose=pose;
      }
      const label = Vector3.Project(
        bird.root.position.add(new Vector3(0, 1.1, 0)),
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
          id === selectedBird && x > 30 &&
          x < canvas.clientWidth - 30 &&
          y > 65 &&
          y < canvas.clientHeight - 65,
      };
    }
    for (const landmark of [...trees, { id: "reeds", x: -3, z: -2 },...(renderState?.patches.map(p=>({id:p.id,...p.at}))??[])]) {
      const xw = landmark.x * 2,
        zw = landmark.z * 2;
      const point = Vector3.Project(
        new Vector3(
          xw,
          elevation(xw, zw) + (landmark.id === "reeds"||landmark.id.startsWith("patch-") ? 1 : 7.6*treeScale[landmark.id as keyof typeof treeScale]),
          zw,
        ),
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        viewport,
      );
      const x = (point.x * canvas.clientWidth) / engine.getRenderWidth(),
        y = (point.y * canvas.clientHeight) / engine.getRenderHeight();
      labelPositions[landmark.id] = {
        x: Math.max(60, Math.min(canvas.clientWidth - 60,
          x + (landmark.id === "reeds" ? -120 : landmark.id === "reedside" ? 55 : 0))),
        y: y + (landmark.id === "reeds" ? -35 : 0),
        visible:
          x > 40 &&
          x < canvas.clientWidth - 40 &&
          y > 80 &&
          y < canvas.clientHeight - 65,
      };
    }
    const placed: { x: number; y: number }[] = [];
    for (const id of settlers.map((b) => b.id)) {
      const point = labelPositions[id];
      for (
        let retry = 0;
        retry < 5 &&
        placed.some(
          (p) => Math.abs(p.x - point.x) < 52 && Math.abs(p.y - point.y) < 22,
        );
        retry++
      )
        point.y -= 24;
      placed.push(point);
    }
    onLabels(labelPositions);
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  engine.runRenderLoop(() => scene.render());
  return {
    retryAssets: loadAssets,
    select(id: BirdId) {
      selectedBird=id;
      selection.parent = chickens.get(id)!.root;
      selection.position.y = 0.035;
    },
    update(state: Settlement) {
      renderState = state;
      for (const bird of state.birds) {
        const mesh = chickens.get(bird.id)!;
        const p = presentedBirdPosition(bird);
        const index = settlers.findIndex((b) => b.id === bird.id);
        const idle = !bird.edge && !bird.flight && !bird.perch;
        const x = p.x + (idle ? (index % 2 === 0 ? -1.1 : 1.1) : 0),
          z = p.z + (idle ? (index < 2 ? -1.1 : 1.1) : 0);
        mesh.target.set(x, elevation(x, z) + p.y, z);
        cargoMeshes.get(bird.id)!.setEnabled(bird.cargo > 0);
        const delta = mesh.target.subtract(mesh.root.position);
        if (Math.hypot(delta.x, delta.z) > 0.03)
          mesh.root.rotation.y = Math.atan2(-delta.x, -delta.z);
      }
      const signature = JSON.stringify([
        state.patches,
        state.paths,
        state.piles,
        state.sites.map((s) => [
          s.id,
          s.kind,
          s.at,
          s.complete,
          s.delivered,
          s.stock,
          Math.floor(s.progress / 10),
        ]),
      ]);
      if (signature !== layoutSignature) {
        layoutSignature = signature;
        rebuild(state);
      }
      const dusk = state.phase === "evening";
      sun.intensity = dusk ? 0.38 : 1.8;
      sky.intensity = dusk ? .5 : .38;
      scene.clearColor = Color4.FromHexString(dusk ? "#647d95ff" : "#a9caccff");
    },
    cursor(at: Cell, show: boolean) {
      cursor.position.set(
        at.x * 2,
        elevation(at.x * 2, at.z * 2) + 0.065,
        at.z * 2,
      );
      gridRoot.setEnabled(show);
      cursor.setEnabled(show);
    },
    dispose() {
      disposed = true;
      assetRoots.forEach(root => root.dispose(false, true));
      observer.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      scene.dispose();
      engine.dispose();
    },
  };
}
