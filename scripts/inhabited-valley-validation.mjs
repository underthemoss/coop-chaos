import { typescriptModule } from './typescript-module.mjs';
const { findRoute, canTraverse } = await import(await typescriptModule('src/simulation/navigation.ts'));
const { mapPosition, mapTile, mapEdgeLengths, terrainHeight } = await import(await typescriptModule('src/content/maps.ts'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export function validateInhabitedValley(map, placements) {
  const source = placements.source.at;
  const meters = route => { let n = 0, prev = source; for (const at of route) { n += mapEdgeLengths(map, prev, at).reduce((a,b)=>a+b); prev=at; } return n; };
  const direct = findRoute(map, source, map.scenario.supply.destination);
  const alternate = {...map,tiles:map.tiles.map((t,i)=>t.surface==='ford'&&Math.abs(Math.floor(i/map.width)-map.crossings[0].at.z)<4?{...t,traversable:false}:t)};
  const flank = findRoute(alternate, source, map.scenario.supply.destination);
  assert(direct && flank, 'Both crossings must remain reachable');
  assert(flank.some(at=>mapTile(map,at).surface==='ford'&&Math.abs(at.z-map.crossings[1].at.z)<4), 'Closed direct crossing must use flank ford');
  assert(meters(flank) > meters(direct)*1.3, 'Flank must be meaningfully longer');
  const points = [...placements.spawns, placements.tree.work, ...placements.pads.map(p=>p.approach), ...placements.resources.map(r=>r.at), ...map.landmarks.map(l=>l.at)];
  const routes = points.map(at => { const route = findRoute(map,source,at); assert(route, `Unreachable point ${JSON.stringify(at)}`); let prev=source; for(const step of route){assert(canTraverse(map,prev,step),'Route cut a blocked corner or discontinuous edge');prev=step;} return route; });
  let maxWalkableSlope=0, steepCells=0;
  for(let z=0;z<map.depth;z++) for(let x=0;x<map.width;x++) {
    const t=mapTile(map,{x,z}),[sw,se,ne,nw]=t.corners;
    const slope=Math.max(Math.hypot(se-sw,ne-se),Math.hypot(ne-nw,nw-sw))/map.cellSize;
    if(t.traversable) maxWalkableSlope=Math.max(maxWalkableSlope,slope);
    if(slope>=.85){assert(!t.traversable,'Steep cell is traversable');steepCells++;}
    if(x<map.width-1){const east=mapTile(map,{x:x+1,z});assert(se===east.corners[0]&&ne===east.corners[3],'Broken east seam');}
    if(z<map.depth-1){const north=mapTile(map,{x,z:z+1});assert(nw===north.corners[0]&&ne===north.corners[1],'Broken north seam');}
    const q=mapPosition(map,{x:x+.17,z:z-.13});assert(Math.abs(terrainHeight(map,q.x,q.z)-q.y)<1e-9,'Navigation and rendered scenery disagree');
  }
  for(const obstacle of map.obstacles) { assert(obstacle.cells.length,`Empty obstruction ${obstacle.id}`); for(const at of obstacle.cells) assert(!mapTile(map,at)?.traversable,`Walkable obstruction ${obstacle.id}`); }
  const footprintCells=(at,minX,maxX,minZ,maxZ)=>{const p=mapPosition(map,at);return map.tiles.flatMap((_,i)=>{const cell={x:i%map.width,z:Math.floor(i/map.width)},q=mapPosition(map,cell),r=map.cellSize/2;return q.x+r>p.x+minX&&q.x-r<p.x+maxX&&q.z+r>p.z+minZ&&q.z-r<p.z+maxZ?[cell]:[];});};
  const pads=placements.pads.map(p=>{
    const minX=-p.footprint.width/2-p.clearance,maxX=p.footprint.width/2+p.clearance,minZ=-p.footprint.depth/2-p.clearance,maxZ=p.footprint.depth/2+Math.max(p.clearance,p.frontApron??0);
    const cells=footprintCells(p.at,minX,maxX,minZ,maxZ); for(const at of cells)assert(mapTile(map,at)?.buildable,`Pad/apron not fully buildable: ${p.id} ${JSON.stringify(at)}`);
    const heights=cells.flatMap(at=>mapTile(map,at).corners), relief=Math.max(...heights)-Math.min(...heights);assert(relief<=.08,`Pad relief too high: ${p.id}`);
    const reservationCells=footprintCells(p.at,minX,maxX,minZ,p.footprint.depth/2+p.clearance);
    assert(JSON.stringify(reservationCells)===JSON.stringify(p.reservedCells),`Reservation geometry drift: ${p.id}`);
    assert(!mapTile(map,p.at)?.traversable,`Pad center must be closed from world creation: ${p.id}`);
    assert(findRoute(map,source,p.at)===null,`Pad center accepted as movement destination: ${p.id}`);
    for(const at of reservationCells)assert(!mapTile(map,at)?.traversable,`Walkable reserved pad: ${p.id}`);
    assert(mapTile(map,p.approach)?.traversable,`Blocked pad approach: ${p.id}`);
    const frontRow=Math.ceil((p.footprint.depth/2+p.clearance+map.cellSize/2)/map.cellSize);
    assert(frontRow*map.cellSize<p.footprint.depth/2+p.frontApron,`Open front row falls outside apron: ${p.id}`);
    const apronPoints=[-1,0,1].map(dx=>({x:p.at.x+dx,z:p.at.z+frontRow}));
    for(const at of apronPoints)assert(mapTile(map,at)?.traversable&&findRoute(map,source,at)&&findRoute(map,at,p.approach),`Unreachable front apron: ${p.id}`);
    return {id:p.id,footprint:p.footprint,clearance:p.clearance,frontApron:p.frontApron,cells:cells.length,reservedCells:reservationCells.length,centerExcluded:true,connectedApronCells:apronPoints.length,relief};
  });
  const court=placements.frontCourt,courtAt={x:placements.tree.at.x+court.localCenter.x/map.cellSize,z:placements.tree.at.z+court.localCenter.z/map.cellSize};
  const courtCells=footprintCells(courtAt,-court.width/2,court.width/2,-court.depth/2,court.depth/2);
  for(const at of courtCells) assert(mapTile(map,at)?.traversable,`Obstructed front court ${JSON.stringify(at)}`);
  for(const r of placements.resources){const cells=footprintCells(r.at,-r.radius,r.radius,-r.radius,r.radius);for(const at of cells)assert(mapTile(map,at)?.traversable,`Resource approach obstructed: ${r.id}`);}
  const nursery=placements.pads.find(p=>p.kind==='nursery');
  const nurseryFoodRoutes=placements.resources.filter(r=>r.kind!=='reeds').map(r=>{let prev=nursery.approach,metres=0;const path=findRoute(map,prev,r.at);assert(path,`Food unreachable from nursery: ${r.id}`);for(const at of path){metres+=mapEdgeLengths(map,prev,at).reduce((a,b)=>a+b);prev=at;}return{id:r.id,metres};});
  const meanNurseryFoodMetres=nurseryFoodRoutes.reduce((sum,r)=>sum+r.metres,0)/nurseryFoodRoutes.length;
  // Content fit only: runtime owns the forecast, nutrient demand and brood survival.
  assert(meanNurseryFoodMetres<=10.29,'Food geography exceeds accepted first-nursery route budget');
  return { directMeters:meters(direct), flankMeters:meters(flank), destinationRoutes:routes.length,maxWalkableSlope,steepCells,pads,nurseryFoodRoutes,meanNurseryFoodMetres,frontCourt:{width:court.width,depth:court.depth,physicalSquareMeters:court.width*court.depth,coveredTileSquareMeters:courtCells.length*map.cellSize**2},obstacles:map.obstacles.map(o=>({id:o.id,cells:o.cells.length})),direct,flank };
}
