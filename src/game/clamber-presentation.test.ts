import { expect, test } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createClamberPivot, poseClamberPivot } from "./clamber-presentation";

test("animation-keyed head and wing stay with the torso while supported legs and reset stay exact", () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const body = new TransformNode("body", scene);
  const torso = new TransformNode("torso", scene); torso.parent = body;
  const head = new TransformNode("head", scene); head.parent = body; head.position.set(0, 1.24, .31);
  const wing = new TransformNode("wing", scene); wing.parent = body; wing.position.set(.39, 1.02, .03);
  const leg = new TransformNode("leg-left", scene); leg.parent = body; leg.position.set(-.21, .37, .035);
  const originalHead = head.position.clone(), originalWing = wing.position.clone(), originalLeg = leg.position.clone();
  const pivot = createClamberPivot(body, "clamber");
  // Existing clips write their original local key values after the hierarchy is created.
  head.position.copyFrom(originalHead); wing.position.copyFrom(originalWing);
  for (const lean of [0, .35, .45, .55, 0]) {
    poseClamberPivot(pivot, lean);
    [body, pivot, torso, head, wing, leg].forEach(node => node.computeWorldMatrix(true));
    expect(Vector3.Distance(head.getAbsolutePosition(), torso.getAbsolutePosition())).toBeCloseTo(originalHead.length(), 6);
    expect(Vector3.Distance(wing.getAbsolutePosition(), torso.getAbsolutePosition())).toBeCloseTo(originalWing.length(), 6);
    expect(Vector3.Distance(leg.getAbsolutePosition(), originalLeg)).toBeLessThan(1e-7);
    if (!lean) expect(Vector3.Distance(head.getAbsolutePosition(), originalHead)).toBeLessThan(1e-7);
  }
  expect(leg.parent).toBe(body); expect(head.parent).toBe(pivot);
  scene.dispose(); engine.dispose();
});
