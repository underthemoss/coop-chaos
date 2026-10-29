import { cameraEdgeAxis, type PanAxis } from "./clearing-camera";

const arrows: Record<string, PanAxis> = {
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
};

/** Render input only. Reset paths release intent; no momentum or game commands. */
export class ClearingPanInput {
  private edge: PanAxis = { x: 0, y: 0 };
  private keys = new Set<string>();
  private buttons = 0;
  private drag: { id: number; x: number; y: number } | null = null;

  hover(point: PanAxis, width: number, height: number, buttons: number, unobscured: boolean) {
    this.buttons = buttons;
    this.edge = unobscured && !buttons && !this.drag ? cameraEdgeAxis(point, width, height) : { x: 0, y: 0 };
  }
  leave() { this.edge = { x: 0, y: 0 }; }
  press(buttons: number) { this.buttons = buttons; this.leave(); }
  release(buttons: number) { this.buttons = buttons; this.leave(); }
  keyDown(key: string, eligible: boolean) {
    if (!eligible || !arrows[key]) return false;
    this.keys.add(key); return true;
  }
  keyUp(key: string) { this.keys.delete(key); }
  clearKeys() { this.keys.clear(); }
  direction(): PanAxis {
    if (this.buttons || this.drag) return { x: 0, y: 0 };
    if (!this.keys.size) return this.edge;
    return [...this.keys].reduce((axis, key) => ({ x: axis.x + arrows[key].x, y: axis.y + arrows[key].y }), { x: 0, y: 0 });
  }
  beginDrag(id: number, x: number, y: number) { this.leave(); this.drag = { id, x, y }; }
  dragId() { return this.drag?.id ?? null; }
  dragTo(id: number, x: number, y: number): PanAxis | null {
    if (this.drag?.id !== id) return null;
    const delta = { x: this.drag.x - x, y: this.drag.y - y };
    this.drag = { id, x, y }; return delta;
  }
  endDrag(id: number) { if (this.drag?.id === id) this.drag = null; this.leave(); }
  reset() { this.keys.clear(); this.buttons = 0; this.drag = null; this.leave(); }
}
