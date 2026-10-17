import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
const ids = ['birch','willow','bush-a','bush-b','bush-c','grass','cattails','rock-a','rock-b'];
const limits = {birch:6000,willow:16000,'bush-a':3000,'bush-b':3000,'bush-c':3000,grass:400,cattails:1400,'rock-a':80,'rock-b':80};
function load(id) {
  const data=readFileSync(new URL(`../../../public/assets/environment/dressing-${id}.glb`,import.meta.url));
  expect(data.toString('ascii',0,4)).toBe('glTF');expect(data.readUInt32LE(8)).toBe(data.length);
  const length=data.readUInt32LE(12),doc=JSON.parse(data.subarray(20,20+length)),bin=data.subarray(28+length);
  const values=id=>{
    const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type];
    const [size,reader]={5126:[4,'readFloatLE'],5125:[4,'readUInt32LE'],5123:[2,'readUInt16LE'],5121:[1,'readUInt8']}[a.componentType];
    return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>bin[reader]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*size)+j*size)));
  };
  return {doc,values};
}
for(const id of ids)test(`dressing-${id}: static grounded rough PBR geometry within triangle budget`,()=>{
  const {doc,values}=load(id);expect(doc.animations).toBeUndefined();expect(doc.textures).toBeUndefined();
  expect(doc.nodes.some(n=>n.name==='asset')).toBe(true);expect(doc.nodes.some(n=>n.name?.startsWith('STUDIO'))).toBe(false);
  expect(doc.materials.length).toBeLessThanOrEqual(2);
  for(const m of doc.materials){expect(m.alphaMode||'OPAQUE').toBe('OPAQUE');expect(m.pbrMetallicRoughness.roughnessFactor).toBeGreaterThanOrEqual(.85);}
  let triangles=0,minY=Infinity;
  for(const m of doc.meshes)for(const p of m.primitives){
    expect(p.attributes.COLOR_0).toBeDefined();const pos=values(p.attributes.POSITION),norm=values(p.attributes.NORMAL),idx=values(p.indices).flat();
    expect(pos.flat().every(Number.isFinite)).toBe(true);expect(idx.every(i=>i>=0&&i<pos.length)).toBe(true);
    expect(norm.every(n=>Math.abs(Math.hypot(...n)-1)<.002)).toBe(true);
    minY=Math.min(minY,...pos.map(p=>p[1]));triangles+=idx.length/3;
  }
  expect(minY).toBeCloseTo(0,6);expect(triangles).toBeLessThanOrEqual(limits[id]);
});
for(const id of ['rock-a','rock-b'])test(`dressing-${id}: outward handedness of closed mineral planes`,()=>{
  // X/Y-up/Z is right handed. Rings advance toward +Z; their original ordering
  // generated inside-out faces. Positive signed volume guards that exact defect.
  const {doc,values}=load(id);let volume=0;
  for(const m of doc.meshes)for(const p of m.primitives){
    const points=values(p.attributes.POSITION),idx=values(p.indices).flat();
    for(let i=0;i<idx.length;i+=3){const [a,b,c]=idx.slice(i,i+3).map(j=>points[j]);volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}
  }
  expect(volume).toBeGreaterThan(.25);
});
