import { BBOX, Pos2 } from "./types";

const D2R = Math.PI / 180;

/**
 * Project a lon/lat point into projected mercator space.
 */
export function proj(ll: Pos2): Pos2 {
  // Arbitrary.
  var size = 524288;
  var d = size / 2;
  var bc = size / 360;
  var cc = size / (2 * Math.PI);
  var ac = size;
  var f = Math.min(Math.max(Math.sin(D2R * ll[1]), -0.9999), 0.9999);
  var x = d + ll[0] * bc;
  var y = d + 0.5 * Math.log((1 + f) / (1 - f)) * -cc;
  y > ac && (y = ac);
  return [x, y];
}

/**
 * Get an interpolation vector from a lon/lat BBOX to
 * a pixel-sized box.
 */
export function getLerp(bbox: BBOX, [width, height]: Pos2, [dx, dy]: Pos2) {
  const sw = proj([bbox[0], bbox[1]]);
  const ne = proj([bbox[2], bbox[3]]);

  return ([lon, lat]: Pos2) => {
    return [
      (width * (lon - sw[0])) / (ne[0] - sw[0]) + dx,
      height - (height * (lat - sw[1])) / (ne[1] - sw[1]) + dy,
    ].join(" ");
  };
}
