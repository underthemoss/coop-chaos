import { settlementWorld, type WorldContext } from "../content/settlement-world";
import { mapPosition } from "../content/maps";
import valleyHabitat from "../content/valley-habitat.json";
import valleyPlacements from "../content/generated/inhabited-valley-placements-v1.json";
import { clearingProps, clearingPropHeight, clearingSceneryHeight, homeFoliageColors } from "./clearing-look";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { createMapTerrain } from "./map-terrain";
import { groundPick, projectedBodyBounds, marqueeBirds, type GroundPickMiss, type ScreenBounds } from "./clearing-input";
import { boundedCameraPan, cameraPanPixels, clearingCameraBounds, clearingCameraView, clearingPanOffset, defaultClearingZoom, freeCameraHalfHeight, type ClearingFraming } from "./clearing-camera";
import { ClearingPanInput } from "./clearing-pan-input";
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
import type { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Settlement, Cell, Worker, BuildKind } from "../simulation/settlement";
import { cargoPosition, groundAccess, commandDestination, route } from "../simulation/settlement";
import { habitatAnchor, habitatPosition, treeHabitat, habitatPresentation } from "../content/tree-habitats";
import { settlers } from "../content/settlement";
import { treeScale, presentedBirdPosition, presentedTreePosition, birdHeading, accessHeading, accessAction, clamberLean } from "./tree-presentation";
import type { Appearance, TreeId, SettlerId as BirdId } from "../content/settlement";
import { createClamberPivot, poseClamberPivot } from "./clamber-presentation";
import { nurseryPresentation, buildingAssets, buildingStage, homePartVisible, groundPartVisible, authoredPart, habitatPartVisible } from "./building-presentation";

export type BirdLabels = Record<
  string,
  { x: number; y: number; visible: boolean }
>;

/** Original GLB characters/trees over a procedural landscape; simulation owns every outcome. */
export function createClearing(
  canvas: HTMLCanvasElement,
  onSelect: (id: BirdId,add?:boolean) => void,
  onLabels: (positions: BirdLabels) => void,
  onPick: (at: Cell,queue?:boolean) => void,
  onTree: (id: TreeId) => void,
  onAssets: (status: "loading" | "ready" | "failed") => void,
  context?: WorldContext,
  interaction?: {onContext:(at:Cell,queue:boolean)=>void;onGroup:(ids:string[],add:boolean)=>void;onMiss:(reason:GroundPickMiss,context:boolean)=>void;onManualCamera:()=>void},
) {
  const definition = settlementWorld(context), map = definition.map, trees = definition.trees;
  const adultScale = map ? valleyHabitat.presentation.adultScale : habitatPresentation.adultScale;
  const bundleScale = habitatPresentation.reedBundleScale / adultScale;
  const worldPoint = (at: Cell) => map ? mapPosition(map, at) : {x:at.x*2,y:0,z:at.z*2};
  const engine = new Engine(canvas, true, { stencil: true });
  if (engine.webGLVersion < 2) {
    engine.dispose();
    throw new Error("This landscape needs a browser with WebGL 2.");
  }
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#bac6b3ff");
  if (map) {
    scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 100; scene.fogEnd = 175;
    scene.fogColor = Color3.FromHexString("#a9cacc");
  }
  scene.ambientColor = new Color3(.06,.07,.04);
  scene.imageProcessingConfiguration.exposure = 1.15;
  scene.imageProcessingConfiguration.contrast = map ? 1.10 : 1.03;
  const camera = new ArcRotateCamera(
    "landscape-camera",
    map ? Math.PI / 2.6 : -Math.PI / 2.6,
    Math.PI / 3.2,
    65,
    new Vector3(0, 0.2, 0),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 150;
  let framing: ClearingFraming = "habitat";
  let zoom = defaultClearingZoom;
  let focusBird: BirdId | null = null;
  let freeView: { halfHeight: number; zoom: number } | null = null;
  let placementKeys = false;
  let targeting = false;
  let targetRings: Mesh[] = [];
  let targetSignature = "";
  const panBounds = clearingCameraBounds(context ?? {});
  const panInput = new ClearingPanInput();
  let hoverPoint: { x: number; y: number } | null = null;
  const resize = () => {
    engine.resize();
    const aspect = canvas.clientWidth/Math.max(1,canvas.clientHeight);
    const {halfHeight,target}=clearingCameraView(context??{},framing,zoom,camera.alpha,camera.beta,aspect);
    if(target && !freeView)camera.target.set(target[0],target[1],target[2]);
    const span=freeView?freeCameraHalfHeight(freeView.halfHeight,freeView.zoom,zoom):halfHeight;
    camera.orthoTop=span;camera.orthoBottom=-span;
    camera.orthoLeft=-span*aspect;camera.orthoRight=span*aspect;
  };
  camera.setTarget(new Vector3(-.6,4.5,.5),false,false,true);
  const sky = new HemisphericLight("soft-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.65;
  sky.groundColor = Color3.FromHexString(map ? "#829993" : "#425c70");
  sky.diffuse=Color3.FromHexString("#a8cbee");
  const sun = new DirectionalLight(
    "evening-sun",
    new Vector3(-0.6, -1, 0.45),
    scene,
  );
  sun.position = new Vector3(15, 25, -15);
  sun.intensity = 0.8;
  sun.diffuse = Color3.FromHexString("#fff0cf");
  if(map){
    sun.position.set(-18,26,14);
    sun.direction.set(18,-17,-16).normalize();
    sun.diffuse=Color3.FromHexString("#ffe5c4");
  }
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering=true;
  shadows.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias=.0005;shadows.normalBias=.004;
  sun.autoCalcShadowZBounds=true;
  shadows.setDarkness(.3);
  if(map){shadows.useContactHardeningShadow=true;shadows.contactHardeningLightSizeUVRatio=.025;shadows.setDarkness(.28);}
  // Small-scale occlusion gives layered foliage and woven seams local depth.
  const occlusion = new SSAO2RenderingPipeline("grove-contact",scene,{ssaoRatio:.5,blurRatio:.5},[camera]);
  occlusion.radius=.65;occlusion.totalStrength=.65;occlusion.samples=8;occlusion.expensiveBlur=false;
  function material(name: string, color: string) {
    const value = new StandardMaterial(name, scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.specularColor = new Color3(0.015, 0.015, 0.015);
    return value;
  }
  const coast = (z: number) => 10.5 + 1.4*Math.sin(z*.25)+.6*Math.sin(z*.61+.4);
  const creekWidth=(z:number)=>1.7+.38*Math.sin(z*.43+.8)+.2*Math.sin(z*1.1);
  const elevation = (x: number, z: number) => {
    // All legal work cells and their perched offsets share one ground datum.
    // Relief belongs to the scenic woodland beyond the playable rectangle.
    if(map) return clearingSceneryHeight(map,x,z);
    const outside = Math.hypot(Math.max(0, Math.abs(x) - 9.2), Math.max(0, Math.abs(z) - 7.2));
    const hill = Math.min(1, outside / 9);
    const inland = Math.max(0, Math.min(1, (coast(z) - x) / 7));
    return (
      0.18 +
      hill * inland * (0.9 + Math.sin(x * 0.22) * Math.cos(z * 0.15) * 0.8)
    );
  };
  function woodlandEnvironment() {
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

  const water = material("water", "#ffffff");
  water.specularColor=Color3.FromHexString("#8ea8a5");water.specularPower=110;
  // The creek is a narrow landscape feature; only the left bank is playable ground.
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
  // A few settled leaf pockets ground the hero's buttresses. They are flat
  // surface detail, never obstacles or an alternate route/collision system.
  const soilPositions:number[]=[],soilIndices:number[]=[],soilColors:number[]=[];
  const rootPatches=[[-6.5,3.8,.8,.48],[-6.25,5.6,.75,.55],[-4.8,6.5,.7,.5],[-1.65,4.9,.65,.45],[-2,3.15,.55,.38]];
  for(let patch=0;patch<rootPatches.length;patch++){
    const [cx,cz,rx,rz]=rootPatches[patch],start=soilPositions.length/3;
    const center=Color3.FromHexString(patch%2?"#7d7952":"#82704e");
    soilPositions.push(cx,elevation(cx,cz)+.006,cz);soilColors.push(center.r,center.g,center.b,1);
    for(let ring=0;ring<2;ring++)for(let step=0;step<16;step++){
      const angle=step*Math.PI/8,irregular=1+.16*Math.sin(step*2.3+patch)+.08*Math.cos(step*3.7-patch);
      const radius=(ring===0?.55:1)*irregular,x=cx+Math.cos(angle)*rx*radius,z=cz+Math.sin(angle)*rz*radius;
      const color=Color3.Lerp(center,groundColor(x,z),ring===0?.28:1);
      soilPositions.push(x,elevation(x,z)+.006,z);soilColors.push(color.r,color.g,color.b,1);
    }
    for(let step=0;step<16;step++){
      const next=(step+1)%16,a=start+1+step,b=start+1+next,c=start+17+step,d=start+17+next;
      soilIndices.push(start,b,a,a,d,c,a,b,d);
    }
  }
  const soil=surface("lowfork-root-soil-transition",soilPositions,soilIndices,material("root-leafmould","#ffffff"),soilColors);
  soil.isPickable=false;
  const rootLeaves:number[]=[],rootLeafIndices:number[]=[],rootLeafColors:number[]=[];
  const hero=trees.find(tree=>tree.id==="lowfork")!;
  const leafTints=["#948052","#a38b59","#7d8251"].map(Color3.FromHexString);
  const leafPockets=[[-2.7,-.6],[-2.4,1.5],[-.9,2.5],[2.6,.9],[2.2,-.9]];
  for(let pocket=0;pocket<leafPockets.length;pocket++)for(let leaf=0;leaf<18;leaf++){
    const [px,pz]=leafPockets[pocket],angle=leaf*2.399+pocket*.7;
    const spread=Math.sqrt((leaf+.5)/18),x=hero.x*2+px+Math.cos(angle)*spread*.45,z=hero.z*2+pz+Math.sin(angle)*spread*.3;
    const length=.14+(leaf%4)*.025,width=length*.28,turn=angle*.8;
    const points=[[-length/2,0,0],[-length*.1,0,width],[length/2,0,0],[-length*.1,0,-width],[0,.008,0]];
    const start=rootLeaves.length/3,tint=leafTints[(leaf+pocket)%leafTints.length];
    for(const [lx,ly,lz] of points){
      rootLeaves.push(x+lx*Math.cos(turn)-lz*Math.sin(turn),elevation(x,z)+.012+ly,z+lx*Math.sin(turn)+lz*Math.cos(turn));
      rootLeafColors.push(tint.r,tint.g,tint.b,1);
    }
    for(let edge=0;edge<4;edge++)rootLeafIndices.push(start+4,start+edge,start+(edge+1)%4);
  }
  const leafMaterial=material("settled-root-leaves","#ffffff");
  leafMaterial.backFaceCulling=false;
  const rootLitter=surface("lowfork-root-litter",rootLeaves,rootLeafIndices,leafMaterial,rootLeafColors);
  rootLitter.isPickable=false;
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
    return { terrain, currents };
  }
  const mappedTerrain = map ? createMapTerrain(map,scene) : null;
  const woodland = map ? null : woodlandEnvironment();
  const terrain = mappedTerrain?.terrain ?? woodland!.terrain;
  const currents = woodland?.currents ?? [];
  const chickens = new Map<
    BirdId,
    {
      root: TransformNode;
      body: TransformNode;
      head: TransformNode;
      wing: TransformNode;
      hit: Mesh;
      target: Vector3;
      clips: AnimationGroup[];
      pose: string;
      clamber: TransformNode | null;
    }
  >();

  // Controllers survive asset replacement so cargo, selection and saved poses stay attached.
  function controller(id: BirdId) {
    const root = new TransformNode(id, scene);
    root.position.set(-6, .18, -4);
    root.scaling.setAll(adultScale);
    const body = new TransformNode(`${id}-body`, scene);
    body.parent = root;
    const head = new TransformNode(`${id}-head`, scene);
    head.parent = body;
    const wing = new TransformNode(`${id}-wing`, scene);
    wing.parent = body;
    const hit=MeshBuilder.CreateSphere(`${id}-hit`,{diameter:habitatPresentation.birdPickDiameter*1.25/adultScale,segments:8},scene);
    hit.parent=root;hit.position.y=.32/adultScale;
    hit.visibility=0;hit.metadata={birdId:id,birdHitProxy:true};
    const value={ root, body, head, wing, hit, target: root.position.clone(),clips:[],pose:"",clamber:null as TransformNode | null };
    chickens.set(id,value);
    return value;
  }
  for(const person of settlers)controller(person.id);
  const appearances=new Map<Appearance,{root:Mesh;clips:AnimationGroup[]}>();
  let disposed = false;
  let loading = false;
  const assetRoots: TransformNode[] = [];
  const templates = new Map<string,Mesh>();
  let nurseryFocused=false;
  let nurseryCover:{mesh:Mesh;original:Material;faded:Material}[]=[];
  function revealNursery(){for(const {mesh,original,faded} of nurseryCover)if(!mesh.isDisposed())mesh.material=nurseryFocused?faded:original;}
  async function loadAssets() {
    if (loading || disposed) return;
    loading = true;
    onAssets("loading");
    const staged: TransformNode[] = [];
    const stagedTemplates = new Map<string, Mesh>();
    const publishBirds: (() => void)[] = [];
    const stagedClips: AnimationGroup[] = [];
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
        ...trees.map(t => ({ path: map ? valleyHabitat.assetUrls.living.replace("/assets/","") : `environment/${t.id}.glb`, tree: t, bird: null,template:null })),
        ...settlers.map(b => ({ path: `characters/${b.id}.glb`, tree: null, bird: b,template:null })),
        ...(map ? ["grove-oak","grove-spread","grove-shrub"].map(id=>({path:`environment/valley/valley-${id}.glb`,tree:null,bird:null,template:`dressing-${id}`})) : []),
        ...["hauling-basket","reed-bundle","understory","reed-clump","dressing-birch","dressing-willow","dressing-bush-a","dressing-bush-b","dressing-bush-c","dressing-grass","dressing-cattails","dressing-rock-a","dressing-rock-b"].map(id=>({path:`environment/${id}.glb`,tree:null,bird:null,template:id})),
        ...buildingAssets.filter(asset=>!map || asset.id==="reed-store" || asset.id==="root-nursery").map(asset=>({path:asset.path,tree:null,bird:null,template:asset.id})),
        ...(map?[{path:valleyHabitat.assetUrls.kit.replace("/assets/",""),tree:null,bird:null,template:"valley-kit"}]:[]),
      ];
      for (const task of tasks) {
        const imported = await ImportMeshAsync(`/assets/${task.path}`, scene);
        const root = imported.meshes[0];
        for (const node of [...imported.transformNodes, ...imported.meshes])
          node.metadata = { ...node.metadata, authoredPart: node.name };
        if (disposed) { root.dispose(false, true); return; }
        root.setEnabled(false);
        imported.animationGroups.forEach(group => group.stop());
        stagedClips.push(...imported.animationGroups);
        staged.push(root);
        // Trees and the additions declare +X tree-local sockets. Babylon's default glTF
        // conversion mirrors X; compensate once at their presentation root.
          if(task.tree || task.template === "valley-kit" || task.template === "sleeping-deck" || task.template === "hauling-basket" || buildingAssets.some(asset=>asset.id===task.template))root.scaling.x *= -1;
        if(task.template)stagedTemplates.set(task.template,root as Mesh);
        if(task.tree && !map){
          const locations=task.tree.id === "lowfork" ? [[-11,5,.6],[-12,10,.64],[-8,12,.55],[-5,15,.48]] : task.tree.id === "splitcrown" ? [[-11,8,.4]] : [[-14,3,.36]];
          for(const [x,z,scale] of locations){const copy=root.clone(`${task.tree.id}-woodland`,null)!;copy.position.set(x,elevation(x,z),z);copy.scaling.scaleInPlace(scale);copy.rotation.y=(x+z)*.13;copy.getChildMeshes().forEach(m=>{m.isPickable=false;});copy.setEnabled(false);staged.push(copy);}
        }
        if(task.tree && map)for(const mesh of root.getChildMeshes()){
          if(mesh.material?.name.includes("small-leaves") && "albedoColor" in mesh.material){
            (mesh.material as unknown as {albedoColor:Color3}).albedoColor=new Color3(1.22,1.06,.78);
            const colors=mesh.getVerticesData(VertexBuffer.ColorKind);
            if(colors){const stride=mesh.getVertexBuffer(VertexBuffer.ColorKind)?.getSize()??4;mesh.setVerticesData(VertexBuffer.ColorKind,homeFoliageColors(colors,stride),false,stride);}
          }
        }
        if (task.tree) {
          for (const mesh of root.getChildMeshes()) mesh.metadata = { treeId: task.tree.id };
          const p=worldPoint(task.tree);root.position.set(p.x,elevation(p.x,p.z),p.z); root.scaling.scaleInPlace(treeScale[task.tree.id]); }
        if (task.bird) {
          const person = task.bird;
          publishBirds.push(() => {
          const controller = chickens.get(person.id)!;
          root.parent = controller.root;
          const nodes = [...imported.transformNodes, ...imported.meshes];
          controller.body = nodes.find(n => n.name === "body")!;
          controller.clamber = createClamberPivot(controller.body, `${task.bird.id}-clamber-upper`);
          controller.head = nodes.find(n => n.name === "head")!;
          controller.wing = nodes.find(n => n.name === "wing")!;
          imported.animationGroups.forEach(g=>g.stop());
          controller.clips=imported.animationGroups;controller.pose="";
          appearances.set(person.id,{root:root as Mesh,clips:imported.animationGroups});
          for (const mesh of root.getChildMeshes()) mesh.metadata = { birdId: person.id };
          });
        }
        for (const mesh of root.getChildMeshes()) { shadows.addShadowCaster(mesh); mesh.receiveShadows = true; }
      }
      if(map) await mappedTerrain!.loadDressing(shadows);
      if (!disposed) {
        // Publish together only after every dependency succeeds. Intervening rule
        // updates cannot clone a failed attempt's templates or young appearances.
        stagedTemplates.forEach((root, id) => templates.set(id, root));
        publishBirds.forEach(publish => publish());
        scene.environmentTexture?.dispose();
        scene.environmentTexture = environment;
        scene.environmentIntensity = .28;
        staged.forEach(root => {
          for (const mesh of root.getChildMeshes()) { shadows.addShadowCaster(mesh); mesh.receiveShadows = true; }
          root.setEnabled(true);
        });
        templates.forEach(root=>root.setEnabled(false));
        const foliageMaterials=new Map<string,Material>();
        function dress(id:string,x:number,z:number,scale:number,turn:number,yOffset=0,stretch?:[number,number,number],tint?:string){
          const template=templates.get(`dressing-${id}`)!;
          const copy=template.clone(`clearing-${id}`,null)!;copy.position.set(x,elevation(x,z)+yOffset,z);copy.scaling.scaleInPlace(scale);copy.rotation.y=turn;if(stretch)copy.scaling.multiplyInPlace(new Vector3(...stretch));copy.setEnabled(true);staged.push(copy);
          if(tint)for(const mesh of copy.getChildMeshes()){
            const original=mesh.material;
            if(!original?.name.includes("broadleaf"))continue;
            const key=`${id}-${tint}`;
            let mat=foliageMaterials.get(key);
            if(!mat){mat=original.clone(`scenic-foliage-${key}`)??undefined;if(mat){foliageMaterials.set(key,mat);if("albedoColor" in mat)(mat as unknown as {albedoColor:Color3}).albedoColor=Color3.FromHexString(tint);}}
            if(mat)mesh.material=mat;
          }
          copy.getChildMeshes().forEach(m=>{m.isPickable=false;shadows.addShadowCaster(m);m.receiveShadows=true;});return copy;
        }
        if (map) {
          for (const prop of clearingProps(map)) dress(prop.id,prop.x,prop.z,prop.scale,prop.turn,clearingPropHeight(map,prop)-elevation(prop.x,prop.z),prop.stretch,prop.tint);
          nurseryCover=[];
          for (const item of valleyPlacements.scenicTrees) {
            const p=worldPoint(item.at),copy=dress(item.art.replace("dressing-",""),p.x,p.z,item.scale,item.yaw);
            // This willow owns a canonical root obstacle. Keep it exact and
            // reveal only the nursery behind its leaves during focused work.
            if(item.id==="west-cover-tree")for(const mesh of copy.getChildMeshes())if(mesh instanceof Mesh&&mesh.material?.name==="willow-leaves"){
              const original=mesh.material,faded=original.clone("nursery-willow-context");
              if(faded){faded.alpha=.2;faded.transparencyMode=2;faded.backFaceCulling=true;nurseryCover.push({mesh,original,faded});}
            }
          }
          revealNursery();
        } else {
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
        dress("grass",-6.8,4.9,.6,.7);dress("grass",-1.5,5.2,.48,2.1);
        dress("grass",-3.1,6.8,.65,1.6);dress("grass",-6.3,3.7,.5,1.4);
        for(const [x,z,scale,turn] of [[-6.8,4.35,.19,.5],[-6,5.7,.23,1.7],[-4.9,6.5,.17,2.3],[-1.4,4.85,.18,.8],[-2.2,3.25,.16,1.2]])
          dress("rock-b",x,z,scale,turn,-.04);
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
        }
        const bundle=templates.get("reed-bundle")!;
        for(const [id,bird] of chickens){
          cargoMeshes.get(id)?.dispose();
          const carried=bundle.clone(`${id}-carried-reeds`,bird.root)!;
          carried.position.set(0,1.1,.7);carried.scaling.setAll(bundleScale);
          carried.setEnabled((renderState?.birds.find(b=>b.id===id)?.cargo??0)>0);
          carried.getChildMeshes().forEach(m=>{m.isPickable=false;shadows.addShadowCaster(m);});
          cargoMeshes.set(id,carried);
        }
        layoutSignature="";
        if(renderState){
          // A paused import may have published dynamic controllers before assets
          // arrived. Populate them now; waiting for another tick hides the young.
          world.update(renderState);
        }
        assetRoots.push(...staged);
        onAssets("ready");
      }
    } catch (error) {
      stagedClips.forEach(group => group.dispose());
      staged.forEach(root => root.dispose(false, true));
      environment?.dispose();
      if (!disposed) { console.error("Coop Chaos model load failed", error); onAssets("failed"); }
    } finally { loading = false; }
  }
  void loadAssets();
  const selection = MeshBuilder.CreateTorus(
    "selected-character",
    { diameter: 2.1, thickness: 0.075, tessellation: 32 },
    scene,
  );
  selection.material = material("selection-ochre", "#e9cd87");
  selection.isPickable=false;
  selection.parent = chickens.get("fern")!.root;
  selection.position.y = 0.035;
  let selectedBird: BirdId = "fern";
  const groupRings=new Map<string,Mesh>();
  let selectedIds:string[]=[];
  const screenBirds=new Map<string,ScreenBounds>();
  let guideSignature="";
  let guides:Mesh[]=[];
  function updateCommandGuides(state:Settlement){
    const actors=state.birds.filter(b=>selectedIds.includes(b.id));
    const signature=JSON.stringify(actors.map(b=>[b.id,b.at,commandDestination(state,b),b.direct?.queue]));
    if(signature===guideSignature)return;guideSignature=signature;guides.forEach(m=>m.dispose());guides=[];
    for(const bird of actors){
      const target=commandDestination(state,bird);if(!target)continue;
      const p=worldPoint(target),ring=MeshBuilder.CreateTorus(`order-target-${bird.id}`,{diameter:map?.55:1.1,thickness:map?.025:.055,tessellation:24},scene);
      ring.position.set(p.x,p.y+.07,p.z);ring.material=selection.material;ring.isPickable=false;guides.push(ring);
      const cells=route(state,bird.at,target);
      if(cells&&cells.length>1){const points=cells.map(at=>{const p=worldPoint(at);return new Vector3(p.x,p.y+.08,p.z);});const line=MeshBuilder.CreateLines(`order-route-${bird.id}`,{points},scene);line.color=Color3.FromHexString("#ecd69a");line.alpha=.65;line.isPickable=false;guides.push(line);}
    }
  }
  let renderState: Settlement | null = null;
  let layoutSignature = "";
  const cargoMat = material("reed-bundles", "#d9bb69");
  const gridMat = material("grid", "#bcc08b");
  gridMat.alpha = 0.24;
  const gridRoot = new TransformNode("placement-grid", scene);
  const markerCells = map ? definition.pads.map(p=>({...p.at,width:p.footprint.width,depth:p.footprint.depth})) : Array.from({length:63},(_,i)=>({x:i%9-4,z:Math.floor(i/9)-3,width:1.85,depth:1.85}));
  for (const cell of markerCells) { const {x,z}=worldPoint(cell);
      const marker = MeshBuilder.CreateGround(
        "cell",
        { width: cell.width, height: cell.depth },
        scene,
      );
      marker.position.set(x, elevation(x,z)+.045,z);
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
  const previewMaterial=material("uncommissioned-preview", "#c8b475");
  previewMaterial.alpha=.26;previewMaterial.emissiveColor=Color3.FromHexString("#c8b475").scale(.18);previewMaterial.backFaceCulling=false;
  let preview:Mesh|null=null,previewKey="";
  function placementPreview(at:Cell,kind:BuildKind|null){
    const key=kind?`${kind}:${at.x}:${at.z}`:"";
    if(key===previewKey)return;
    preview?.dispose();preview=null;previewKey=key;
    if(!kind)return;
    const tree=trees.find(t=>t.x===at.x&&t.z===at.z),pad=definition.pads.find(p=>p.kind===kind&&(p.at.x===at.x&&p.at.z===at.z||p.tree===tree?.id));
    const target=pad?.at??at,p=kind==="nursery"?nurseryPresentation(target,context):worldPoint(target);
    const kit=map&&tree&&kind!=="store"&&kind!=="nursery";
    const template=templates.get(kit?"valley-kit":kind==="store"?"reed-store":kind==="nursery"?"root-nursery":kind==="treehouse"?"boughhome":kind);
    if(!template){previewKey="";return;}
    preview=template.clone("uncommissioned-preview",null)!;preview.position.set(p.x,elevation(p.x,p.z),p.z);preview.setEnabled(true);
    if(tree&&!map&&kind!=="nursery")preview.scaling.scaleInPlace(treeScale[tree.id]);
    const groups=kit?valleyHabitat.profile.stages[kind==="treehouse"?"home":kind==="sleeping-deck"?"middle":"basket"]:null;
    const visible=groups?new Set([...groups.base,...groups.frame,...groups.complete]):null;
    for(const mesh of preview.getChildMeshes()){mesh.material=previewMaterial;mesh.useVertexColors=false;mesh.receiveShadows=false;mesh.isPickable=false;if(visible)mesh.setEnabled(habitatPartVisible(mesh,visible));}
  }
  const cargoMeshes = new Map<BirdId, Mesh>();
  const plannedMaterial=material("planned-workcourt", "#c59a4b");
  plannedMaterial.emissiveColor=Color3.FromHexString("#6b4f20").scale(.35);
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
  const foodMeshes=new Map<BirdId,Mesh>();
  const eggMat=material("brood-eggs","#efe1b5");
  const stapleMat=material("gathered-seeds","#d6aa53"),proteinMat=material("gathered-protein","#5d6d3c");
  const populated=new Set<string>();
  function ensureBird(worker:Worker) {
    let bird=chickens.get(worker.id);
    const template=appearances.get(worker.life.appearance);
    if(!bird){
      bird=controller(worker.id);
    }
    if(template&&!settlers.some(b=>b.id===worker.id)&&!populated.has(worker.id)){
        populated.add(worker.id);
        const copy=template.root.clone(`${worker.id}-appearance`,bird.root)!;
        const original=[template.root,...template.root.getDescendants()];
        const cloned=[copy,...copy.getDescendants()];
        const targets=new Map(original.map((node,i)=>[node,cloned[i]]));
        bird.clips=template.clips.map(group=>group.clone(group.name,target=>targets.get(target)??target));
        bird.clips.forEach(group=>group.stop());copy.setEnabled(true);
        bird.clamber = copy.getChildTransformNodes().find(node => node.metadata?.clamberPivot) ?? null;
        copy.getChildMeshes().forEach(mesh=>{mesh.metadata={birdId:worker.id};shadows.addShadowCaster(mesh);mesh.receiveShadows=true;});
        // Dependent young inherit the named parent's appearance, with restrained comb/tail.
        copy.getDescendants().filter(n=>/comb|tail/i.test(n.name)).forEach(node=>{
          if(node instanceof TransformNode){node.metadata={...node.metadata,youngScale:node.scaling.clone()};}
        });
      }
    if(!cargoMeshes.has(worker.id)){
      const bundle=templates.get("reed-bundle")?.clone(`${worker.id}-carried-reeds`,bird.root);
      if(bundle){bundle.scaling.setAll(bundleScale);bundle.setEnabled(false);cargoMeshes.set(worker.id,bundle);}
    }
    const scale=worker.life.stage==="chick"?.44:worker.life.stage==="juvenile"?.7:1;
    bird.root.scaling.setAll(adultScale*scale);
    const hit=bird.root.getChildMeshes().find(m=>m.metadata?.birdHitProxy);
    if(hit)hit.scaling.setAll(1/scale);
    bird.root.getDescendants().forEach(node=>{
      if(node instanceof TransformNode&&node.metadata?.youngScale){
        const base=node.metadata.youngScale as Vector3;
        node.scaling.copyFrom(base).scaleInPlace(worker.life.stage==="chick"?.35:worker.life.stage==="juvenile"?.6:1);
      }
    });
    if(!foodMeshes.has(worker.id)){
      const food=MeshBuilder.CreateSphere(`${worker.id}-food-cargo`,{diameter:.55,segments:5},scene);
      food.parent=bird.root;food.position.set(0,1.15,.9);food.isPickable=false;foodMeshes.set(worker.id,food);
    }
    const food=foodMeshes.get(worker.id)!;food.material=worker.foodCargo==="protein"?proteinMat:stapleMat;food.setEnabled(!!worker.foodCargo);
    return bird;
  }
  let builtMeshes: Mesh[] = [];
  const lifts = new Map<string,{basket:TransformNode;rope:TransformNode;tree:TreeId}>();
  function updateLifts(state: Settlement) {
    for(const [id, rig] of lifts){
      const progress=state.birds.find(b=>b.lift?.basket===id)?.lift?.progress??0;
      const profile=treeHabitat(rig.tree), haul=profile.hauling;
      rig.basket.position.y=habitatAnchor(rig.tree,"basket-ground").y+haul.travelY*progress;
      rig.rope.scaling.y=(haul.ropeRestLength-haul.travelY*progress)/(rig.tree === "longbough" ? valleyHabitat.profile.hauling.ropeAuthoredLength : haul.ropeRestLength);
    }
  }
  function rebuild(state: Settlement) {
    for (const mesh of builtMeshes) {
      shadows.removeShadowCaster(mesh);
      mesh.dispose();
    }
    builtMeshes = [];
    lifts.clear();
    function model(id:string,x:number,y:number,z:number,scale=1){
      const template=templates.get(id);if(!template)return null;
      const copy=template.clone(`${id}-placed`,null)!;copy.position.set(x,y,z);copy.scaling.scaleInPlace(scale);copy.setEnabled(true);
      for(const m of copy.getChildMeshes()){m.isPickable=false;shadows.addShadowCaster(m);m.receiveShadows=true;}
      builtMeshes.push(copy);return copy;
    }
    function bundles(x:number,z:number,count:number){
      for(let i=0;i<Math.min(12,count);i++)model("reed-bundle",x+((i%3)-1)*.3,elevation(x,z)+.08+Math.floor(i/6)*.13,z+((Math.floor(i/3)%2)-.5)*.38,habitatPresentation.reedBundleScale);
    }
    // Food places are quiet ground habitat clusters, distinct from tall construction reeds.
    for (const patch of state.forage) {
      const {x,z}=worldPoint(patch.at);
      const count=2+Math.ceil(4*patch.remaining/patch.capacity);
      for(let i=0;i<count;i++){
        const a=i*2.39996,xx=x+Math.cos(a)*(.3+i*.1),zz=z+Math.sin(a)*(.3+i*.1);
        const clump=model(patch.id==="leaf-litter"?"dressing-bush-b":"dressing-grass",xx,elevation(xx,zz),zz,patch.id==="leaf-litter"?.22:.5);
        if(clump)clump.rotation.y=a;
      }
    }
    for(const patch of state.patches){
      const {x,z}=worldPoint(patch.at);
      for(let i=0;i<patch.remaining;i++){
        const a=i*2.39996,r=Math.sqrt((i+.5)/patch.capacity)*.64,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;
        const clump=model("reed-clump",xx,elevation(xx,zz),zz,.7);if(clump)clump.rotation.y=a;
      }
    }
    for (const pile of state.piles)
      bundles(worldPoint(pile.at).x,worldPoint(pile.at).z+(pile.kind === "source" ? .8 : 0),pile.stock);
    for (const site of state.sites) {
      if(!site.complete&&!state.sites.slice(0,state.sites.indexOf(site)).some(s=>!s.complete&&s.at.x===site.at.x&&s.at.z===site.at.z)){
        const {x:cx,z:cz}=worldPoint(groundAccess(site.at,state));
        const ring=MeshBuilder.CreateTorus(`planned-${site.id}`,{diameter:1.8,thickness:.09,tessellation:32},scene);
        ring.position.set(cx,elevation(cx,cz)+.08,cz);ring.material=plannedMaterial;ring.isPickable=false;
        builtMeshes.push(ring);
      }
      const {x,z} = worldPoint(site.at),
        y = elevation(x, z);
      if (site.kind === "store") {
        const stage=buildingStage(site);
        const basket=stage>0?model("reed-store",x,y,z):null;
        if(basket)for(const mesh of basket.getChildMeshes())mesh.setEnabled(groundPartVisible(mesh.name,stage));
        bundles(x, z, site.complete ? site.stock : site.delivered);
      } else if(site.kind === "nursery") {
        const court=nurseryPresentation(site.at,state), nx=court.x,nz=court.z,ny=elevation(nx,nz);
        const stage=buildingStage(site);
        const nurseryModel=stage>0?model("root-nursery",nx,ny,nz):null;
        if(nurseryModel)for(const mesh of nurseryModel.getChildMeshes())mesh.setEnabled(groundPartVisible(mesh.name,stage));
        if(site.complete){
          const nursery=state.economy.nurseries.find(n=>n.site===site.id);
          for(const [type,count] of Object.entries(nursery?.food??{}))for(let i=0;i<count;i++){
            const food=MeshBuilder.CreateSphere("nursery-food",{diameter:.12,segments:4},scene);food.position.set(nx+(type==="staple"?-.55:.55)+(i%2)*.11,ny+.13,nz-.35+Math.floor(i/2)*.1);food.material=type==="staple"?stapleMat:proteinMat;food.isPickable=false;builtMeshes.push(food);
          }
          const brood=state.economy.broods.find(b=>b.id===nursery?.brood);
          for(const [i,egg] of (brood?.eggs??[]).entries())if(egg.viable&&!egg.child){
            const mesh=MeshBuilder.CreateSphere(egg.id,{diameter:.08,segments:8},scene);mesh.scaling.y=1.3;mesh.position.set(nx-.045+i*.09,ny+.105,nz-.58+(i%2)*.02);mesh.material=eggMat;mesh.isPickable=false;builtMeshes.push(mesh);
          }
        }else bundles(nx,nz,site.delivered);
      } else if(map && site.tree === "longbough") {
        const stage=buildingStage(site), tree=trees.find(t=>t.id===site.tree)!, origin=worldPoint(tree);
        const kit=stage>0?model("valley-kit",origin.x,origin.y,origin.z):null;
        if(kit){
          const key=site.kind==="treehouse"?"home":site.kind==="sleeping-deck"?"middle":"basket";
          const groups=valleyHabitat.profile.stages[key];
          const visible=new Set([...groups.base,...(stage>=2?groups.frame:[]),...(site.complete?groups.complete:[])]);
          for(const mesh of kit.getChildMeshes()) mesh.setEnabled(habitatPartVisible(mesh,visible));
          if(key==="basket"){
            const nodes=kit.getDescendants();
            const basket=nodes.find(n=>authoredPart(n)==="basket") as TransformNode|undefined,rope=nodes.find(n=>authoredPart(n)==="lift-rope") as TransformNode|undefined;
            if(basket&&rope)lifts.set(site.id,{basket,rope,tree:site.tree});
          }
        }
        if(!site.complete){const p=worldPoint(groundAccess(site.at,state));bundles(p.x+.9,p.z,site.delivered);}
      } else if(site.kind === "sleeping-deck" || site.kind === "hauling-basket") {
        // The authored pieces become visible as local supplies turn into construction.
        if(site.complete || site.progress>0 || site.delivered>=3){
          const piece=model(site.kind,x,y,z,site.tree?treeScale[site.tree]:1);
          if(piece){
            const nodes=[piece,...piece.getDescendants()].filter((n):n is TransformNode=>n instanceof TransformNode);
            if(site.kind==="hauling-basket"){
              const haul=treeHabitat(site.tree!).hauling;
              const basket=nodes.find(n=>n.name.split(".").at(-1)===haul.basketNode);
              const rope=nodes.find(n=>n.name.split(".").at(-1)===haul.ropeNode);
              if(basket&&rope)lifts.set(site.id,{basket,rope,tree:site.tree!});
            }else if(!site.complete){
              for(const node of nodes)if(node.name.includes("sleeping-rainhood"))node.setEnabled(false);
            }
          }
        }
        if(!site.complete)bundles(x+1.15,z-.6,site.delivered);
      } else {
        const stage = buildingStage(site);
        if(stage>0){
          const home=model("boughhome",x,y,z,site.tree?treeScale[site.tree]:1);
          if(home)for(const mesh of home.getChildMeshes())mesh.setEnabled(homePartVisible(mesh.name,stage));
        }
        if (!site.complete) bundles(x + 1.15, z - 0.6, site.delivered);
      }
    }
    updateLifts(state);
  }
  const pan = (pixels: {x:number;y:number}) => {
    if (!panBounds || (!pixels.x && !pixels.y)) return;
    const offset=clearingPanOffset(pixels,camera.orthoTop!,canvas.clientHeight,camera.alpha,camera.beta);
    const target=boundedCameraPan(camera.target,offset,panBounds);
    if(target.x===camera.target.x && target.z===camera.target.z)return;
    if(!freeView){freeView={halfHeight:camera.orthoTop!,zoom};interaction?.onManualCamera();}
    camera.target.set(target.x,target.y,target.z);
  };
  const releaseDrag = () => {
    const id=panInput.dragId();
    if(id!==null){panInput.endDrag(id);if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
  };
  const resetNavigation = () => {releaseDrag();panInput.reset();hoverPoint=null;};
  const globalPointerDown = (event:PointerEvent) => {panInput.press(event.buttons);hoverPoint=null;};
  const navigationMove = (event:PointerEvent) => {
    if(!map)return;
    if(panInput.dragId()===event.pointerId){
      if(!(event.buttons&4)){releaseDrag();panInput.release(event.buttons);return;}
      const delta=panInput.dragTo(event.pointerId,event.clientX,event.clientY);
      if(delta)pan(delta);
      event.preventDefault();return;
    }
    hoverPoint={x:event.clientX,y:event.clientY};
    const bounds=canvas.getBoundingClientRect();
    panInput.hover({x:event.clientX-bounds.left,y:event.clientY-bounds.top},bounds.width,bounds.height,event.buttons,
      event.pointerType==="mouse" && matchMedia("(any-pointer: fine)").matches && event.target===canvas && document.elementFromPoint(event.clientX,event.clientY)===canvas);
  };
  const navigationUp = (event:PointerEvent) => {
    if(panInput.dragId()===event.pointerId){event.preventDefault();releaseDrag();}
    panInput.release(event.buttons);hoverPoint=null;
  };
  const navigationLeave = () => {panInput.leave();hoverPoint=null;};
  const lostCapture = (event:PointerEvent) => {panInput.endDrag(event.pointerId);panInput.release(0);};
  const navigationKey = (event:KeyboardEvent) => {
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)panInput.clearKeys();
    const eligible=!!map && !placementKeys && !event.defaultPrevented && event.target===canvas && document.activeElement===canvas && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    if(panInput.keyDown(event.key,eligible))event.preventDefault();
  };
  const navigationKeyUp = (event:KeyboardEvent) => panInput.keyUp(event.key);
  const navigationFocusOut = () => panInput.clearKeys();
  let pointer: {id:number;x:number;y:number;moved:boolean;button:number}|null=null;
  const pointerDown=(event:PointerEvent)=>{
    if(map && event.pointerType==="mouse" && event.button===1){
      event.preventDefault();pointer=null;canvas.focus({preventScroll:true});
      panInput.beginDrag(event.pointerId,event.clientX,event.clientY);canvas.setPointerCapture(event.pointerId);return;
    }
    if((event.button!==0&&event.button!==2)||pointer){pointer=null;return;}
    canvas.focus({preventScroll:true});
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,button:event.button};
  };
  const pointerMove=(event:PointerEvent)=>{
    if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>5)pointer.moved=true;
  };
  const pointerUp=(event:PointerEvent)=>{
    const p=pointer;pointer=null;
    if(!p||p.id!==event.pointerId||event.type!=="pointerup")return;
    if(p.moved){
      if(p.button===0&&!targeting){const b=canvas.getBoundingClientRect();const ids=marqueeBirds(screenBirds,{x:p.x-b.left,y:p.y-b.top},{x:event.clientX-b.left,y:event.clientY-b.top});interaction?.onGroup(ids,event.shiftKey);}
      return;
    }
    const bounds=canvas.getBoundingClientRect(),x=event.clientX-bounds.left,y=event.clientY-bounds.top;
    // Prioritize the small bird's dedicated hit proxy, including through foliage.
    // Accessible named controls remain available when a tree hides its occupant.
    const birdPick=scene.pick(x,y,m=>!!m.metadata?.birdHitProxy);
    const pick=birdPick?.hit?birdPick:scene.pick(x,y),id=pick?.pickedMesh?.metadata?.birdId as BirdId|undefined;
    if(id&&p.button===0&&!targeting){onSelect(id,event.shiftKey);return;}
    const treeId=pick?.pickedMesh?.metadata?.treeId as TreeId|undefined;
    if(treeId&&p.button===0&&!targeting){onTree(treeId);return;}
    const ground=scene.pick(x,y,mesh=>mesh===terrain);
    const target=groundPick(ground?.pickedPoint??null,context);
    if(target.kind==="miss"){interaction?.onMiss(target.reason,p.button===2);return;}
    if(p.button===2)interaction?.onContext(target.at,event.shiftKey);else onPick(target.at,event.shiftKey);
  };
  canvas.addEventListener("pointerdown",pointerDown);
  canvas.addEventListener("pointermove",pointerMove);
  canvas.addEventListener("pointerup",pointerUp);
  canvas.addEventListener("pointercancel",pointerUp);
  if(map){
    window.addEventListener("pointerdown",globalPointerDown,true);
    window.addEventListener("pointermove",navigationMove,{capture:true,passive:false});
    window.addEventListener("pointerup",navigationUp,true);
    window.addEventListener("pointercancel",resetNavigation,true);
    window.addEventListener("blur",resetNavigation);
    document.addEventListener("visibilitychange",resetNavigation);
    window.addEventListener("keyup",navigationKeyUp);
    canvas.addEventListener("pointerleave",navigationLeave);
    canvas.addEventListener("lostpointercapture",lostCapture);
    canvas.addEventListener("keydown",navigationKey);
    canvas.addEventListener("focusout",navigationFocusOut);
  }
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(engine.getDeltaTime() / 1000, 0.1);
    mappedTerrain?.animate(reducedMotion.matches?0:performance.now()/1000);
    if(map){
      if(hoverPoint && document.elementFromPoint(hoverPoint.x,hoverPoint.y)!==canvas)navigationLeave();
      if(document.activeElement!==canvas)panInput.clearKeys();
      pan(cameraPanPixels(panInput.direction(),canvas.clientHeight,delta));
    }
    if(map&&!freeView&&framing==="follow"&&focusBird){const target=chickens.get(focusBird)?.target;if(target)camera.target.copyFrom(target).addInPlaceFromFloats(0,.7,0);}
    currents.forEach((stroke,i)=>{stroke.position.z=reducedMotion.matches?0:Math.sin(performance.now()*.0005+i)*.12;});
    const labelPositions = {} as BirdLabels;
    const viewport = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    screenBirds.clear();
    for (const [id, bird] of chickens) {
      bird.root.position = Vector3.Lerp(
        bird.root.position,
        bird.target,
        reducedMotion.matches ? 1 : Math.min(1, delta * 12),
      );
      // The existing body hit proxy follows position, scale and elevation. Its
      // projected footprint is independent of selected-only label visibility.
      bird.hit.computeWorldMatrix(true);
      const bodyBounds=projectedBodyBounds(bird.hit.getBoundingInfo().boundingBox.vectorsWorld.map(corner=>{
        const p=Vector3.Project(corner,Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport);
        return {x:p.x*canvas.clientWidth/engine.getRenderWidth(),y:p.y*canvas.clientHeight/engine.getRenderHeight(),z:p.z};
      }),canvas.clientWidth,canvas.clientHeight);
      if(bodyBounds&&bird.root.isEnabled())screenBirds.set(id,bodyBounds);
      const worker = renderState?.birds.find((b) => b.id === id);
      const action=worker?.perch?"roost":worker?.flight?accessAction(worker):worker?.edge?(worker.cargo||worker.foodCargo?"carry":"walk"):worker?.care&&!worker?.foraging?"roost":worker?.lift||worker?.job?.kind==="build"?"weave":worker?.foraging&&worker.foraging.progress>0||worker?.job?.kind==="gather"&&worker.gatheringProgress>0?"gather":"idle";
      const pose=action+(reducedMotion.matches?"-still":"");
      if(pose!==bird.pose){
        bird.clips.forEach(g=>g.stop());
        const clip=bird.clips.find(g=>g.name===action);
        if(clip){clip.start(true);if(reducedMotion.matches){clip.goToFrame(action==="roost"?clip.to:clip.from);clip.pause();}}
        bird.pose=pose;
      }
      if (bird.clamber) poseClamberPivot(bird.clamber, worker && (worker.flight?.tree ?? worker.perch?.tree) !== "longbough" ? clamberLean(worker) : 0);
      const label = Vector3.Project(
        bird.root.position.add(new Vector3(0, habitatPresentation.selectedLabelHeight*(worker?.life.stage==="chick"?.5:worker?.life.stage==="juvenile"?.75:1), 0)),
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
    for (const landmark of [...trees,...(map?definition.pads.map(p=>({id:p.id,...p.at})):[]), { id: "reeds", ...definition.source.at },...(renderState?.patches.map(p=>({id:p.id,...p.at}))??[]),...(renderState?.forage.map(p=>({id:p.id,...p.at}))??[])]) {
      const {x:xw,z:zw}=worldPoint(landmark);
      const point = Vector3.Project(
        new Vector3(
          xw,
          elevation(xw, zw) + (landmark.id in treeScale ? (map?5:7.6)*treeScale[landmark.id as keyof typeof treeScale] : 1),
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
    for(const site of renderState?.sites??[]){
      const {x:xw,z:zw}=worldPoint(groundAccess(site.at,renderState??context));
      const point=Vector3.Project(new Vector3(xw,elevation(xw,zw)+1.25,zw),Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport);
      const x=point.x*canvas.clientWidth/engine.getRenderWidth(),y=point.y*canvas.clientHeight/engine.getRenderHeight();
      labelPositions[site.id]={x:Math.max(75,Math.min(canvas.clientWidth-75,x)),y,visible:y>60&&y<canvas.clientHeight-50};
    }
    for (const id of chickens.keys()) {
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
  const world = {
    retryAssets: loadAssets,
    focusNursery(focused:boolean){nurseryFocused=focused;revealNursery();},
    frame(mode: ClearingFraming, value=defaultClearingZoom, followId?:BirdId){
      resetNavigation();freeView=null;framing=mode;if(mode==="follow"&&followId)focusBird=followId;zoom=value;
      if(mode==="follow"&&focusBird){const target=chickens.get(focusBird)?.target;if(target)camera.target.copyFrom(target).addInPlaceFromFloats(0,.7,0);}
      resize();
    },
    zoom(value:number){zoom=value;resize();},
    targeting(active:boolean){targeting=active;},
    targets(choices:{at:Cell;status:"valid"|"partial"|"unavailable"}[]){
      const signature=JSON.stringify(choices);if(signature===targetSignature)return;targetSignature=signature;
      targetRings.forEach(r=>{r.material?.dispose();r.dispose();});targetRings=[];
      for(const [index,choice] of choices.entries()){
        const p=worldPoint(choice.at),ring=MeshBuilder.CreateTorus(`eligible-target-${index}`,{diameter:map?.7:1.4,thickness:map?.025:.05,tessellation:24},scene);
        ring.position.set(p.x,elevation(p.x,p.z)+.08,p.z);ring.isPickable=false;
        const material=new StandardMaterial(`eligible-target-material-${index}`,scene);material.diffuseColor=Color3.FromHexString(choice.status==="valid"?"#b6d58d":choice.status==="partial"?"#e0ba62":"#8a8375");material.emissiveColor=material.diffuseColor.scale(.35);material.alpha=choice.status==="unavailable"?.3:.7;ring.material=material;targetRings.push(ring);
      }
    },
    placementKeys(active:boolean){placementKeys=active;if(active)panInput.clearKeys();},
    select(id: BirdId,ids:string[]=[id]) {
      selectedBird=id;selectedIds=ids;
      selection.setEnabled(ids.includes(id));
      for(const [key,ring] of groupRings){if(!ids.includes(key)||key===id){ring.dispose();groupRings.delete(key);}}
      for(const key of ids){if(key===id||groupRings.has(key))continue;const ring=selection.clone(`selected-${key}`);ring.parent=chickens.get(key)?.root??null;ring.position.y=.035;ring.setEnabled(true);groupRings.set(key,ring);}
      selection.parent = chickens.get(id)?.root??null;
      selection.position.y = 0.035;
      if(renderState)updateCommandGuides(renderState);
    },
    update(state: Settlement) {
      renderState = state;
      updateCommandGuides(state);
      for(const [id,ring] of groupRings)ring.setEnabled(selectedIds.includes(id));
      for(const [id,bird] of chickens)if(!state.birds.some(b=>b.id===id)){if(selection.parent===bird.root)selection.parent=null;bird.clips.forEach(g=>g.dispose());bird.root.dispose();chickens.delete(id);populated.delete(id);cargoMeshes.delete(id);foodMeshes.delete(id);}
      for (const bird of state.birds) {
        const mesh = ensureBird(bird);
        const lifting=bird.lift&&state.sites.find(s=>s.id===bird.lift!.basket);
        const tree=lifting?.tree&&trees.find(t=>t.id===lifting.tree);
        let p=tree?presentedTreePosition(tree.id,habitatPosition(tree.id,habitatAnchor(tree.id,"operator-ground"),state),state):presentedBirdPosition(bird,state);
        const index = state.birds.findIndex((b) => b.id === bird.id);
        if(!map&&bird.life.stage!=="adult")p={...p,x:p.x-1.05+(index%2?-.4:.4),z:p.z-.9,y:.05};
        else if(!map&&bird.care&&!bird.edge&&!bird.foraging){p={...p,x:p.x-1.05,z:p.z-.25};}
        const idle = !bird.edge && !bird.flight && !bird.perch && !bird.foraging && !bird.lift && !bird.provision && !bird.care && bird.life.stage==="adult";
        const x = p.x + (!map&&idle ? (index % 2 === 0 ? -1.1 : 1.1) : 0),
          z = p.z + (!map&&idle ? (index < 2 ? -1.1 : 1.1) : 0);
        mesh.target.set(x, (map?0:elevation(x,z)) + p.y, z);
        const cargo=cargoMeshes.get(bird.id)!;
        if(!cargo)continue;
        cargo.setEnabled(bird.cargo>0);
        // Mapped basket sockets own orientation; imported glTF quaternions
        // otherwise override the authored Euler yaw. Preserve legacy cargo.
        if(map)cargo.rotationQuaternion=null;
        if(tree){
          cargo.parent=null;
          const at=presentedTreePosition(tree.id,cargoPosition(state,bird),state);
          cargo.position.set(at.x,(map?0:elevation(tree.x*2,tree.z*2))+at.y,at.z);
          cargo.scaling.setAll(habitatPresentation.reedBundleScale);
          cargo.rotation.set(0, treeHabitat(tree.id).hauling.cargoYawRadians ?? 0, 0);
          // The authored return-rope grip is forward (+Z) of the operator station.
          mesh.root.rotation.y=0;
        }else{
          cargo.parent=mesh.root;cargo.position.set(0,1.1,.7);cargo.scaling.setAll(bundleScale);cargo.rotation.setAll(0);
        }
        const delta = mesh.target.subtract(mesh.root.position);
        const place = bird.perch ?? bird.flight;
        const profile = place && treeHabitat(place.tree);
        const perchYaw = place && profile?.perchYawRadians?.[(place.sheltered ? profile.shelteredPerches : profile.naturalPerches)[place.slot]];
        const routeHeading = accessHeading(bird,state);
        if (!bird.lift && routeHeading !== null) mesh.root.rotation.y = routeHeading;
        else if (!bird.lift && Math.hypot(delta.x, delta.z) > 0.03)
          mesh.root.rotation.y = birdHeading(delta);
        if(typeof perchYaw === "number" && (bird.perch || (bird.flight && bird.flight.progress>.66))) {
          const weight=bird.perch?1:Math.min(1,(bird.flight!.progress-.66)/.07);
          const turn=Math.atan2(Math.sin(perchYaw-mesh.root.rotation.y),Math.cos(perchYaw-mesh.root.rotation.y));
          mesh.root.rotation.y+=turn*weight;
        }
      }
      const signature = JSON.stringify([
        state.patches.map(p=>[p.id,p.remaining,p.designated]),
        state.economy.nurseries.map(n=>[n.site,n.food,n.brood]),
        state.economy.broods.map(b=>[b.id,b.stage,b.eggs]),
        state.forage.map(p=>[p.id,p.at,p.remaining,p.open]),
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
      updateLifts(state);
      const dusk = state.phase === "evening";
      sun.intensity = dusk ? .38 : map ? 2.2 : 3.25;
      sky.intensity = dusk ? .5 : map ? .47 : .22;
      scene.clearColor = Color4.FromHexString(dusk ? "#647d95ff" : "#a9caccff");
      if (map) scene.fogColor = Color3.FromHexString(dusk ? "#647d95" : "#a9cacc");
    },
    cursor(at: Cell, show: boolean, placement = false, kind:BuildKind|null=null) {
      placementPreview(at,show?kind:null);
      const p=worldPoint(at);cursor.position.set(p.x,elevation(p.x,p.z)+.065,p.z);
      gridRoot.setEnabled(placement);
      cursor.setEnabled(show);
    },
    dispose() {
      disposed = true;
      assetRoots.forEach(root => root.dispose(false, true));
      observer.disconnect();
      resetNavigation();
      window.removeEventListener("pointerdown",globalPointerDown,true);
      window.removeEventListener("pointermove",navigationMove,true);
      window.removeEventListener("pointerup",navigationUp,true);
      window.removeEventListener("pointercancel",resetNavigation,true);
      window.removeEventListener("blur",resetNavigation);
      document.removeEventListener("visibilitychange",resetNavigation);
      window.removeEventListener("keyup",navigationKeyUp);
      canvas.removeEventListener("pointerleave",navigationLeave);
      canvas.removeEventListener("lostpointercapture",lostCapture);
      canvas.removeEventListener("keydown",navigationKey);
      canvas.removeEventListener("focusout",navigationFocusOut);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      scene.dispose();
      engine.dispose();
    },
  };
  return world;
}
