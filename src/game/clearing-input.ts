import { settlementWorld, type WorldContext } from "../content/settlement-world";
import { validCell, type Cell } from "../simulation/settlement";

export type GroundPickMiss = "no-ground" | "outside-world";
export type GroundPick = { kind: "cell"; at: Cell } | { kind: "miss"; reason: GroundPickMiss };

/** Convert an actual terrain hit; misses never invent or clamp a destination. */
export function groundPick(point: { x: number; z: number } | null, context?: WorldContext): GroundPick {
  if (!point) return { kind: "miss", reason: "no-ground" };
  const map = settlementWorld(context).map;
  const at = map
    ? { x: Math.round(point.x / map.cellSize + map.width / 2 - .5), z: Math.round(point.z / map.cellSize + map.depth / 2 - .5) }
    : { x: Math.round(point.x / 2), z: Math.round(point.z / 2) };
  return validCell(at, context) ? { kind: "cell", at } : { kind: "miss", reason: "outside-world" };
}

export type ScreenBounds = { left: number; top: number; right: number; bottom: number };
type ScreenPoint = { x: number; y: number };

/** Body geometry is selectable independently of whether its name label is shown. */
export function projectedBodyBounds(points: readonly (ScreenPoint & { z: number })[], width: number, height: number): ScreenBounds | null {
  const front=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.z>=0&&p.z<=1);
  if(!front.length)return null;
  const left=Math.min(...front.map(p=>p.x)), right=Math.max(...front.map(p=>p.x));
  const top=Math.min(...front.map(p=>p.y)), bottom=Math.max(...front.map(p=>p.y));
  if(right<0||left>width||bottom<0||top>height)return null;
  return {left:Math.max(0,left),top:Math.max(0,top),right:Math.min(width,right),bottom:Math.min(height,bottom)};
}

export function marqueeBirds(birds: ReadonlyMap<string,ScreenBounds>, from: ScreenPoint, to: ScreenPoint): string[] {
  const left=Math.min(from.x,to.x),right=Math.max(from.x,to.x),top=Math.min(from.y,to.y),bottom=Math.max(from.y,to.y);
  return [...birds].filter(([,body])=>body.right>=left&&body.left<=right&&body.bottom>=top&&body.top<=bottom).map(([id])=>id);
}
