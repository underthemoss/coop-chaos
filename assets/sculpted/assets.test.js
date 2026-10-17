import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

function read(path) {
  const bytes = readFileSync(new URL(`../../public/assets/${path}.glb`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const bin = bytes.subarray(28 + length);
  const values = id => {
    const a = gltf.accessors[id], view = gltf.bufferViews[a.bufferView];
    const components = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 }[a.type];
    const [size, reader] = {5126:[4,'readFloatLE'],5125:[4,'readUInt32LE'],5123:[2,'readUInt16LE'],5121:[1,'readUInt8']}[a.componentType];
    return Array.from({length:a.count*components},(_,i)=>bin[reader]((view.byteOffset||0)+(a.byteOffset||0)+Math.floor(i/components)*(view.byteStride||components*size)+(i%components)*size));
  };
  return {gltf,values};
}
const birds = ['fern','rook','dapple','wren'];
const environment = ['lowfork','splitcrown','reedside','reed-bundle','woven-home','woven-store','understory','reed-clump'];
describe('shipped Blender asset contracts',()=>{
  for(const name of [...birds,...environment]) test(`${name}: reachable finite indexed geometry, normals and embedded resources`,()=>{
    const {gltf,values}=read(`${birds.includes(name)?'characters':'environment'}/${name}`);
    expect(gltf.buffers.every(b=>!b.uri)).toBe(true);
    expect((gltf.images||[]).every(i=>!i.uri)).toBe(true);
    const reached=new Set();
    const visit=id=>{expect(reached.has(id)).toBe(false);reached.add(id);(gltf.nodes[id].children||[]).forEach(visit);};
    gltf.scenes[gltf.scene].nodes.forEach(visit);
    expect(reached.size).toBe(gltf.nodes.length);
    expect(gltf.nodes.some(n=>n.name?.startsWith('STUDIO'))).toBe(false);
    for(const mesh of gltf.meshes)for(const p of mesh.primitives){
      const positions=values(p.attributes.POSITION),normals=values(p.attributes.NORMAL),indices=values(p.indices);
      expect(positions.length).toBe(normals.length);
      expect(positions.length%3).toBe(0);
      expect(positions.every(Number.isFinite)).toBe(true);
      expect(normals.every(Number.isFinite)).toBe(true);
      expect(indices.length%3).toBe(0);
      expect(indices.every(i=>Number.isInteger(i)&&i>=0&&i<positions.length/3)).toBe(true);
      for(let i=0;i<normals.length;i+=3)expect(Math.hypot(...normals.slice(i,i+3))).toBeCloseTo(1,3);
    }
  });
  for(const id of birds)test(`${id}: authored task clips preserve all articulation channels`,()=>{
    const {gltf}=read(`characters/${id}`);
    const articulations=['body','head','wing','far-wing','leg-left','leg-right'];
    for(const name of articulations)expect(gltf.nodes.some(n=>n.name===name)).toBe(true);
    expect(gltf.animations.map(a=>a.name).sort()).toEqual(['idle','walk','gather','carry','weave','flight'].sort());
    for(const clip of gltf.animations){
      const targets=clip.channels.map(c=>`${gltf.nodes[c.target.node].name}:${c.target.path}`);
      expect(targets.sort()).toEqual(articulations.flatMap(n=>['translation','rotation','scale'].map(p=>`${n}:${p}`)).sort());
    }
  });
  for(const id of ['lowfork','splitcrown','reedside'])test(`${id}: stable roost and access attachment coordinates`,()=>{
    const {gltf}=read(`environment/${id}`);
    for(const [name,at] of Object.entries({'natural-perch-0':[-.86,3.15,.46],'natural-perch-1':[.86,3.33,.46],'sheltered-deck':[0,2.25,-.5],'ladder-base':[0,0,-1.08]})){
      const actual=gltf.nodes.find(n=>n.name===name)?.translation;
      expect(actual).toBeDefined();actual.forEach((v,i)=>expect(v).toBeCloseTo(at[i],4));
    }
  });
});
