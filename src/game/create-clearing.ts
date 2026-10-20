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
import type { Settlement, Cell, Worker } from "../simulation/settlement";
import { cost, validCell, cargoPosition, groundAccess } from "../simulation/settlement";
import { habitatAnchor, habitatPosition, treeHabitat, habitatPresentation } from "../content/tree-habitats";
import { settlers, trees } from "../content/settlement";
import { treeScale, presentedBirdPosition, presentedTreePosition, carriedBundleScale, birdHeading } from "./tree-presentation";
import type { Appearance, TreeId, SettlerId as BirdId } from "../content/settlement";

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
  onTree: (id: TreeId) => void,
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
    const halfHeight = Math.max(10.8,10.8/aspect);
    camera.orthoTop=halfHeight;camera.orthoBottom=-halfHeight;
    camera.orthoLeft=-halfHeight*aspect;camera.orthoRight=halfHeight*aspect;
  };
  camera.setTarget(new Vector3(-.6,4.5,.5),false,false,true);
  const sky = new HemisphericLight("soft-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.65;
  sky.groundColor = Color3.FromHexString("#425c70");
  sky.diffuse=Color3.FromHexString("#a8cbee");
  const sun = new DirectionalLight(
    "evening-sun",
    new Vector3(-0.6, -1, 0.45),
    scene,
  );
  sun.position = new Vector3(15, 25, -15);
  sun.intensity = 0.8;
  sun.diffuse = Color3.FromHexString("#fff0cf");
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
  function controller(id: BirdId) {
    const root = new TransformNode(id, scene);
    root.position.set(-6, .18, -4);
    root.scaling.setAll(habitatPresentation.adultScale);
    const body = new TransformNode(`${id}-body`, scene);
    body.parent = root;
    const head = new TransformNode(`${id}-head`, scene);
    head.parent = body;
    const wing = new TransformNode(`${id}-wing`, scene);
    wing.parent = body;
    const hit=MeshBuilder.CreateSphere(`${id}-hit`,{diameter:habitatPresentation.birdPickDiameter*1.25/habitatPresentation.adultScale,segments:8},scene);
    hit.parent=root;hit.position.y=.32/habitatPresentation.adultScale;
    hit.visibility=0;hit.metadata={birdId:id,birdHitProxy:true};
    const value={ root, body, head, wing, target: root.position.clone(),clips:[],pose:"" };
    chickens.set(id,value);
    return value;
  }
  for(const person of settlers)controller(person.id);
  const appearances=new Map<Appearance,{root:Mesh;clips:AnimationGroup[]}>();
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
        ...["sleeping-deck","hauling-basket","reed-bundle","woven-home","woven-store","understory","reed-clump","dressing-birch","dressing-willow","dressing-bush-a","dressing-bush-b","dressing-bush-c","dressing-grass","dressing-cattails","dressing-rock-a","dressing-rock-b"].map(id=>({path:`environment/${id}.glb`,tree:null,bird:null,template:id})),
      ];
      for (const task of tasks) {
        const imported = await ImportMeshAsync(`/assets/${task.path}`, scene);
        const root = imported.meshes[0];
        if (disposed) { root.dispose(false, true); return; }
        root.setEnabled(false);
        staged.push(root);
        // Trees and the additions declare +X tree-local sockets. Babylon's default glTF
        // conversion mirrors X; compensate once at their presentation root.
          if(task.tree || task.template === "sleeping-deck" || task.template === "hauling-basket")root.scaling.x *= -1;
        if(task.template)templates.set(task.template,root as Mesh);
        if(task.tree){
          const locations=task.tree.id === "lowfork" ? [[-11,5,.6],[-12,10,.64],[-8,12,.55],[-5,15,.48]] : task.tree.id === "splitcrown" ? [[-11,8,.4]] : [[-14,3,.36]];
          for(const [x,z,scale] of locations){const copy=root.clone(`${task.tree.id}-woodland`,null)!;copy.position.set(x,elevation(x,z),z);copy.scaling.scaleInPlace(scale);copy.rotation.y=(x+z)*.13;copy.getChildMeshes().forEach(m=>{m.isPickable=false;});copy.setEnabled(false);staged.push(copy);}
        }
        if (task.tree) {
          for (const mesh of root.getChildMeshes()) mesh.metadata = { treeId: task.tree.id };
          root.position.set(task.tree.x*2, elevation(task.tree.x*2, task.tree.z*2), task.tree.z*2); root.scaling.scaleInPlace(treeScale[task.tree.id]); }
        if (task.bird) {
          const controller = chickens.get(task.bird.id)!;
          root.parent = controller.root;
          const nodes = [...imported.transformNodes, ...imported.meshes];
          controller.body = nodes.find(n => n.name === "body")!;
          controller.head = nodes.find(n => n.name === "head")!;
          controller.wing = nodes.find(n => n.name === "wing")!;
          imported.animationGroups.forEach(g=>g.stop());
          controller.clips=imported.animationGroups;controller.pose="";
          appearances.set(task.bird.id,{root:root as Mesh,clips:imported.animationGroups});
          for (const mesh of root.getChildMeshes()) mesh.metadata = { birdId: task.bird.id };
        }
        for (const mesh of root.getChildMeshes()) { shadows.addShadowCaster(mesh); mesh.receiveShadows = true; }
      }
      if (!disposed) {
        scene.environmentTexture?.dispose();
        scene.environmentTexture = environment;
        scene.environmentIntensity = .28;
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
        const bundle=templates.get("reed-bundle")!;
        for(const [id,bird] of chickens){
          cargoMeshes.get(id)?.dispose();
          const carried=bundle.clone(`${id}-carried-reeds`,bird.root)!;
          carried.position.set(0,1.1,.7);carried.scaling.setAll(carriedBundleScale);
          carried.setEnabled((renderState?.birds.find(b=>b.id===id)?.cargo??0)>0);
          carried.getChildMeshes().forEach(m=>{m.isPickable=false;shadows.addShadowCaster(m);});
          cargoMeshes.set(id,carried);
        }
        layoutSignature="";
        if(renderState){
          // A paused import may have published dynamic controllers before assets
          // arrived. Populate them now; waiting for another tick hides the young.
          renderState.birds.forEach(ensureBird);
          rebuild(renderState);
        }
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
    { diameter: 2.1, thickness: 0.075, tessellation: 32 },
    scene,
  );
  selection.material = material("selection-ochre", "#e9cd87");
  selection.isPickable=false;
  selection.parent = chickens.get("fern")!.root;
  selection.position.y = 0.035;
  let selectedBird: BirdId = "fern";
  let renderState: Settlement | null = null;
  let layoutSignature = "";
  const cargoMat = material("reed-bundles", "#d9bb69");
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
        copy.getChildMeshes().forEach(mesh=>{mesh.metadata={birdId:worker.id};shadows.addShadowCaster(mesh);mesh.receiveShadows=true;});
        // Dependent young inherit the named parent's appearance, with restrained comb/tail.
        copy.getDescendants().filter(n=>/comb|tail/i.test(n.name)).forEach(node=>{
          if(node instanceof TransformNode){node.metadata={...node.metadata,youngScale:node.scaling.clone()};}
        });
      }
    if(!cargoMeshes.has(worker.id)){
      const bundle=templates.get("reed-bundle")?.clone(`${worker.id}-carried-reeds`,bird.root);
      if(bundle){bundle.scaling.setAll(carriedBundleScale);bundle.setEnabled(false);cargoMeshes.set(worker.id,bundle);}
    }
    const scale=worker.life.stage==="chick"?.44:worker.life.stage==="juvenile"?.7:1;
    bird.root.scaling.setAll(habitatPresentation.adultScale*scale);
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
      rig.rope.scaling.y=(haul.ropeRestLength-haul.travelY*progress)/haul.ropeRestLength;
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
      const x=patch.at.x*2,z=patch.at.z*2;
      const count=2+Math.ceil(4*patch.remaining/patch.capacity);
      for(let i=0;i<count;i++){
        const a=i*2.39996,xx=x+Math.cos(a)*(.3+i*.1),zz=z+Math.sin(a)*(.3+i*.1);
        const clump=model(patch.id==="leaf-litter"?"dressing-bush-b":"dressing-grass",xx,elevation(xx,zz),zz,patch.id==="leaf-litter"?.22:.5);
        if(clump)clump.rotation.y=a;
      }
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
      } else if(site.kind === "nursery") {
        const court=groundAccess(site.at), nx=court.x*2-1.05,nz=court.z*2+.55,ny=elevation(nx,nz);
        model("woven-store",nx,ny,nz,.85);
        if(site.complete){
          // Reuse the authored bundled-reed roof and twig supports, with its
          // open front facing the care court. No smooth dome or new art export.
          const hood=model("woven-home",nx,ny-1,nz+.3);
          if(hood){
            hood.name="root-nursery-reed-rainhood";
            hood.scaling.set(.72,.5,1.4);
            for(const mesh of hood.getChildMeshes())mesh.setEnabled(mesh.name.toLowerCase().includes("rainhood"));
          }
          const nest=model("woven-store",nx,ny+.04,nz-.58);
          if(nest){nest.name="root-nursery-egg-nest";nest.scaling.set(.2,.1,.2);}
          const nursery=state.economy.nurseries.find(n=>n.site===site.id);
          for(const [type,count] of Object.entries(nursery?.food??{}))for(let i=0;i<count;i++){
            const food=MeshBuilder.CreateSphere("nursery-food",{diameter:.12,segments:4},scene);food.position.set(nx+(type==="staple"?-.55:.55)+(i%2)*.11,ny+.13,nz-.35+Math.floor(i/2)*.1);food.material=type==="staple"?stapleMat:proteinMat;food.isPickable=false;builtMeshes.push(food);
          }
          const brood=state.economy.broods.find(b=>b.id===nursery?.brood);
          for(const [i,egg] of (brood?.eggs??[]).entries())if(egg.viable&&!egg.child){
            const mesh=MeshBuilder.CreateSphere(egg.id,{diameter:.08,segments:8},scene);mesh.scaling.y=1.3;mesh.position.set(nx-.045+i*.09,ny+.105,nz-.58+(i%2)*.02);mesh.material=eggMat;mesh.isPickable=false;builtMeshes.push(mesh);
          }
        }else bundles(nx,nz,site.delivered);
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
    updateLifts(state);
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
    // Prioritize the small bird's dedicated hit proxy, including through foliage.
    // Accessible named controls remain available when a tree hides its occupant.
    const birdPick=scene.pick(x,y,m=>!!m.metadata?.birdHitProxy);
    const pick=birdPick?.hit?birdPick:scene.pick(x,y),id=pick?.pickedMesh?.metadata?.birdId as BirdId|undefined;
    if(id){onSelect(id);return;}
    const treeId=pick?.pickedMesh?.metadata?.treeId as TreeId|undefined;
    if(treeId){onTree(treeId);return;}
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
      const action=worker?.perch?"roost":worker?.flight?(worker.flight.sheltered?"walk":"flight"):worker?.edge?(worker.cargo||worker.foodCargo?"carry":"walk"):worker?.care&&!worker?.foraging?"roost":worker?.lift||worker?.job?.kind==="build"?"weave":worker?.foraging&&worker.foraging.progress>0||worker?.job?.kind==="gather"&&worker.gatheringProgress>0?"gather":"idle";
      const pose=action+(reducedMotion.matches?"-still":"");
      if(pose!==bird.pose){
        bird.clips.forEach(g=>g.stop());
        const clip=bird.clips.find(g=>g.name===action);
        if(clip){clip.start(true);if(reducedMotion.matches){clip.goToFrame(action==="roost"?clip.to:clip.from);clip.pause();}}
        bird.pose=pose;
      }
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
    for (const landmark of [...trees, { id: "reeds", x: -3, z: -2 },...(renderState?.patches.map(p=>({id:p.id,...p.at}))??[]),...(renderState?.forage.map(p=>({id:p.id,...p.at}))??[])]) {
      const xw = landmark.x * 2,
        zw = landmark.z * 2;
      const point = Vector3.Project(
        new Vector3(
          xw,
          elevation(xw, zw) + (landmark.id in treeScale ? 7.6*treeScale[landmark.id as keyof typeof treeScale] : 1),
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
  return {
    retryAssets: loadAssets,
    select(id: BirdId) {
      selectedBird=id;
      selection.parent = chickens.get(id)?.root??null;
      selection.position.y = 0.035;
    },
    update(state: Settlement) {
      renderState = state;
      for(const [id,bird] of chickens)if(!state.birds.some(b=>b.id===id)){if(selection.parent===bird.root)selection.parent=null;bird.clips.forEach(g=>g.dispose());bird.root.dispose();chickens.delete(id);populated.delete(id);cargoMeshes.delete(id);foodMeshes.delete(id);}
      for (const bird of state.birds) {
        const mesh = ensureBird(bird);
        const lifting=bird.lift&&state.sites.find(s=>s.id===bird.lift!.basket);
        const tree=lifting?.tree&&trees.find(t=>t.id===lifting.tree);
        let p=tree?presentedTreePosition(tree.id,habitatPosition(tree.id,habitatAnchor(tree.id,"operator-ground"))):presentedBirdPosition(bird);
        const index = state.birds.findIndex((b) => b.id === bird.id);
        if(bird.life.stage!=="adult")p={...p,x:p.x-1.05+(index%2?-.4:.4),z:p.z-.9,y:.05};
        else if(bird.care&&!bird.edge&&!bird.foraging){p={...p,x:p.x-1.05,z:p.z-.25};}
        const idle = !bird.edge && !bird.flight && !bird.perch && !bird.foraging && !bird.lift && !bird.provision && !bird.care && bird.life.stage==="adult";
        const x = p.x + (idle ? (index % 2 === 0 ? -1.1 : 1.1) : 0),
          z = p.z + (idle ? (index < 2 ? -1.1 : 1.1) : 0);
        mesh.target.set(x, elevation(x, z) + p.y, z);
        const cargo=cargoMeshes.get(bird.id)!;
        if(!cargo)continue;
        cargo.setEnabled(bird.cargo>0);
        if(tree){
          cargo.parent=null;
          const at=presentedTreePosition(tree.id,cargoPosition(state,bird));
          cargo.position.set(at.x,elevation(tree.x*2,tree.z*2)+at.y,at.z);
          cargo.scaling.setAll(habitatPresentation.reedBundleScale);
          cargo.rotation.setAll(0);
          // The authored return-rope grip is forward (+Z) of the operator station.
          mesh.root.rotation.y=0;
        }else{
          cargo.parent=mesh.root;cargo.position.set(0,1.1,.7);cargo.scaling.setAll(carriedBundleScale);cargo.rotation.setAll(0);
        }
        const delta = mesh.target.subtract(mesh.root.position);
        if (!bird.lift && Math.hypot(delta.x, delta.z) > 0.03)
          mesh.root.rotation.y = birdHeading(delta);
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
      sun.intensity = dusk ? 0.38 : 3.25;
      sky.intensity = dusk ? .5 : .22;
      scene.clearColor = Color4.FromHexString(dusk ? "#647d95ff" : "#a9caccff");
    },
    cursor(at: Cell, show: boolean, placement = false) {
      cursor.position.set(
        at.x * 2,
        elevation(at.x * 2, at.z * 2) + 0.065,
        at.z * 2,
      );
      gridRoot.setEnabled(placement);
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
