import { GROUPS } from "./types";

interface Style {
  fillStyleId?: string;
  strokeStyleId?: string;
  strokeWeight?: number;
  dashPattern?: number[];
}

function once(fn: () => Style) {
  let res: Style | null = null;
  return () => {
    if (!res) {
      res = fn();
    }
    return res;
  };
}

function createColorPaint(name: string, [r, g, b]: [number, number, number]) {
  const styles = figma.getLocalPaintStyles();

  let existing = styles.find((style) => {
    return style.name === name;
  });
  if (existing) return existing;

  const style = figma.createPaintStyle();
  style.name = name;
  style.paints = [
    {
      color: { r, g, b },
      type: "SOLID",
    },
  ];
  return style;
}

export const STYLES: Record<GROUPS, () => Style> = {
  [GROUPS.Building]: once(() => {
    const fillStyle = createColorPaint("Building fill", [0.8, 0.8, 0.8]);
    const strokeStyle = createColorPaint("Building stroke", [0.7, 0.7, 0.7]);
    return {
      fillStyleId: fillStyle.id,
      strokeStyleId: strokeStyle.id,
      strokeWeight: 0.5,
    };
  }),
  [GROUPS.Park]: once(() => {
    const fillStyle = createColorPaint("Park fill", [
      0.82745098,
      234 / 255,
      181 / 255,
    ]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Water]: once(() => {
    const fillStyle = createColorPaint("Water fill", [0.7, 0.7, 0.9]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.TrafficRoadMajor]: once(() => {
    const strokeStyle = createColorPaint("Traffic road major", [
      200 / 255,
      190 / 255,
      130 / 255,
    ]);
    return {
      strokeStyleId: strokeStyle.id,
      strokeWeight: 4,
    };
  }),
  [GROUPS.TrafficRoad]: once(() => {
    const fillStyle = createColorPaint("Traffic road", [0.6, 0.6, 0.6]);
    return {
      strokeStyleId: fillStyle.id,
      strokeWeight: 2,
    };
  }),
  [GROUPS.ServiceRoad]: once(() => {
    const fillStyle = createColorPaint("Service road", [0.7, 0.6, 0.6]);
    return {
      strokeStyleId: fillStyle.id,
      strokeWeight: 1,
    };
  }),
  [GROUPS.Rail]: once(() => {
    const strokeStyle = createColorPaint("Rail", [0.5, 0.6, 0.8]);
    return {
      strokeStyleId: strokeStyle.id,
      strokeWeight: 1,
    };
  }),
  [GROUPS.Path]: once(() => {
    const strokeStyle = createColorPaint("Path", [0.6, 0.6, 0.6]);
    return {
      strokeStyleId: strokeStyle.id,
      dashPattern: [2, 1],
      strokeWeight: 0.5,
    };
  }),
};

export function applyStyle(vec: VectorNode, style: Style, scaleFactor: number) {
  if (style.fillStyleId) {
    vec.fillStyleId = style.fillStyleId;
  }
  if (style.strokeStyleId) {
    vec.strokeStyleId = style.strokeStyleId;
  }
  if (style.dashPattern) {
    vec.dashPattern = style.dashPattern.map((d) => d * (scaleFactor * 0.00002));
  }
  if (style.strokeWeight !== undefined) {
    if (style.strokeWeight === 0) {
      vec.strokeWeight = 0;
    } else {
      vec.strokeJoin = "ROUND";
      vec.strokeWeight = Math.max(
        0.2,
        Math.round(style.strokeWeight * (scaleFactor * 0.00002))
      );
    }
  }
}
