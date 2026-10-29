import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { typescriptModule } from './typescript-module.mjs';
const source = await readFile('src/content/valley-generator.ts', 'utf8');
const { authorValley, valleyRecipes } = await import(await typescriptModule('src/content/valley-generator.ts'));
const { findRoute } = await import(await typescriptModule('src/simulation/navigation.ts'));
const { mapEdgeLengths, mapTile } = await import(await typescriptModule('src/content/maps.ts'));
function meters(map, start, route) {
  let previous = start, total = 0;
  for (const at of route) {
    const [first, second] = mapEdgeLengths(map, previous, at);
    total += first + second;
    previous = at;
  }
  return total;
}
function courtArea(map, start) {
  const pending = [start], seen = new Set();
  while (pending.length) {
    const at = pending.pop(), key = `${at.x},${at.z}`;
    if (seen.has(key) || !mapTile(map, at)?.buildable)
      continue;
    seen.add(key);
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      pending.push({ x: at.x + x, z: at.z + z });
  }
  return seen.size * map.cellSize ** 2;
}
await mkdir('src/content/generated', { recursive: true });
await mkdir('assets/maps/candidates', { recursive: true });
const receipt = {
  recipe: 'crescent-field-v1', sourceSha256: createHash('sha256').update(source).digest('hex'), maps: []
};
const outputs = [];
for (const recipe of valleyRecipes) {
  const map = authorValley(recipe), raw = JSON.stringify(map) + '\n', { source, destination } = map.scenario.supply;
  const normal = findRoute(map, source, destination);
  const alternate = { ...map, tiles: map.tiles.map((t, i) => t.surface === 'ford' && Math.abs(Math.floor(i / map.width) - map.crossings[0].at.z) < 4 ? { ...t, traversable: false } : t) };
  const flank = findRoute(alternate, source, destination);
  if (!normal || !flank || !flank.some(p => mapTile(map, p)?.surface === 'ford' && Math.abs(p.z - map.crossings[1].at.z) < 4))
    throw Error(`${map.id}: crossings are not useful alternatives`);
  const normalMeters = meters(map, source, normal), alternateMeters = meters(map, source, flank);
  const courts = map.landmarks.slice(0, 3).map(l => ({ name: l.name, contiguousSquareMeters: courtArea(map, l.at) }));
  if (alternateMeters <= normalMeters * 1.1 || courts.some(c => c.contiguousSquareMeters < 3))
    throw Error(`${map.id}: route or court constraint failed ${JSON.stringify({
      normalMeters, alternateMeters, courts
    })}`);
  for (const at of [...map.scenario.spawns, ...map.landmarks.map(l => l.at)])
    if (!findRoute(map, source, at))
      throw Error(`${map.id}: disconnected scenario point ${JSON.stringify(at)} ${JSON.stringify(mapTile(map, at))}`);
  const path = `${recipe.id === 'ochre-valley' ? 'src/content/generated' : 'assets/maps/candidates'}/${recipe.id}-v${recipe.version}.json`;
  outputs.push([path, raw]);
  receipt.maps.push({
    path, id: map.id, version: map.version, seed: recipe.seed, sha256: createHash('sha256').update(raw).digest('hex'), traversable: map.tiles.filter(t => t.traversable).length, buildable: map.tiles.filter(t => t.buildable).length, normalMeters, alternateMeters, courts
  });
}
// Validate every candidate before replacing any snapshot.
for (const [path, raw] of outputs)
  await writeFile(path, raw);
await writeFile('assets/maps/authoring-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
