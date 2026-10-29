// Plain shared state between the WebGL stage and DOM overlays. Written by the stage every frame, read by
// overlays that need to stay glued to the 3D object (hero callouts). No React state: nothing re-renders.
export const stageBus = {
  /** Screen-space anchors (CSS px, viewport coordinates) of the three slabs: [x0, y0, x1, y1, x2, y2]. */
  anchors: new Float32Array(6),
  /** 0..1 how strongly the viewport centre is inside a section that asked for the hero pose. */
  hero: 0,
  ready: false,
  /**
   * Overrides a DOM overlay can lay on the stage target (the login form uses it): filament -1 = not driven,
   * glow and dim are added to the target, kick is added to the yaw (a short shove when a password is wrong).
   */
  drive: { filament: -1, glow: 0, dim: 0, kick: 0 },
};
