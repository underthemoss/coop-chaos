/** Qualify the current home. Optional old GLB establishes the one-time wall change. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(path){
 const bytes=fs.readFileSync(path),n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
 const values=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],k={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5126:4,5125:4,5123:2}[a.componentType],reader={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE'}[a.componentType];return Array.from({length:a.count},(_,j)=>Array.from({length:k},(_,q)=>bin[reader]((v.byteOffset||0)+(a.byteOffset||0)+j*(v.byteStride||k*size)+q*size)));};
 const meshes=g.meshes.map(m=>({name:g.nodes.find(n=>n.mesh===g.meshes.indexOf(m))?.name||m.name,parts:m.primitives.map(p=>({attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,values(v)])),indices:values(p.indices).flat(),material:g.materials[p.material]}))}));
 return {bytes,meshes};
}
function triangleBox(tri,lo,hi){
 const center=lo.map((x,i)=>(x+hi[i])/2),half=lo.map((x,i)=>(hi[i]-x)/2),q=tri.map(p=>p.map((x,i)=>x-center[i]));
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
 const e=[sub(q[1],q[0]),sub(q[2],q[1]),sub(q[0],q[2])],axes=[[1,0,0],[0,1,0],[0,0,1],cross(e[0],e[1]),...e.flatMap(v=>[[0,v[2],-v[1]],[-v[2],0,v[0]],[v[1],-v[0],0]])];
 return axes.every(a=>{const p=q.map(v=>dot(v,a)),r=a.reduce((n,x,i)=>n+Math.abs(x)*half[i],0);return Math.min(...p)<=r+1e-8&&Math.max(...p)>=-r-1e-8;});
}
const path='public/assets/environment/woven-home.glb',current=read(path);
const rounded=p=>p.map(v=>Number(v.toFixed(6)));
function floors(asset){const result=[];for(const mesh of asset.meshes.filter(m=>m.name.startsWith('deck'))){for(const part of mesh.parts){const raw=part.attributes.POSITION,keys=new Map(),pos=[],remap=raw.map(p=>{const k=rounded(p).join(',');if(!keys.has(k)){keys.set(k,pos.length);pos.push(p);}return keys.get(k);}),indices=part.indices.map(i=>remap[i]),adj=pos.map(()=>new Set());for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3);for(const a of tri)for(const b of tri)adj[a].add(b);}const seen=new Set();for(let i=0;i<pos.length;i++){if(seen.has(i))continue;const stack=[i],ids=[];while(stack.length){const j=stack.pop();if(seen.has(j))continue;seen.add(j);ids.push(j);for(const k of adj[j])if(!seen.has(k))stack.push(k);}const points=ids.map(j=>pos[j]),min=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));if(max[1]<2.24&&max[2]-min[2]>1.5&&max[0]-min[0]<.16)result.push(points.map(rounded).map(JSON.stringify).sort().join('|'));}}}return result.sort();}
const floor=floors(current);const wall=current.meshes.filter(m=>m.name.startsWith('deck')).flatMap(m=>m.parts.flatMap(p=>p.attributes.POSITION)).filter(p=>p[1]>2.25);
let doorTriangles=0;for(const mesh of current.meshes.filter(m=>m.name==='deck'))for(const part of mesh.parts)for(let i=0;i<part.indices.length;i+=3){const tri=part.indices.slice(i,i+3).map(j=>part.attributes.POSITION[j]);if(triangleBox(tri,[-.30,2.25,-1.5],[.30,2.65,-.86]))doorTriangles++;}
const report={revision:'small-adult-open-home-v1',glbSha256:sha(current.bytes),sourceSha256:sha(fs.readFileSync('assets/sculpted/environment/woven-home.blend')),recipeSha256:sha(fs.readFileSync('assets/sculpted/author.py')),rimTop:Math.max(...wall.filter(p=>p[2]<-.4).map(p=>p[1])),doorClearWidth:.60,doorCollisionTriangles:doorTriangles,floorCordCount:floor.length,checks:{thirteenOriginalFloorCords:floor.length===13,frontSideWallBelow2525:Math.max(...wall.filter(p=>p[2]<-.4).map(p=>p[1]))<2.525,clearFrontEntrance:doorTriangles===0}};
if(process.argv[2]){const old=read(process.argv[2]);report.baselineSha256=sha(old.bytes);report.checks.floorCordsExact=JSON.stringify(floors(old))===JSON.stringify(floor);for(const prefix of ['rainhood','ladder'])report.checks[prefix+'Exact']=JSON.stringify(old.meshes.filter(m=>m.name.startsWith(prefix)))===JSON.stringify(current.meshes.filter(m=>m.name.startsWith(prefix)));}
report.ready=Object.values(report.checks).every(Boolean);fs.writeFileSync('assets/sculpted/home/qualification.json',JSON.stringify(report,null,2)+'\n');console.log(report);if(!report.ready)process.exitCode=1;
