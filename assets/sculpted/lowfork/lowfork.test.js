import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,test} from 'vitest';

const report=JSON.parse(readFileSync(new URL('./qualification.json',import.meta.url)));
const habitat=JSON.parse(readFileSync(new URL('../../../src/content/tree-habitats.json',import.meta.url))).profiles['canopy-proof'];
const bytes=readFileSync(new URL('../../../public/assets/environment/lowfork.glb',import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
const hash=data=>createHash('sha256').update(data).digest('hex');

describe('Lowfork anatomical asset qualification',()=>{
  test('physical qualification belongs to the shipped export and preserved home',()=>{
    expect(hash(bytes)).toBe(report.sha256);expect(bytes.length).toBe(report.bytes);
    expect(hash(readFileSync(new URL('../../../public/assets/environment/woven-home.glb',import.meta.url)))).toBe(report.home.sha256);
    for(const name of ['lowfork','woven-home'])expect(hash(readFileSync(new URL(`../environment/${name}.blend`,import.meta.url)))).toBe(report.sourceHashes[name]);
    expect(report.ready).toBe(true);
    expect(Object.values(report.checks).every(Boolean)).toBe(true);
    for(const name of ['deck','ladder'])expect(report.home.geometryAfter[name]).toBe(report.home.geometryBefore[name]);
  });
  test('all six saved perches remain explicit tree-local metre sockets',()=>{
    for(const name of [...habitat.naturalPerches,...habitat.shelteredPerches]){
      const node=gltf.nodes.find(node=>node.name===name);expect(node).toBeDefined();
      node.translation.forEach((n,i)=>expect(n).toBeCloseTo(habitat.anchors[name][i],5));
    }
    expect(gltf.nodes.filter(node=>node.mesh!==undefined)).toHaveLength(3);
    expect(gltf.animations||[]).toHaveLength(0);
  });
  test('actual branch support and adult headroom accompany clear full cargo travel',()=>{
    for(const support of Object.values(report.naturalSupport)){
      expect(support.topY).not.toBeNull();expect(support.footGap).toBeGreaterThanOrEqual(-.025);expect(support.footGap).toBeLessThanOrEqual(.08);
    }
    expect(Object.values(report.collisions).every(count=>count===0)).toBe(true);
    const [lo,hi]=report.clearanceVolumes['basket-sweep-with-10cm-margin'];
    expect(lo[1]).toBeLessThan(habitat.anchors['basket-ground'][1]);
    expect(hi[1]).toBeGreaterThan(habitat.anchors['basket-landing'][1]+.9);
    for(const name of [...habitat.naturalPerches,...habitat.shelteredPerches]){
      expect(report.clearanceVolumes[name+'-body'][1][1]-habitat.anchors[name][1]).toBeCloseTo(1.33);
    }
  });
  test('runtime bark correction changes shading while preserving every triangle position',()=>{
    expect(report.geometryPreservation.current).toEqual(report.geometryPreservation.baseline);
    expect(report.woodNormalPlanes.triangles).toBeGreaterThan(10000);
    expect(report.woodNormalPlanes.equivalentCornerNormalTriangles).toBe(report.woodNormalPlanes.triangles);
    expect(report.woodNormalPlanes.maxCornerNormalDeviation).toBeLessThan(.01);
  });
});
