/** ARCHIVED rejected Coop Chaos mesh experiment. Never produces runtime assets. Node >=20; no external packages.
 * Rebuild: node assets/models/export-models.mjs
 * Sculpted mesh proof, not a skinned production rig. glTF coordinates: +Y up, +Z forward.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const out = new URL('../../output/legacy-node-assets/', import.meta.url);
const palette = ['#79563c','#9b7250','#b48a5e','#64743a','#7b8443','#899249','#515f32','#eee0b8','#d7b677','#af703e','#3e4940','#c67b3d','#bd4331','#e1ad4a','#202822','#fff5d9','#9aa16a','#4e603c'];
function color(hex) {return [1,3,5].map(i => ((v)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)(parseInt(hex.slice(i,i+2),16)/255));}
function model() {
 const parts=[],nodes=[],materials=palette.map(c=>({name:c,pbrMetallicRoughness:{baseColorFactor:[...color(c),1],metallicFactor:0,roughnessFactor:1},doubleSided:false}));
 function group(name,parent=null,translation=[0,0,0]) {const id=nodes.length;nodes.push({name,translation,children:[]});if(parent!==null)nodes[parent].children.push(id);return id;}
 const root=group('asset');
 function mesh(name,p,idx,mat,parent=root) {
  const positions=[],normals=[];
  for(let i=0;i<idx.length;i+=3) {
   const a=p[idx[i]],b=p[idx[i+1]],c=p[idx[i+2]],u=b.map((n,j)=>n-a[j]),v=c.map((n,j)=>n-a[j]);
   const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;
   for(const point of [a,b,c]) {positions.push(...point);normals.push(...n.map(x=>x/len));}
  }
  const id=group(name,parent);nodes[id].mesh=parts.length;parts.push({positions,normals,mat});
 }
 function egg(name,at,size,mat,parent=root,segments=10,rings=6,lean=0) {
  const p=[],idx=[];
  for(let r=0;r<=rings;r++) {
   const phi=Math.PI*r/rings;
   for(let s=0;s<segments;s++) {
    const theta=2*Math.PI*s/segments+(r%2)*0.12,y=Math.cos(phi);
    const width=Math.sin(phi)*(1-y*0.12);
    p.push([at[0]+Math.cos(theta)*width*size[0]/2+lean*y,at[1]+y*size[1]/2,at[2]+Math.sin(theta)*width*size[2]/2]);
   }
  }
  for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){const a=r*segments+s,b=r*segments+(s+1)%segments,c=a+segments,d=b+segments;idx.push(a,b,c,b,d,c);}
  mesh(name,p,idx,mat,parent);
 }
 function limb(name,points,radii,mat,parent=root,sides=7) {
  const p=[],idx=[];
  for(let j=0;j<points.length;j++) {
   const tangent=(j===points.length-1?points[j].map((x,k)=>x-points[j-1][k]):points[j+1].map((x,k)=>x-points[j][k]));
   const l=Math.hypot(...tangent),t=tangent.map(x=>x/l),ref=Math.abs(t[1])<0.9?[0,1,0]:[1,0,0];
   const a=[t[1]*ref[2]-t[2]*ref[1],t[2]*ref[0]-t[0]*ref[2],t[0]*ref[1]-t[1]*ref[0]],al=Math.hypot(...a);a.forEach((x,k)=>a[k]=x/al);
   const b=[t[1]*a[2]-t[2]*a[1],t[2]*a[0]-t[0]*a[2],t[0]*a[1]-t[1]*a[0]];
   for(let s=0;s<sides;s++){const angle=s/sides*Math.PI*2+(j%2)*0.15;p.push(points[j].map((x,k)=>x+radii[j]*(Math.cos(angle)*a[k]+Math.sin(angle)*b[k])));}
  }
  for(let j=0;j<points.length-1;j++)for(let s=0;s<sides;s++){const a=j*sides+s,b=j*sides+(s+1)%sides,c=a+sides,d=b+sides;idx.push(a,b,c,b,d,c);}
  p.push(points[0],points.at(-1));const end=p.length-1,start=end-1;
  for(let s=0;s<sides;s++){idx.push(start,(s+1)%sides,s);const a=(points.length-1)*sides+s,b=(points.length-1)*sides+(s+1)%sides;idx.push(end,a,b);}
  mesh(name,p,idx,mat,parent);
 }
 function crown(name,at,size,mat,seed=0) {
  // Broad irregular shelf with a low central rise, scalloped rim and shadowed underside.
  const p=[],idx=[],top=[],segments=13;
  const levels=[[0.05,-0.65],[0.64,-0.55],[1,-0.1],[0.82,0.38],[0.43,0.83],[0.02,0.95]];
  for(let r=0;r<levels.length;r++)for(let s=0;s<segments;s++) {
   const a=s/segments*Math.PI*2,wiggle=1+0.18*Math.sin(s*7+seed)+0.09*Math.cos(s*3+r);
   p.push([at[0]+Math.cos(a)*size[0]*levels[r][0]*wiggle,at[1]+size[1]*(levels[r][1]+0.06*Math.sin(s*3+seed)),at[2]+Math.sin(a)*size[2]*levels[r][0]*wiggle]);
  }
  for(let r=0;r<levels.length-1;r++)for(let s=0;s<segments;s++){const a=r*segments+s,b=r*segments+(s+1)%segments,c=a+segments,d=b+segments;(r>=2?top:idx).push(a,c,b,b,c,d);}
  mesh(name+'-underside',p,idx,17);
  mesh(name+'-sunlit',p,top,mat===3?4:16);
 }
 function save(path) {
  const chunks=[],views=[],accessors=[],meshes=[];let offset=0;
  // Static tree anatomy is one primitive per material, not one draw call per crown lobe.
  let exportParts=parts,exportNodes=nodes;
  if(path.startsWith('environment/')) {
   const merged=new Map();
   for(const part of parts){if(!merged.has(part.mat))merged.set(part.mat,{positions:[],normals:[],mat:part.mat});const target=merged.get(part.mat);target.positions.push(...part.positions);target.normals.push(...part.normals);}
   exportParts=[...merged.values()];exportNodes=[{name:'asset',children:exportParts.map((_,i)=>i+1)},...exportParts.map((part,i)=>({name:'tree-material-'+part.mat,mesh:i}))];
  }
  function buffer(values,type) {const b=Buffer.from(new Float32Array(values).buffer);const id=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length});chunks.push(b);offset+=b.length;const a={bufferView:id,componentType:5126,count:values.length/3,type:'VEC3'};if(type==='position'){a.min=[0,1,2].map(i=>Math.min(...values.filter((_,k)=>k%3===i)));a.max=[0,1,2].map(i=>Math.max(...values.filter((_,k)=>k%3===i)));}accessors.push(a);return accessors.length-1;}
  for(const part of exportParts)meshes.push({primitives:[{attributes:{POSITION:buffer(part.positions,'position'),NORMAL:buffer(part.normals,'normal')},material:part.mat}]});
  const json={asset:{version:'2.0',generator:'Coop Chaos original editable Node mesh authoring'},scene:0,scenes:[{nodes:[root]}],nodes:exportNodes,meshes,materials,buffers:[{byteLength:offset}],bufferViews:views,accessors};
  const raw=Buffer.from(JSON.stringify(json)),pad=(4-raw.length%4)%4,j=Buffer.concat([raw,Buffer.alloc(pad,32)]),bin=Buffer.concat(chunks),header=Buffer.alloc(20),bh=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+j.length+8+bin.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
  const file=new URL(path,out);mkdirSync(new URL('.',file),{recursive:true});writeFileSync(file,Buffer.concat([header,j,bh,bin]));console.log(path, nodes.length+' nodes', Math.round(offset/1024)+' KiB geometry');
 }
 return {root,group,egg,limb,crown,mesh,save};
}
for(const [variant,name] of ['lowfork','splitcrown','reedside'].entries()) {
 const m=model();
 const trunks=[
  [[0,0,0],[-.48,.8,.04],[-.34,1.85,.16],[.22,2.85,.18],[.72,3.9,.3],[1.16,5.2,.4]],
  [[0,0,0],[.12,.9,.05],[-.25,1.85,.1],[-.54,2.9,.16],[-.94,4.15,.34],[-1.25,5.4,.45]],
  [[0,0,0],[.12,.9,.08],[.36,1.85,.12],[.22,2.8,.18],[.84,3.9,.26],[1.6,5.05,.45]],
 ];
 m.limb('crooked-trunk',trunks[variant],(variant===0?[.88,.78,.61,.49,.3,.12]:[.71,.64,.5,.38,.25,.1]),0);
 if(variant===1)m.limb('second-trunk',[[.08,.2,.08],[.4,1.3,.1],[.48,2.55,.15],[.9,3.8,.3],[1.3,5.45,.5]],[.46,.39,.32,.23,.07],1);
 const roots=[[[ -1.95,.03,-.65],[-1.2,.12,-.38],[-.2,.66,0]],[[1.35,.02,-.86],[.66,.15,-.51],[.15,.8,0]],[[-.8,.02,1.55],[-.4,.2,.72],[0,.95,.12]],[[1.7,.02,.7],[.9,.12,.55],[.12,.62,.1]]];
 for(const [i,points] of roots.entries())m.limb('buttress-root-'+i,points.map(([x,y,z])=>[x*(variant===2?.72:1),y,z+(variant-1)*.1]),[.045,.18+i*.027,.3],i%2?0:1);
 const leftEnds=variant===0?[[-2.1,3.35,-.52],[-2.7,3.9,-.23],[-3,4.4,.1]]:variant===1?[[-1.7,3.65,-.46],[-2.1,4.45,.1],[-2,5.05,.35]]:[[-1.65,3.4,-.46],[-2.25,3.72,-.14],[-2.35,4.1,.08]];
 const rightEnds=variant===0?[[1.8,3.47,-.46],[2.6,4,.05],[2.8,4.4,.22]]:variant===1?[[1.5,3.7,-.46],[1.95,4.5,.05],[2.2,5.15,.22]]:[[1.85,3.58,-.46],[2.8,4.04,.05],[3.1,4.4,.22]];
 m.limb('left-natural-bough',[[.02,2.32,.06],[-.9,3.12,-.46],...leftEnds],(variant===0?[.46,.3,.23,.15,.07]:[.36,.23,.18,.12,.05]),1);
 m.limb('right-natural-bough',[[.02,2.5,.12],[.75,3.33,-.46],...rightEnds],(variant===0?[.44,.3,.22,.14,.06]:[.34,.23,.17,.1,.04]),1);
 m.limb('rear-fork',[[.05,3.1,.15],[-.75,4.3,1.25],[-.8,4.55,.9]],[.25,.16,.05],0);
 // Warm scar and ridges are geometry, not a painted human face.
 m.egg('old-scar',[-.36,1.8,-.44],[.14,.64,.06],2,undefined,7,4);
 m.limb('bark-ridge',[[.35,.35,-.45],[.25,1.3,-.43],[.48,2,-.2]],[.07,.1,.02],2);
 // Layered broad crowns: irregular overlapping full-bodied lobes, not flat discs.
 function cloud(label,center,width,depth,height,count,seed,bulk=1) {
  for(let i=0;i<count;i++) {
   const a=i*2.399+seed,r=Math.sqrt((i+.5)/count),jitter=.85+.2*Math.sin(i*7.13+seed);
   const x=center[0]+Math.cos(a)*r*width*.32,z=center[2]+Math.sin(a)*r*depth*.29;
   const y=center[1]+(1-r)*height*.3+.18*Math.sin(i*3.7+seed);
   const radius=(.85+.14*Math.sin(i*4.2+seed))*jitter*bulk;
   m.crown(label+'-'+i,[x,y,z],[radius,radius*.95,radius*.87],i%3===0?3:4,seed+i*3);
  }
 }
 if(variant===0) {
  cloud('swept-top',[.7,5.25,.7],7.6,4.5,2.6,18,2,1.35);
  m.crown('trunk-tip-fill',[1.16,5.45,.4],[.95,1,.95],4,31);
  cloud('left-court',[-2.8,4.45,.2],3.7,2.7,1.8,12,7,1.1);
  cloud('right-court',[2.8,4.5,.4],3.5,2.6,1.8,11,13,1.1);
 } else if(variant===1) {
  cloud('twin-left',[-1.25,5.45,.8],2.4,2.1,2.2,11,4);
  cloud('twin-right',[1.3,5.85,.6],2.7,2.3,2.1,12,16);
  cloud('left-shoulder',[-2,4.65,.25],1.9,1.7,1.5,7,9);
 } else {
  cloud('leaning-crown',[1.7,5.35,.7],3.5,2.4,1.8,14,3);
  cloud('windward-side',[3,4.65,.4],2.3,2,1.6,9,11);
  cloud('small-left',[-2,4.3,.25],1.9,1.7,1.4,7,19);
 }
 m.save('environment/'+name+'.glb');
}
for(const [i,name] of ['fern','rook','dapple','wren'].entries()) {
 const m=model(),rooster=i===1,body=m.group('body',m.root),head=m.group('head',body,[0,rooster?1.36:1.2,.38]),wing=m.group('wing',body),far=m.group('far-wing',body);
 const plumage=[7,10,9,8][i],accent=[8,11,8,7][i],width=[1.04,.87,1.18,.86][i],height=rooster?1.3:1.12;
 m.egg('pear-breast',[0,.83,0],[width,height,1.25],plumage,body,12,7);
 m.egg('neck',[0,-.07,-.015],[.5,rooster?.92:.66,.58],rooster?11:plumage,head,10,6,rooster?.05:0);
 m.egg('face',[0,.2,.12],[.56,.58,.54],plumage,head,10,6);
 for(const side of [-1,1]) {
  const parent=side===1?wing:far;
  m.egg('wing-mantle',[side*width*.39,.86,-.08],[.29,.65,.83],accent,parent,10,5);
  for(let f=0;f<3;f++)m.egg('wing-feather',[side*(width*.42+.025*f),.65+.08*f,-.27+.16*f],[.14,.31,.5],f===1?plumage:accent,parent,8,4);
  m.limb('shin',[[side*.21,.35,.04],[side*.23,.12,.08]],[.055,.045],13);
  for(let toe=-1;toe<=1;toe++)m.limb('toe',[[side*.23,.11,.08],[side*.23+toe*.1,.055,.32]],[.045,.015],13,undefined,5);
  m.egg('eye',[side*.253,.25,.3],[.083,.1,.06],14,head,8,4);
  m.egg('eye-glint',[side*.274,.27,.322],[.027,.03,.025],15,head,6,3);
 }
 m.mesh('beak',[[0,.09,.64],[-.14,.12,.36],[.14,.12,.36],[0,-.035,.38]],[0,2,1,0,3,2,0,1,3,1,2,3],13,head);
 for(let c=0;c<3;c++)m.egg('comb',[0,.45+(c===1?.05:0),-.03+c*.12],[.11,rooster?.38:.19,.21],12,head,7,4);
 m.egg('wattle',[0,-.08,.35],[.18,rooster?.32:.17,.12],12,head,8,4);
 for(let f=0;f<(rooster?4:5);f++) {
  const side=(f-(rooster?1.5:2))*.11;
  m.limb('tail-feather',[[side,.89,-.43],[side*1.5,rooster?1.5:1.1,rooster?-.83:-.69],[side*2,rooster?1.78:1.2,rooster?-1.18:-.87],[side*2,rooster?1.55:1.15,rooster?-1.48:-.99]],[.14,.16,.1,.012],rooster?10:(f%2?accent:plumage),body,6);
 }
 m.save('characters/'+name+'.glb');
}
