import { Pos2 } from "./types";

export interface LabelableSegment {
  length: number;
  beginIndex: number;
  beginDistance: number;
  endIndex: number;
  endDistance: number;
}

// code from https://github.com/naturalatlas/linelabel (Apache2)
export const linelabel = (
  pts: Pos2[],
  targetLen: number
): LabelableSegment[] => {
  const max_angle_delta: number = Math.PI / 45;
  const chunks = [];
  let a,
    b,
    c,
    i = 0,
    n = 0,
    d = 0;
  let abmag = 0,
    bcmag = 0;
  let abx = 0,
    aby = 0;
  let bcx = 0,
    bcy = 0;
  let dt = 0;
  let i_start = 0;
  let d_start = 0;

  if (pts.length < 2) return [];
  if (pts.length === 2) {
    d = Math.sqrt(
      Math.pow(pts[1][0] - pts[0][0], 2) + Math.pow(pts[1][1] - pts[0][1], 2)
    );

    return [
      {
        length: d,
        beginIndex: 0,
        beginDistance: 0,
        endIndex: 2,
        endDistance: d,
      },
    ];
  }

  abmag = Math.sqrt(
    Math.pow(pts[1][0] - pts[0][0], 2) + Math.pow(pts[1][1] - pts[0][1], 2)
  );
  for (i = 1, n = pts.length - 1; i < n; i++) {
    a = pts[i - 1];
    b = pts[i];
    c = pts[i + 1];
    abx = b[0] - a[0];
    aby = b[1] - a[1];
    bcx = c[0] - b[0];
    bcy = c[1] - b[1];
    bcmag = Math.sqrt(bcx * bcx + bcy * bcy);
    d += abmag;

    dt = Math.acos((abx * bcx + aby * bcy) / (abmag * bcmag));
    if (dt > max_angle_delta || d - d_start > targetLen) {
      chunks.push({
        length: d - d_start,
        beginDistance: d_start,
        beginIndex: i_start,
        endIndex: i + 1,
        endDistance: d,
      });
      i_start = i;
      d_start = d;
    }
    abmag = bcmag;
  }

  if (i - i_start > 0) {
    chunks.push({
      length: d - d_start + bcmag,
      beginIndex: i_start,
      beginDistance: d_start,
      endIndex: i + 1,
      endDistance: d + bcmag,
    });
  }
  return chunks;
};
