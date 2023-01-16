import { GROUPS } from "./types";

interface Style {
  fillStyleId?: string;
  strokeStyleId?: string;
  strokeWeight?: number;
  dashPattern?: number[];
  radius?: number;
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

function createColorPaint255(
  name: string,
  [r, g, b]: [number, number, number]
) {
  return createColorPaint(name, [r / 255, g / 255, b / 255]);
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
  [GROUPS.Tree]: once(() => {
    const fillStyle = createColorPaint255("Tree fill", [157, 219, 150]);
    return {
      fillStyleId: fillStyle.id,
      radius: 2,
      strokeWeight: 0,
    };
  }),
  [GROUPS.University]: once(() => {
    const fillStyle = createColorPaint255("Education spaces", [254, 255, 230]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Industrial]: once(() => {
    const fillStyle = createColorPaint255("Industrial", [236, 219, 233]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Commercial]: once(() => {
    const fillStyle = createColorPaint255("Commercial", [243, 217, 217]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Residential]: once(() => {
    const fillStyle = createColorPaint255("Residential areas", [225, 225, 225]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Wood]: once(() => {
    const fillStyle = createColorPaint255("Wood fill", [174, 209, 159]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Pitch]: once(() => {
    const fillStyle = createColorPaint255("Pitch fill", [170, 224, 203]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Park]: once(() => {
    const fillStyle = createColorPaint255("Park fill", [190, 253, 200]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.WaterLine]: once(() => {
    const fillStyle = createColorPaint("Water line stroke", [0.7, 0.7, 0.9]);
    return {
      strokeStyleId: fillStyle.id,
      strokeWeight: 2,
    };
  }),
  [GROUPS.WaterArea]: once(() => {
    const fillStyle = createColorPaint("Water area fill", [0.7, 0.7, 0.9]);
    return {
      fillStyleId: fillStyle.id,
      strokeWeight: 0,
    };
  }),
  [GROUPS.Water]: once(() => {
    const fillStyle = createColorPaint("Water area stroke", [0.7, 0.7, 0.9]);
    return {
      strokeStyleId: fillStyle.id,
      strokeWeight: 4,
    };
  }),
  [GROUPS.TrafficRoadMajor]: once(() => {
    const strokeStyle = createColorPaint255(
      "Traffic road major",
      [252, 214, 164]
    );
    return {
      strokeStyleId: strokeStyle.id,
      strokeWeight: 5,
    };
  }),
  [GROUPS.TrafficRoadSupermajor]: once(() => {
    const strokeStyle = createColorPaint255(
      "Traffic road super-major",
      [232, 146, 162]
    );
    return {
      strokeStyleId: strokeStyle.id,
      strokeWeight: 6,
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

export function applyStyle(
  vec: VectorNode | EllipseNode,
  style: Style,
  scaleFactor: number
) {
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

  if (vec.type === "ELLIPSE" && style.radius) {
    const dim = style.radius * (scaleFactor * 0.00002);
    vec.resize(dim, dim);
  }
}
