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
const habitat=JSON.parse(readFileSync(new URL('../../src/content/tree-habitats.json',import.meta.url)));
const anchors=habitat.profiles['canopy-proof'].anchors;
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
      let maxNormalLengthDeviation=0;
      for(let i=0;i<normals.length;i+=3){
        maxNormalLengthDeviation=Math.max(maxNormalLengthDeviation,Math.abs(Math.hypot(normals[i],normals[i+1],normals[i+2])-1));
      }
      // Same tolerance as toBeCloseTo(1,3), with one assertion per primitive.
      expect(maxNormalLengthDeviation).toBeLessThan(0.0005);
    }
  });
  for(const id of birds)test(`${id}: authored task clips preserve all articulation channels`,()=>{
    const {gltf,values}=read(`characters/${id}`);
    const articulations=['body','head','wing','far-wing','leg-left','leg-right'];
    for(const name of articulations)expect(gltf.nodes.some(n=>n.name===name)).toBe(true);
    expect(gltf.animations.map(a=>a.name).sort()).toEqual(['idle','walk','gather','carry','weave','flight','roost'].sort());
    for(const clip of gltf.animations){
      const targets=clip.channels.map(c=>`${gltf.nodes[c.target.node].name}:${c.target.path}`);
      expect(targets.sort()).toEqual(articulations.flatMap(n=>['translation','rotation','scale'].map(p=>`${n}:${p}`)).sort());
      // Root movement belongs to the simulation; gestures only own articulation.
      expect(clip.channels.some(c=>gltf.nodes[c.target.node].name==='asset')).toBe(false);
      // No exporter pre-roll or loop pop: frame zero is an authored, grounded pose.
      for(const sampler of clip.samplers){
        expect(values(sampler.input)[0]).toBe(0);
        const samples=values(sampler.output),size=gltf.accessors[sampler.output].type==='VEC4'?4:3;
        for(let i=0;i<size;i++)expect(samples[i]).toBeCloseTo(samples[samples.length-size+i],5);
      }
      if(clip.name!=='roost')expect(clip.samplers.some(s=>{
        const samples=values(s.output),size=gltf.accessors[s.output].type==='VEC4'?4:3;
        return samples.some((v,i)=>Math.abs(v-samples[i%size])>1e-4);
      })).toBe(true);
    }
  });
  for(const id of ['lowfork','splitcrown','reedside'])test(`${id}: stable roost and access attachment coordinates`,()=>{
    const {gltf}=read(`environment/${id}`);
    for(const [name,at] of Object.entries(anchors).filter(([name])=>['natural-perch-0','natural-perch-1','sheltered-deck','ladder-base'].includes(name))){
      const actual=gltf.nodes.find(n=>n.name===name)?.translation;
      expect(actual).toBeDefined();actual.forEach((v,i)=>expect(v).toBeCloseTo(at[i],4));
    }
  });
});

test('local prefiltered environment has finite irradiance and all embedded mip faces',async()=>{
  const {GetEnvInfo}=await import('@babylonjs/core/Misc/environmentTextureTools.js');
  const bytes=readFileSync(new URL('../../public/assets/materials/warm-neutral-sky.env',import.meta.url));
  const info=GetEnvInfo(new Uint8Array(bytes));
  expect(info.width).toBe(128);
  expect(Object.values(info.irradiance).flat().every(Number.isFinite)).toBe(true);
  expect(info.specular.mipmaps).toHaveLength(6*(Math.log2(info.width)+1));
  for(const face of info.specular.mipmaps){
    const start=info.binaryDataPosition+face.position;
    expect(face.length).toBeGreaterThan(8);
    expect(start+face.length).toBeLessThanOrEqual(bytes.length);
    expect([...bytes.subarray(start,start+8)]).toEqual([137,80,78,71,13,10,26,10]);
  }
});
