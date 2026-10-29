import { buildingPlace, reedPatchName, settlementWorld } from "../content/settlement-world";
import { useEffect, useRef, useState } from "react";
import { createClearing } from "./create-clearing";
import type { GroundPickMiss } from "./clearing-input";
import { defaultClearingZoom, clearingZoomLevels, stepClearingZoom, wheelClearingZoom, type ClearingFraming } from "./clearing-camera";
import { cost, nurseryReadout, treeActivity, projectReadout, shelteredCapacity, treeBuildOptions } from "../simulation/settlement";
import type { BuildKind, Cell, DirectOrder, Settlement } from "../simulation/settlement";
import type { TreeId, SettlerId } from "../content/settlement";
import { ActionArt } from "../app/ActionArt";
import { targetEligibility } from "../app/command-ui";
import { buildingNames } from "../app/BuildCatalog";
import { groundAccess } from "../simulation/settlement";
export type Tool = "inspect" | "gather" | "forage" | "build" | "store";
export function Clearing({
  state,
  selected, selectedIds, onGroup, onContext, onOrder, targeting, onTargetMiss,
  onSelect,
  onPick,
  onTree,
  onNursery,
  onProject,
  onForage,
  cursor,
  highlight,
  tool,
  onCursor,
  homePlacement, placementKind, selectedPatch, onPatch, nurseryFocused,
}: {
  state: Settlement;
  selected: SettlerId;
  selectedIds: string[];
  onGroup:(ids:string[],add?:boolean)=>void;
  onContext:(at:Cell,queue?:boolean)=>void;
  onTargetMiss:(reason:GroundPickMiss,context:boolean)=>void;
  onOrder:(order:DirectOrder,queue?:boolean)=>void;
  targeting:"move"|"gather"|"build"|null;
  onSelect: (id: SettlerId,add?:boolean) => void;
  onPick: (at: Cell,queue?:boolean) => void;
  onTree: (id: TreeId) => void;
  onNursery: (site:string)=>void;
  onProject: (site:string)=>void;
  onForage: (id: string) => void;
  cursor: Cell;
  highlight: boolean;
  tool: Tool;
  onCursor: (at: Cell) => void;
  homePlacement: boolean;
  placementKind:BuildKind|null;
  selectedPatch:string|null;
  nurseryFocused:boolean;
  onPatch:(id:string)=>void;
}) {
  const definition=settlementWorld(state),trees=definition.trees,foodPatches=definition.foodPatches;
  const [framing,setFraming]=useState<ClearingFraming>("habitat");
  const [zoom,setZoom]=useState<number>(defaultClearingZoom);
  const [freeCamera,setFreeCamera]=useState(false);
  const [followed,setFollowed]=useState<string|null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const [dragRect,setDragRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const world = useRef<ReturnType<typeof createClearing> | null>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const latest = useRef({ onSelect, onPick, onTree, onContext, onGroup, onTargetMiss });
  latest.current = { onSelect, onPick, onTree, onContext, onGroup, onTargetMiss };
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<"loading" | "ready" | "failed">("loading");
  const visibleProjects=[...trees.map(t=>treeActivity(state,t.id)).filter(s=>s!==undefined),...state.sites.filter(s=>s.kind==="store")];
  const targetChoices=targeting==="gather"?state.patches.map(p=>({id:p.id,label:reedPatchName(state,p.id),at:p.at,order:{kind:"gather",target:p.id} as DirectOrder})):targeting==="build"?state.sites.filter(s=>!s.complete).map(s=>({id:s.id,label:`${buildingNames[s.kind]} · ${buildingPlace(state,s)}`,at:groundAccess(s.at,state),order:{kind:"build",target:s.id} as DirectOrder})):[];
  const qualifiedTargets=targetChoices.map(choice=>{const actors=targetEligibility(state,selectedIds,choice.order),eligible=actors.filter(a=>a.eligible).length;return {...choice,actors,eligible,status:(eligible===0?"unavailable":eligible===actors.length?"valid":"partial") as "valid"|"partial"|"unavailable"};});
  useEffect(() => {
    try {
      world.current = createClearing(
        canvas.current!,
        (id,add) => latest.current.onSelect(id,add),
        (positions) => {
          for (const [id, point] of Object.entries(positions)) {
            const label = labels.current[id];
            if (label) {
              label.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
              label.style.visibility = point.visible ? "visible" : "hidden";
            }
          }
        },
        (at,queue) => latest.current.onPick(at,queue),
        (id) => latest.current.onTree(id),
        setAssets,
        state,
        {onContext:(at,queue)=>latest.current.onContext(at,queue),onGroup:(ids,add)=>latest.current.onGroup(ids,add),onMiss:(reason,context)=>latest.current.onTargetMiss(reason,context),onManualCamera:()=>setFreeCamera(true)},
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The landscape could not load.",
      );
    }
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, []);
  useEffect(() => {
    world.current?.update(state);
  }, [state]);
  useEffect(() => {
    world.current?.select(selected,selectedIds);
  }, [selected,selectedIds]);
  useEffect(()=>{world.current?.zoom(zoom);},[zoom]);
  useEffect(()=>{world.current?.placementKeys(tool==="store");},[tool]);
  useEffect(()=>{world.current?.targeting(!!targeting);world.current?.targets(qualifiedTargets.map(({at,status})=>({at,status})));});
  function frame(mode:ClearingFraming){
    setFreeCamera(false);setFraming(mode);
    if(mode==="follow")setFollowed(selected);
    world.current?.frame(mode,zoom,mode==="follow"?selected:undefined);
  }
  useEffect(()=>{
    const element=canvas.current;
    if(!state.world||!element)return;
    const wheel=(event:WheelEvent)=>{
      if(!event.deltaY)return;
      event.preventDefault();
      setZoom(value=>wheelClearingZoom(value,event.deltaY));
    };
    element.addEventListener("wheel",wheel,{passive:false});
    return ()=>element.removeEventListener("wheel",wheel);
  },[state.world]);
  useEffect(() => {
    world.current?.cursor(cursor, tool === "store" || highlight, tool === "store", placementKind);
  }, [cursor, tool, highlight, placementKind, assets]);
  useEffect(()=>{world.current?.focusNursery(nurseryFocused);},[nurseryFocused,assets]);
  return (
    <section className="world" aria-label="The treehouse settlement">
      {assets !== "ready" && <div className="asset-notice" role="status">
        <strong>{assets === "loading" ? "Opening the grove…" : "The grove models could not load."}</strong>
        {assets === "failed" && <button onClick={() => void world.current?.retryAssets()}>Retry models</button>}
      </div>}
      <div className="world-controls">
      {state.world&&<nav className="inhabited-camera" aria-label="Camera framing" title="Pan: mouse at clear canvas edges, arrow keys with canvas focused, or middle-button drag. View buttons recenter.">
        <button aria-pressed={!freeCamera&&framing==="habitat"} onClick={()=>frame("habitat")}>Longbough</button>
        <button aria-pressed={!freeCamera&&framing==="whole"} onClick={()=>frame("whole")}>Whole valley</button>
        <button aria-pressed={!freeCamera&&framing==="follow"&&followed===selected} onClick={()=>frame("follow")}>Follow {state.birds.find(b=>b.id===selected)?.life.name}</button>
        <button aria-label="Zoom out" disabled={zoom>=clearingZoomLevels.at(-1)!} onClick={()=>setZoom(z=>stepClearingZoom(z,"out"))}>−</button>
        <button aria-label="Zoom in" disabled={zoom<=clearingZoomLevels[0]} onClick={()=>setZoom(z=>stepClearingZoom(z,"in"))}>+</button>
        {freeCamera&&<span className="camera-state" role="status">Free camera</span>}
      </nav>}
      {targeting&&<section className="target-choices" aria-label="Order targets"><strong>{targeting==="move"?"Choose reachable ground":targeting==="gather"?"Choose a reed patch":"Choose an unfinished project"}</strong>{targeting!=="move"&&(qualifiedTargets.length?qualifiedTargets.map(choice=><button key={choice.id} className={choice.status} disabled={!choice.eligible} onClick={event=>onOrder(choice.order,event.shiftKey)} title={choice.actors.map(a=>`${a.name}: ${a.eligible?"eligible":a.reason}`).join(". ")}><span>{choice.label}</span><small>{choice.eligible}/{choice.actors.length} eligible{choice.status==="partial"?" · partial group":choice.status==="unavailable"?" · unavailable":""}</small>{choice.actors.some(a=>!a.eligible)&&<small>{choice.actors.filter(a=>!a.eligible).map(a=>`${a.name}: ${a.reason}`).join(" · ")}</small>}</button>):<p>No unfinished projects. Select one builder to make a new plan.</p>)}</section>}
      </div>
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-describedby="camera-hint"
        aria-label={state.world?"3D Chicken Civ living valley. Select a chicken, tree, or marked resource and building court. Camera controls frame Longbough, the valley, or the selected chicken. Pan with the mouse at a clear canvas edge, arrow keys when focused, or middle-button drag.":"3D chicken settlement. Fixed view. In store placement mode arrow keys move the cell cursor and Enter uses the tool."}
        onContextMenu={e=>e.preventDefault()}
        onPointerDown={e=>{if(e.button===0){const r=e.currentTarget.getBoundingClientRect();dragStart.current={x:e.clientX-r.left,y:e.clientY-r.top};}}}
        onPointerMove={e=>{const p=dragStart.current;if(!p)return;const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(Math.hypot(x-p.x,y-p.y)>5)setDragRect({left:Math.min(x,p.x),top:Math.min(y,p.y),width:Math.abs(x-p.x),height:Math.abs(y-p.y)});}}
        onPointerUp={()=>{dragStart.current=null;setDragRect(null);}}
        onPointerCancel={()=>{dragStart.current=null;setDragRect(null);}}
        onKeyDownCapture={(e) => {
          if (tool !== "store") return;
          const d: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, 1],
            ArrowDown: [0, -1],
          };
          if (d[e.key]) {
            e.preventDefault();
            e.stopPropagation();
            onCursor({
              x: Math.max(definition.map?0:-4, Math.min(definition.map?definition.map.width-1:4,cursor.x+d[e.key][0])),
              z: Math.max(definition.map?0:-3, Math.min(definition.map?definition.map.depth-1:3,cursor.z+d[e.key][1])),
            });
          } else if (e.key === "Enter") {
            e.preventDefault();
            onPick(cursor);
          }
        }}
      />
      {dragRect&&<div className="selection-rectangle" style={dragRect} aria-hidden="true"/>}
      <div className="landscape-labels">
        {state.world&&tool==="store"&&definition.pads.filter(p=>p.kind==="store").map(p=><button className="tree-label" key={p.id} ref={el=>{labels.current[p.id]=el;}} onClick={()=>onPick(p.at)}>{p.name}<small>Commission · 4 reeds</small></button>)}
        {!targeting&&state.birds.map((worker) => { const b={id:worker.id,name:worker.life.name}; return (
          <button
            key={b.id}
            ref={(el) => {
              labels.current[b.id] = el;
            }}
            className={`bird-label${selectedIds.includes(b.id) ? " active" : ""}`}
            aria-label={`Select ${b.name} in landscape`}
            onClick={e => onSelect(b.id,e.shiftKey)}
          >
            {b.name}
          </button>
        );})}
        {trees.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              labels.current[t.id] = el;
            }}
            className="tree-label"
            hidden={!!targeting||tool!=="build"}
            disabled={homePlacement&&placementKind!=="store"&&!treeBuildOptions(state,t.id).find(o=>o.kind===placementKind)?.available}
            onClick={() => {
              onCursor({ x: t.x, z: t.z });
              onTree(t.id);
            }}
            aria-label={homePlacement?`Commission ${placementKind} at ${t.name}`:`Choose ${t.name} tree`}
          >
            {t.name}
            <small>
              {homePlacement?"Commission here":<>2 natural
              {shelteredCapacity(state,t.id)>0
                ? ` + ${shelteredCapacity(state,t.id)} sheltered`
                : " branches"}</>}
            </small>
          </button>
        ))}
        {visibleProjects.map(site=>{const focused=site.id===state.constructionFocus;const care=site.complete&&site.kind==="nursery"?nurseryReadout(state,site.id):null;const readout=care??projectReadout(state,site);const others=state.sites.filter(s=>s.tree===site.tree&&!s.complete&&s.id!==site.id).length;const label=site.kind==="treehouse"?"Home":site.kind==="sleeping-deck"?"Deck":site.kind==="hauling-basket"?"Basket":site.kind==="store"?"Reed store":"Nursery";return <button key={site.id} hidden={homePlacement||!!targeting} className={`project-label${site.complete?" complete":""}${focused?" is-focused":""}`} ref={el=>{labels.current[site.id]=el;}} onContextMenu={e=>{e.preventDefault();if(!site.complete)onOrder({kind:"build",target:site.id},e.shiftKey);}} onClick={()=>care?onNursery(site.id):site.complete&&site.kind!=="store"?onTree(site.tree!):onProject(site.id)} aria-label={`${label} at ${buildingPlace(state,site)}: ${readout.title}${focused?", building first":""}`}>
          <ActionArt kind={site.kind==="treehouse"?"home":site.kind==="sleeping-deck"?"deck":site.kind==="hauling-basket"?"basket":site.kind==="store"?"store":"nursery"}/><span><strong>{care?care.title:site.kind==="store"?`${buildingPlace(state,site)} · ${site.complete?`${site.stock}/12 bundles`:readout.title.toLowerCase()}`:`${label} · ${readout.title.toLowerCase()}`}</strong>{care?<small>{care.stage==="No brood supported"?"Nursery · choose a hen":`${care.carer?.life.name??"Young"} · ${care.progress}% ${care.progressLabel==="Growth toward adulthood"?"grown":"this stage"}`}</small>:!site.complete&&<small>{focused?"First · ":""}{site.delivered}/{cost(site)} reeds · {readout.progress}%{others?` · +${others} more`:""}</small>}</span>
        </button>;})}
        {state.forage.map(p => <button key={p.id} className="tree-label forage-label" hidden={!!targeting||tool !== "forage"} ref={el => {labels.current[p.id] = el;}} onClick={() => onForage(p.id)} aria-label={`Inspect ${p.id} forage place`}>
          {foodPatches.find(f => f.id === p.id)?.name ?? p.id}<small>{p.remaining}/{p.capacity} food · {p.open ? "open" : "resting"}</small>
        </button>)}
        {state.patches.map(p=><button key={p.id} className={`tree-label patch-label${selectedPatch===p.id?" active":""}`} hidden={!!targeting||(tool!=="gather"&&!selectedIds.length)} ref={el=>{labels.current[p.id]=el;}} onContextMenu={e=>{e.preventDefault();onOrder({kind:"gather",target:p.id},e.shiftKey);}} onClick={()=>onPatch(p.id)} aria-label={`Inspect ${reedPatchName(state,p.id)}`}>
          {reedPatchName(state,p.id)}<small>{p.remaining} harvestable · {p.designated?"gathering":"available"}</small>
        </button>)}
        <button
          ref={(el) => {
            labels.current.reeds = el;
          }}
          className="tree-label source-label"
          hidden={!!targeting||(tool!=="gather" && tool!=="build" && tool!=="store")}
          onClick={() => onCursor(definition.source.at)}
        >
          Reed cache<small>{state.piles[0].stock} local bundles</small>
        </button>
      </div>
      {error && (
        <p className="scene-error" role="alert">
          {error}
        </p>
      )}
      <div className="world-caption">
        <span className="eyebrow">{state.world?"CHICKEN CIV · LIVING VALLEY":"THE CANOPY COMMONS"}</span>
        <span>
          {state.phase === "evening"
            ? "Evening · secure loads, then settle"
            : "Day · ground work, canopy dreams"}
          {state.paused ? " · PAUSED" : ""}
        </span>
      </div>
      <p id="camera-hint" className="camera-hint">
        {targeting?`Choose ${targeting==="move"?"reachable ground":targeting==="gather"?"a reed patch":"an unfinished project"} · click/tap to order · Escape cancels`:homePlacement?"Choose a marked place to commission · Escape or Cancel stops placement":tool === "inspect" ? state.world?"Choose a chicken or Longbough · real gathering, building and care":"Choose a bird · fixed grove view" : tool === "forage" ? "Choose a food place · let chickens forage" : tool === "gather" ? "Choose a construction reed patch" : tool === "build" ? "Choose a named tree · build where it belongs" : state.world?"Choose a marked store court":"STORE · choose a cell · arrows move cursor · Enter uses tool"}
      </p>
    </section>
  );
}
