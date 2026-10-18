"""Original metre-scale tree architecture. Executed in author.py's helper scope.

These paths are authored geometry, not a transform over the former little trees.
All low work sockets retain their canonical metre coordinates. Future room forks
are spatial studies only: no capacity or structural-load claim is encoded here.
"""

FUTURE_HOUSEHOLDS=[
    {'id':'A','at':[-3.45,3.45,1.85],'yaw':-.22},
    {'id':'B','at':[3.45,5.20,1.80],'yaw':.42},
    {'id':'C','at':[-2.60,6.85,2.00],'yaw':-.40},
    {'id':'D','at':[2.40,7.25,3.10],'yaw':.18},
]

FUTURE_SERVICE_ROUTE=[(-3.45,3.45,3.35),(-2.55,3.95,3.85),(-.50,4.65,3.90),(1.80,5.05,3.95),(3.45,5.20,3.35),(4.00,5.75,4.65),(2.15,6.45,5.05),(-.40,6.85,4.70),(-2.60,6.85,3.50)]
FUTURE_ACCESS_SPURS=[[(2.15,6.45,5.05),(2.4,7.25,4.60)],[(-4.70,3.45,-.60),(-4.70,3.45,3.35),(-3.45,3.45,3.35)]]

def future_air_reserved(point):
    # Leaf-radius margins protect the whole folded leaf, not just its centre.
    for h in FUTURE_HOUSEHOLDS:
        q=point-Vector(h['at']);c=math.cos(h['yaw']);s=math.sin(h['yaw'])
        x=q.x*c-q.z*s;z=q.x*s+q.z*c
        if abs(x)<1.8 and -1.7<z<2.4 and -.6<q.y<1.5:return True
    for route in [FUTURE_SERVICE_ROUTE]+FUTURE_ACCESS_SPURS:
        for a,b in zip(route,route[1:]):
            a=Vector(a);d=Vector(b)-a;q=point-a;length=d.x*d.x+d.z*d.z
            t=max(0,min(1,(q.x*d.x+q.z*d.z)/length));p=a+d*t
            if math.hypot(point.x-p.x,point.z-p.z)<.95 and -.5<point.y-p.y<1.5:return True
    return False

def spatial_growth(name):
    # The low working anatomy is intentionally shared, while the main stems,
    # upper forks, branch continuations and crowns are individually authored.
    low=lowfork_growth()
    branches=[low[i] for i in [1,2,3,4,5]]
    # Preserve natural foot sockets while their continuing limbs turn behind
    # the future lower rooms instead of cutting through usable floor volumes.
    branches[3]=(branches[3][0][:2]+[(-1.63,3.33,1.20),(-1.70,3.99,2.50),(-1.40,4.83,3.30)],branches[3][1])
    branches[4]=(branches[4][0][:2]+[(1.68,3.64,1.10),(2.15,4.32,2.70),(2.20,5.08,3.60)],branches[4][1])
    if name=='lowfork':
        # Retained low arm continues below A's floor, then rises outside its
        # arrival court. Its initial attachment and hauling clearance are fixed.
        branches[0]=([(-.35,1.42,.79),(-1.35,1.94,1.12),(-2.35,2.10,1.17),(-3.43,2.61,1.13),(-4.45,2.98,.70),(-5.50,3.02,-.10),(-6.00,4.10,-.80)],[.61,.54,.44,.34,.22,.15,.025])
        main=[(0,-.14,.38),(-.08,.55,.48),(-.35,1.35,.74),(-.52,2.22,.86),(-.20,3.26,.95),(.24,4.25,1.10),(-.10,5.35,1.40),(.15,6.55,1.70),(.70,7.75,2.15),(.22,8.80,2.50),(.90,9.85,2.85)]
        radii=[1.02,.84,.70,.62,.57,.53,.46,.38,.29,.17,.035]
        upper=[
            ([(-2.35,2.10,1.17),(-2.85,2.65,1.68),(-3.45,2.99,1.85),(-4.60,3.02,2.38),(-5.15,3.03,2.50),(-5.70,4.00,2.65),(-6.00,5.20,2.50)],[.44,.39,.32,.27,.23,.18,.025]),
            ([(-3.15,2.86,1.82),(-3.70,3.00,1.05),(-4.58,3.02,.85),(-5.25,3.02,.12),(-5.80,3.80,-.35),(-6.00,4.80,-.65)],[.29,.25,.20,.17,.13,.025]),
            ([(.24,4.25,1.10),(1.35,4.48,1.65),(2.45,4.69,1.95),(3.45,4.74,1.80),(4.55,4.76,2.48),(5.65,5.85,2.85),(6.15,7.00,2.60)],[.51,.46,.38,.31,.23,.14,.025]),
            ([(2.45,4.69,1.95),(3.25,4.75,1.00),(4.30,4.78,.65),(5.35,5.60,.00),(5.65,6.65,-.48)],[.31,.27,.23,.14,.025]),
            ([(-.10,5.35,1.40),(-1.10,5.80,1.80),(-1.95,6.35,2.15),(-2.60,6.54,2.00),(-3.75,6.55,2.65),(-4.55,6.55,3.00),(-4.60,7.45,3.15),(-4.95,8.55,2.80)],[.43,.38,.32,.27,.21,.17,.13,.025]),
            ([(-1.95,6.35,2.15),(-2.55,6.52,1.15),(-3.65,6.56,.90),(-4.30,7.38,.15),(-4.20,8.30,-.65)],[.28,.24,.20,.12,.025]),
            ([(.15,6.55,1.70),(1.05,6.78,2.40),(2.00,6.94,3.10),(3.05,6.96,3.80),(4.40,6.96,4.50),(4.60,7.90,4.70),(3.60,9.00,4.45)],[.36,.31,.27,.21,.17,.13,.025]),
            ([(1.05,6.78,2.40),(1.80,6.94,2.35),(2.90,6.96,2.15),(3.90,6.96,1.80),(3.80,7.70,1.85),(4.00,8.80,1.55)],[.28,.24,.20,.17,.13,.025]),
            ([(-5.15,3.03,2.50),(-5.60,4.35,3.20),(-5.70,5.45,3.80),(-5.90,6.20,3.30)],[.24,.19,.12,.025]),
            ([(.70,7.75,2.15),(-.70,8.10,2.55),(-1.70,8.80,3.10),(-2.10,9.75,3.25)],[.27,.21,.14,.025]),
            ([(.22,8.80,2.50),(1.50,9.00,1.70),(2.15,9.75,1.30)],[.18,.12,.025]),
            ([(-.70,8.10,2.55),(-1.30,8.55,1.05),(-1.80,9.45,.30)],[.19,.13,.025]),
            ([(5.65,5.85,2.85),(5.10,6.50,3.70),(4.85,7.25,4.20)],[.14,.09,.025]),
            ([(-4.60,7.45,3.15),(-3.95,8.10,4.20),(-3.30,8.80,4.60)],[.13,.09,.025]),
        ]
    elif name=='splitcrown':
        main=[(0,-.14,.38),(-.08,.55,.48),(-.35,1.35,.74),(-.52,2.22,.86),(-.20,3.26,1.40),(-.70,4.40,1.35),(-1.25,5.55,1.85),(-1.75,6.80,2.15),(-1.10,7.90,2.40)]
        radii=[1.02,.84,.70,.62,.54,.44,.34,.21,.035]
        upper=[
            ([(-.20,3.26,1.40),(.90,4.05,1.35),(1.65,5.05,1.80),(2.60,5.70,2.25),(3.45,6.80,2.55),(3.20,7.95,2.65)],[.51,.44,.35,.28,.18,.025]),
            ([(-2.35,2.10,1.17),(-3.05,3.00,1.65),(-3.30,4.00,2.10),(-4.00,4.65,2.65),(-4.10,5.90,2.70)],[.39,.32,.27,.17,.025]),
            ([(-.70,4.40,1.35),(-1.80,4.68,2.15),(-2.80,4.72,2.25),(-3.75,5.50,3.15),(-3.70,6.75,3.70)],[.39,.32,.25,.15,.025]),
            ([(1.65,5.05,1.80),(2.40,5.18,.90),(3.25,5.22,.60),(4.00,6.15,.05),(4.10,7.05,-.50)],[.31,.27,.20,.12,.025]),
            ([(-1.25,5.55,1.85),(-2.10,6.20,.90),(-2.80,7.10,.20),(-2.60,8.00,-.30)],[.28,.21,.13,.025]),
            ([(2.60,5.70,2.25),(1.80,6.25,3.10),(1.15,6.85,3.65),(1.40,7.85,4.05)],[.24,.19,.13,.025]),
            ([(-1.75,6.80,2.15),(-.65,7.05,3.20),(.15,7.70,3.80),(.30,8.25,3.75)],[.20,.15,.09,.025]),
        ]
    else:
        main=[(0,-.14,.38),(-.08,.55,.48),(-.35,1.35,.74),(-.52,2.22,.86),(-.20,3.26,1.40),(.65,4.10,1.50),(1.10,5.25,1.95),(.80,6.35,2.20),(1.35,7.15,2.50)]
        radii=[1.02,.84,.70,.62,.52,.43,.32,.19,.025]
        upper=[
            ([(-2.35,2.10,1.17),(-2.90,3.00,1.70),(-3.45,3.70,2.00),(-3.60,4.90,2.25),(-3.25,5.75,2.30)],[.39,.31,.24,.14,.025]),
            ([(-.20,3.26,1.40),(-1.05,3.85,1.90),(-1.95,4.55,2.40),(-2.65,4.65,2.85),(-3.35,5.50,3.35),(-3.00,6.45,3.50)],[.43,.37,.29,.23,.14,.025]),
            ([(.65,4.10,1.50),(1.70,4.50,1.10),(2.60,4.58,.80),(3.45,5.30,.20),(3.75,6.25,-.25)],[.39,.32,.25,.15,.025]),
            ([(1.10,5.25,1.95),(2.05,5.50,2.80),(2.90,6.10,3.15),(3.10,7.15,3.40)],[.29,.23,.14,.025]),
            ([(.80,6.35,2.20),(-.20,6.50,1.45),(-1.10,6.90,.60),(-1.45,7.35,.15)],[.18,.14,.09,.025]),
            ([(-1.95,4.55,2.40),(-1.70,5.65,3.45),(-1.00,6.40,3.90)],[.22,.15,.025]),
        ]
    branches.insert(0,(main,radii));branches.extend(upper)
    return branches

def spatial_fans(name):
    # Asymmetric branch fans with a deep rear crown and separate front shoulders.
    # center X/Z, radial halfwidth/depth, ridge Y, thickness, leaves.
    return {
      'lowfork':[((-5.45,2.40),1.50,2.00,5.85,1.00,210),((-4.00,-.40),1.55,1.50,5.25,.85,180),((5.45,2.30),1.45,1.80,7.10,1.10,220),((4.60,-.50),1.40,1.50,6.75,.90,170),((-4.20,3.40),1.65,1.60,8.45,1.00,220),((-3.25,-.15),1.65,1.65,8.50,.90,200),((3.50,3.85),1.70,1.40,9.05,1.00,240),((3.20,.10),1.45,1.60,9.10,1.00,180),((-.10,2.70),2.30,2.10,10.10,1.10,360)],
      'splitcrown':[((-3.65,2.50),1.40,1.65,6.35,.90,220),((-2.25,-.20),1.65,1.65,7.60,.90,220),((-1.10,2.35),1.55,1.50,8.15,.95,250),((3.35,2.45),1.55,1.70,8.10,.95,260),((3.45,-.20),1.45,1.45,7.15,.85,210),((.65,3.45),1.45,1.30,8.20,.85,220)],
      'reedside':[((-3.00,2.40),1.45,1.55,5.95,.90,250),((-1.85,3.25),1.60,1.30,6.75,.85,230),((3.10,.10),1.35,1.50,6.45,.85,240),((2.65,2.95),1.60,1.55,7.25,.80,260),((-.10,.70),1.90,1.60,7.25,.90,280)],
    }[name]

def spatial_canopy(name,root):
    rand=random.Random({'lowfork':778,'splitcrown':779,'reedside':780}[name])
    outline=[(0,-1),(-.48,-.62),(-.38,-.25),(-.68,.12),(-.38,.48),(0,1),(.38,.48),(.68,.12),(.38,-.25),(.48,-.62)]
    verts=[];faces=[];colors=[];shades=[]
    low=Vector(rgb('#42552b')[:3]);high=Vector(rgb('#9b9e4d')[:3])
    for fi,(center,sx,sz,top,depth,count) in enumerate(spatial_fans(name)):
        for j in range(count):
            theta=j*2.3999632297+rand.uniform(-.18,.18);r=math.sqrt((j+.5)/count)
            edge=1+.10*math.sin(theta*3+fi)+.065*math.cos(theta*5-fi)
            dx=math.cos(theta)*r*sx*edge;dz=math.sin(theta)*r*sz*edge
            x=center[0]+dx;z=center[1]+dz;upper=j%7<5
            y=top+.15*math.sin(x*1.3+z)+depth*(.36-.69*r*r if upper else -.54-.17*r)
            if name=='lowfork' and future_air_reserved(Vector((x,y,z))):continue
            n=Vector((dx*.20,1 if upper else -.42,dz*.25)).normalized()
            u=n.cross(Vector((0,0,1))).normalized();v=n.cross(u);spin=rand.uniform(-math.pi,math.pi)
            u,v=u*math.cos(spin)+v*math.sin(spin),-u*math.sin(spin)+v*math.cos(spin)
            length=rand.uniform(.38,.57);width=length*rand.uniform(.68,.86);p=Vector((x,y,z));start=len(verts)
            verts.append(p+n*.045)
            for a,b in outline:verts.append(p+u*a*width+v*b*length-n*.055*b*b)
            tone=max(0,min(1,.40+.20*(y-5)/5+.04*math.sin(x*.8+z*.7)+rand.uniform(-.025,.025)))
            c=low.lerp(high,tone)*(.90 if not upper else 1)
            for k in range(len(outline)):
                faces.append((start,start+1+(k+1)%len(outline),start+1+k));colors.append(tuple(c)+(1,));shades.append(n)
    material=vertex_mat(name+' original folded foliage metre-v2');material.use_backface_culling=False
    foliage=mesh(name+' broad layered branch fans',verts,faces,material,root,colors);normals=[]
    for poly,n in zip(foliage.data.polygons,shades):
        n=(xyz(n)*.82+poly.normal*.18).normalized();poly.use_smooth=True;normals.extend([tuple(n)]*len(poly.loop_indices))
    foliage.data.normals_split_custom_set(normals);foliage['leaf_count']=len(verts)//11;foliage['fan_count']=len(spatial_fans(name))

def spatial_tree(name):
    clear();root=empty('asset');material=mat(name+' warm living bark','#90613e')
    branches=spatial_growth(name);roots=lowfork_roots()
    pieces=[lowfork_living_tube('continuous branch '+str(i),p,r,material) for i,(p,r) in enumerate(branches)]
    pieces.extend(lowfork_living_tube('broad root '+str(i),p,r,material,root=True) for i,(p,r) in enumerate(roots))
    wood=sculpt(pieces,name+' continuous living boughs metre-v2',.075,.22);wood.parent=root;wood.data.name=wood.name
    import bmesh
    bm=bmesh.new();bm.from_mesh(wood.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.000001);bm.to_mesh(wood.data);bm.free();wood.data.update()
    color_faces(wood,['#906341','#926542','#8f6240','#946644'],3);lowfork_bark(wood,branches,roots)
    wood['growth_paths']=json.dumps(branches);wood['root_paths']=json.dumps(roots);wood['anatomy_revision']='spatial-metre-v2'
    if name=='lowfork':lowfork_healed_knot(wood,root)
    spatial_canopy(name,root)
    for key in HABITAT['naturalPerches']+HABITAT['shelteredPerches']+['sheltered-deck','ladder-base']:empty(key,root,ANCHORS[key])
    bpy.context.scene['habitat_revision']=HABITATS['revision'];bpy.context.scene['tree_revision']='spatial-metre-v2'
    bpy.context.scene['future_households_study']=json.dumps(FUTURE_HOUSEHOLDS if name=='lowfork' else [])
    export('environment/'+name,list(bpy.context.scene.objects));return root

