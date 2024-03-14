import { GROUPS } from "./types";

interface Style {
  fillStyleId?: string;
  strokeStyleId?: string;
  strokeWeight?: number;
  dashPattern?: number[];
  radius?: number;
}

export const getStyles = async (reset: boolean) => {
  async function createColorPaint255(
    name: string,
    [r, g, b]: [number, number, number]
  ) {
    return createColorPaint(name, [r / 255, g / 255, b / 255]);
  }

  async function createColorPaint(
    name: string,
    [r, g, b]: [number, number, number],
    opacity = 1
  ) {
    const styles = await figma.getLocalPaintStylesAsync();

    const existing = styles.find((style) => {
      return style.name === name;
    });
    if (existing) {
      if (reset) {
        existing.remove();
      } else {
        return existing;
      }
    }

    const style = figma.createPaintStyle();
    style.name = name;
    style.paints = [
      {
        color: { r, g, b },
        opacity,
        type: "SOLID",
      },
    ];
    return style;
  }

  // TODO: why did this have to be wrapped in (async )?
  const labelStyle = await (async () => {
    const fillStyle = await createColorPaint255("Label fill", [0, 0, 0]);
    const strokeStyle = await createColorPaint255(
      "Label stroke",
      [255, 255, 255]
    );
    return {
      fillStyleId: fillStyle.id,
      strokeStyleId: strokeStyle.id,
      strokeWeight: 1,
    };
  })();

  const STYLES: Record<GROUPS, Style> = {
    [GROUPS.Building]: await (async () => {
      const fillStyle = await createColorPaint(
        "Building fill",
        [0.8, 0.8, 0.8]
      );
      const strokeStyle = await createColorPaint(
        "Building stroke",
        [0.7, 0.7, 0.7]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeStyleId: strokeStyle.id,
        strokeWeight: 0.5,
      };
    })(),
    [GROUPS.OverlayPolygon]: await (async () => {
      const fillStyle = await createColorPaint(
        "Polygon fill",
        [0.0, 0.9, 0.9],
        0.5
      );
      const strokeStyle = await createColorPaint(
        "Polygon stroke",
        [0.0, 0.5, 0.5]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeStyleId: strokeStyle.id,
        strokeWeight: 1,
      };
    })(),
    [GROUPS.OverlayLine]: await (async () => {
      const strokeStyle = await createColorPaint255(
        "Line stroke",
        [0, 200, 200]
      );
      return {
        strokeStyleId: strokeStyle.id,
        strokeWeight: 4,
      };
    })(),
    [GROUPS.OverlayPoint]: await (async () => {
      const fillStyle = await createColorPaint255(
        "Overlay point",
        [50, 50, 50]
      );
      return {
        fillStyleId: fillStyle.id,
        radius: 4,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Tree]: await (async () => {
      const fillStyle = await createColorPaint255("Tree fill", [157, 219, 150]);
      return {
        fillStyleId: fillStyle.id,
        radius: 2,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.University]: await (async () => {
      const fillStyle = await createColorPaint255(
        "Education spaces",
        [254, 255, 230]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Industrial]: await (async () => {
      const fillStyle = await createColorPaint255(
        "Industrial",
        [236, 219, 233]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Commercial]: await (async () => {
      const fillStyle = await createColorPaint255(
        "Commercial",
        [243, 217, 217]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Residential]: await (async () => {
      const fillStyle = await createColorPaint255(
        "Residential areas",
        [225, 225, 225]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Wood]: await (async () => {
      const fillStyle = await createColorPaint255("Wood fill", [174, 209, 159]);
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Pitch]: await (async () => {
      const fillStyle = await createColorPaint255(
        "Pitch fill",
        [170, 224, 203]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Park]: await (async () => {
      const fillStyle = await createColorPaint255("Park fill", [190, 253, 200]);
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.WaterLine]: await (async () => {
      const fillStyle = await createColorPaint(
        "Water line stroke",
        [0.7, 0.7, 0.9]
      );
      return {
        strokeStyleId: fillStyle.id,
        strokeWeight: 2,
      };
    })(),
    [GROUPS.WaterArea]: await (async () => {
      const fillStyle = await createColorPaint(
        "Water area fill",
        [0.7, 0.7, 0.9]
      );
      return {
        fillStyleId: fillStyle.id,
        strokeWeight: 0,
      };
    })(),
    [GROUPS.Water]: await (async () => {
      const fillStyle = await createColorPaint(
        "Water area stroke",
        [0.7, 0.7, 0.9]
      );
      return {
        strokeStyleId: fillStyle.id,
        strokeWeight: 4,
      };
    })(),
    [GROUPS.TrafficRoadMajor]: await (async () => {
      const strokeStyle = await createColorPaint255(
        "Traffic road major",
        [252, 214, 164]
      );
      return {
        strokeStyleId: strokeStyle.id,
        strokeWeight: 5,
      };
    })(),
    [GROUPS.TrafficRoadSupermajor]: await (async () => {
      const strokeStyle = await createColorPaint255(
        "Traffic road super-major",
        [232, 146, 162]
      );
      return {
        strokeStyleId: strokeStyle.id,
        strokeWeight: 6,
      };
    })(),
    [GROUPS.TrafficRoad]: await (async () => {
      const fillStyle = await createColorPaint("Traffic road", [0.6, 0.6, 0.6]);
      return {
        strokeStyleId: fillStyle.id,
        strokeWeight: 2,
      };
    })(),
    [GROUPS.ServiceRoad]: await (async () => {
      const fillStyle = await createColorPaint("Service road", [0.7, 0.6, 0.6]);
      return {
        strokeStyleId: fillStyle.id,
        strokeWeight: 1,
      };
    })(),
    [GROUPS.Rail]: await (async () => {
      const strokeStyle = await createColorPaint("Rail", [0.5, 0.6, 0.8]);
      return {
        strokeStyleId: strokeStyle.id,
        strokeWeight: 1,
      };
    })(),
    [GROUPS.Path]: await (async () => {
      const strokeStyle = await createColorPaint("Path", [0.6, 0.6, 0.6]);
      return {
        strokeStyleId: strokeStyle.id,
        dashPattern: [2, 1],
        strokeWeight: 0.5,
      };
    })(),
  };
  return { STYLES, labelStyle };
};

export async function applyStyle(
  vec: VectorNode | EllipseNode | TextNode,
  style: Style,
  scaleFactor: number
) {
  if (style.fillStyleId) {
    vec.setFillStyleIdAsync(style.fillStyleId);
  }
  if (style.strokeStyleId) {
    vec.setStrokeStyleIdAsync(style.strokeStyleId);
  }
  if (style.dashPattern) {
    vec.dashPattern = style.dashPattern.map((d) => d * (scaleFactor * 0.00002));
  }
  if (style.strokeWeight !== undefined) {
    if (style.strokeWeight === 0) {
      vec.strokeWeight = 0;
    } else if (vec.type === "TEXT") {
      vec.strokeJoin = "ROUND";
      vec.strokeWeight = Math.max(
        1,
        style.strokeWeight * (scaleFactor * 0.000002)
      );
    } else {
      vec.strokeJoin = "ROUND";
      vec.strokeWeight = style.strokeWeight * (scaleFactor * 0.00002);
    }
  }

  if (vec.type === "ELLIPSE" && style.radius) {
    const dim = style.radius * (scaleFactor * 0.00002);
    vec.resize(dim, dim);
  }
}
