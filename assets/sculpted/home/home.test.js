import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,test} from 'vitest';
const root=new URL('../../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(read('assets/sculpted/home/qualification.json'));
describe('small-adult home entrance and guard',()=>{
  test('current export, editable source and recipe match physical qualification',()=>{
    expect(hash(read('public/assets/environment/woven-home.glb'))).toBe(report.glbSha256);
    expect(hash(read('assets/sculpted/environment/woven-home.blend'))).toBe(report.sourceSha256);
    expect(hash(read('assets/sculpted/author.py'))).toBe(report.recipeSha256);
    expect(report.ready).toBe(true);expect(Object.values(report.checks).every(Boolean)).toBe(true);
  });
  test('lower open guard preserves original floor, ladder and rainhood',()=>{
    expect(report.floorCordCount).toBe(13);expect(report.checks.floorCordsExact).toBe(true);
    expect(report.checks.ladderExact).toBe(true);expect(report.checks.rainhoodExact).toBe(true);
    expect(report.rimTop).toBeGreaterThan(2.50);expect(report.rimTop).toBeLessThan(2.525);
    expect(report.doorClearWidth).toBeGreaterThanOrEqual(.60);expect(report.checks.clearFrontEntrance).toBe(true);
  });
});
