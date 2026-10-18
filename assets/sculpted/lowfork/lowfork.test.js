import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,test} from 'vitest';

const root=new URL('../../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const report=JSON.parse(read('assets/sculpted/trees/qualification.json'));
const habitat=JSON.parse(read('src/content/tree-habitats.json'));
const hash=data=>createHash('sha256').update(data).digest('hex');

describe('True metre tree artifact qualification',()=>{
  for(const name of ['lowfork','splitcrown','reedside']){
    test(`${name}: shipped GLB and editable source match qualified geometry`,()=>{
      const t=report.trees[name];const bytes=read(`public/assets/environment/${name}.glb`);
      expect(hash(bytes)).toBe(t.sha256);expect(bytes.length).toBe(t.bytes);
      expect(hash(read(`assets/sculpted/environment/${name}.blend`))).toBe(t.sourceSha256);
      expect(t.ready).toBe(true);expect(Object.values(t.checks).every(Boolean)).toBe(true);
      expect(t.triangles).toBeLessThanOrEqual(45000);
      expect(t.primitives).toBeLessThanOrEqual(3);
      const g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
      const profile=habitat.profiles['canopy-proof'];
      for(const key of [...profile.naturalPerches,...profile.shelteredPerches,'sheltered-deck','ladder-base']){
        const node=g.nodes.find(n=>n.name===key);expect(node).toBeDefined();
        node.translation.forEach((v,i)=>expect(v).toBeCloseTo(profile.anchors[key][i],5));
      }
      expect(Object.values(t.collisions).every(v=>v===0)).toBe(true);
      for(const support of Object.values(t.naturalSupport)){
        expect(support.footGap).toBeGreaterThanOrEqual(-.025);expect(support.footGap).toBeLessThanOrEqual(.08);
      }
    });
  }
  test('source recipe, metre scale and adult envelopes belong to this qualification',()=>{
    expect(report.habitatRevision).toBe(habitat.revision);expect(report.adultScale).toBe(habitat.presentation.adultScale);
    for(const [path,digest] of Object.entries(report.sourceRecipeHashes))expect(hash(read(path))).toBe(digest);
    expect(report.ready).toBe(true);
  });
  test('24-resident cutaway is explicitly a packing study with actual meshes',()=>{
    const study=JSON.parse(read('assets/sculpted/trees/mature-study.json'));
    expect(study.studyOnly).toBe(true);expect(study.implementedPopulationGrowth).toBe(false);
    expect(study.occupants).toHaveLength(24);expect(study.households).toHaveLength(4);
    expect(Object.values(study.checks).every(Boolean)).toBe(true);
    expect(Object.values(report.trees.lowfork.futureRoomClearances).every(v=>v.clear)).toBe(true);
    expect(Object.values(report.trees.lowfork.futureTurningClearances).every(v=>v.clear)).toBe(true);
    expect(Object.values(report.trees.lowfork.futureFloorSupport).every(v=>v.supported)).toBe(true);
    expect(study.externalLandingDepth).toBeGreaterThanOrEqual(.9);
    expect(study.externalLandingWidth).toBeGreaterThanOrEqual(.9);
    expect(study.sourceTreeSha256).toBe(report.trees.lowfork.sha256);
    expect(study.sourceHomeSha256).toBe(hash(read('public/assets/environment/woven-home.glb')));
  });
});
