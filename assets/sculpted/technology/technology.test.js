import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,test,expect} from 'vitest';
const habitat=JSON.parse(readFileSync(new URL('../../../src/content/tree-habitats.json',import.meta.url))).profiles['canopy-proof'];
const anchors=habitat.anchors;
const contract=JSON.parse(readFileSync(new URL('./contract.json',import.meta.url)));
function read(name){
  const bytes=readFileSync(new URL(`../../../public/assets/environment/${name}.glb`,import.meta.url));
  expect(bytes.length).toBe(contract.exports[name].bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(contract.exports[name].sha256);
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);expect(bytes.readUInt32LE(4)).toBe(2);expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
  const values=id=>{const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];const [size,reader]={5126:[4,'readFloatLE'],5125:[4,'readUInt32LE'],5123:[2,'readUInt16LE']}[a.componentType];return Array.from({length:a.count*n},(_,i)=>bin[reader]((v.byteOffset||0)+(a.byteOffset||0)+Math.floor(i/n)*(v.byteStride||n*size)+i%n*size));};
  const node=name=>gltf.nodes.find(n=>n.name===name);
  return {gltf,values,node};
}
function at(node,expected){expect(node).toBeDefined();const actual=node.translation||[0,0,0];expected.forEach((n,i)=>expect(actual[i]).toBeCloseTo(n,5));}
describe('canopy technology authored assets',()=>{
  for(const name of ['sleeping-deck','hauling-basket'])test(`${name}: embedded PBR, finite normals, indexed nondegenerate topology, clean scene`,()=>{
    const {gltf,values,node}=read(name);
    at(node('asset'),[0,0,0]);expect(gltf.animations||[]).toHaveLength(0);
    expect(gltf.buffers.every(b=>!b.uri)).toBe(true);expect((gltf.images||[]).every(i=>!i.uri)).toBe(true);
    expect(gltf.nodes.some(n=>/STUDIO|Camera|Light/.test(n.name))).toBe(false);
    const reached=new Set();const visit=i=>{expect(reached.has(i)).toBe(false);reached.add(i);(gltf.nodes[i].children||[]).forEach(visit);};gltf.scenes[gltf.scene].nodes.forEach(visit);expect(reached.size).toBe(gltf.nodes.length);
    for(const m of gltf.materials){expect(m.pbrMetallicRoughness).toBeDefined();expect(m.pbrMetallicRoughness.baseColorFactor.every(Number.isFinite)).toBe(true);expect(m.pbrMetallicRoughness.roughnessFactor).toBeGreaterThan(.8);}
    for(const mesh of gltf.meshes)for(const p of mesh.primitives){
      const pos=values(p.attributes.POSITION),norm=values(p.attributes.NORMAL),idx=values(p.indices);
      expect(pos.every(Number.isFinite)).toBe(true);expect(norm.every(Number.isFinite)).toBe(true);expect(idx.length%3).toBe(0);expect(pos.length).toBe(norm.length);
      let minArea=Infinity,maxNormalDeviation=0;
      for(let i=0;i<norm.length;i+=3)maxNormalDeviation=Math.max(maxNormalDeviation,Math.abs(Math.hypot(...norm.slice(i,i+3))-1));
      expect(maxNormalDeviation).toBeLessThan(.0005);
      for(let i=0;i<idx.length;i+=3){
        const [a,b,c]=idx.slice(i,i+3);expect(Math.max(a,b,c)).toBeLessThan(pos.length/3);
        const u=[0,1,2].map(j=>pos[b*3+j]-pos[a*3+j]),v=[0,1,2].map(j=>pos[c*3+j]-pos[a*3+j]);
        minArea=Math.min(minArea,Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2);
      }
      expect(minArea).toBeGreaterThan(1e-9);
    }
  });
  test('additional named berths preserve tree-local metre positions',()=>{
    const {gltf,node}=read('sleeping-deck');["sheltered-perch-2","sheltered-perch-3","home-edge","ramp-middle","deck-entry"].forEach(name=>at(node(name),anchors[name]));
    expect(node('sleeping-deck')).toBeDefined();expect(node('sleeping-rainhood')).toBeDefined();
    // The inspection studio may contain birds; the shipped addition contains
    // only its two structural mesh groups and the canonical attachment sockets.
    expect(gltf.nodes.filter(n=>n.mesh!==undefined).map(n=>n.name).sort()).toEqual(['sleeping-deck-weave','sleeping-rainhood-weave']);
  });
  test('basket and cargo move together and rope meets its bridle throughout the saved lift range',()=>{
    const {gltf,node}=read('hauling-basket'),h={...habitat.hauling,basketBase:anchors['basket-ground'],ropeTop:anchors['lift-rope'],cargoSocket:anchors['cargo-socket']},basket=node('basket'),cargo=node('cargo-socket');
    at(basket,anchors["basket-ground"]);at(cargo,anchors["cargo-socket"]);expect(basket.children).toContain(gltf.nodes.indexOf(cargo));
    at(node('basket-ground'),h.basketBase);at(node('basket-landing'),[h.basketBase[0],h.basketBase[1]+h.travelY,h.basketBase[2]]);
    at(node('lift-rope'),h.ropeTop);at(node('operator-ground'),anchors['operator-ground']);
    const childNames=(basket.children||[]).map(i=>gltf.nodes[i].name);expect(childNames).toContain('hauling-basket-weave');expect(childNames).not.toContain('hauling-frame');
    for(const progress of [0,.25,.5,.75,1]){
      const ropeScale=(h.ropeRestLength-h.travelY*progress)/h.ropeRestLength;
      expect(ropeScale).toBeGreaterThan(0);
      const ropeEnd=h.ropeTop[1]-h.ropeRestLength*ropeScale;
      expect(ropeEnd).toBeCloseTo(h.basketBase[1]+h.travelY*progress+h.bridleAboveBasket,5);
      const cargoY=h.basketBase[1]+h.travelY*progress+h.cargoSocket[1];expect(cargoY).toBeCloseTo(.34+2.10*progress,5);
    }
  });
});
