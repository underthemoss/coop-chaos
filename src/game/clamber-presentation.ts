import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

/** Upper-body wrapper leaves the rig's animation-keyed local coordinates intact. */
export function createClamberPivot(body: TransformNode, name: string) {
  const upper = new TransformNode(name, body.getScene());
  upper.metadata = { clamberPivot: true };
  upper.parent = body;
  body.computeWorldMatrix(true); upper.computeWorldMatrix(true);
  for (const child of body.getChildren()) {
    if (child !== upper && child instanceof TransformNode && !child.name.startsWith("leg-")) child.setParent(upper);
  }
  return upper;
}

export function poseClamberPivot(upper: TransformNode, lean: number) {
  upper.rotation.x = lean;
  // T(hip) * R * T(-hip): no translated parent origin for keyed head/wing positions.
  upper.position.set(0, .75 * (1 - Math.cos(lean)), -.75 * Math.sin(lean));
}
