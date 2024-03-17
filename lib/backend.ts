import { buildNetwork } from "./network";
import polylabel from "polylabel";
import { geoMercator, geoStream } from "d3-geo";
import { request } from "./request";
// @ts-expect-error this doesn't have types
import normalize from "@mapbox/geojson-normalize";
import { rewindFeatureCollection } from "@placemarkio/geojson-rewind";
import { applyStyle, getStyles } from "./styles";
import {
  BBOX,
  GROUP_AREA_LABEL_ORDER,
  GROUP_LABEL_ORDER,
  GROUP_ORDER,
  Pos2,
} from "./types";
import { progress } from "./progress";
import { STORAGE_KEY, ATTACHED_KEY } from "./constants";
import { getMaybeParentFrame } from "./selection";
import { Position } from "geojson";
import RBush from "rbush";
import { LabelableSegment, linelabel } from "./linelabel";
import { centerSort } from "./center_sort";

/*
function rewindRing(ring: Position[], dir: boolean) {
  var area = 0,
    err = 0;
  for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    var k = (ring[i][0] - ring[j][0]) * (ring[j][1] + ring[i][1]);
    var m = area + k;
    err += Math.abs(area) >= Math.abs(k) ? area - m + k : k - m + area;
    area = m;
  }
  if (area + err >= 0 !== !!dir) ring.reverse();
  return ring;
}
*/

// Don't show very long labels.
const MAX_NAME_LENGTH = 20;
// If something is smaller than 1/80 of the
// map area, don't label it.
const AREA_RATIO_CUTOFF = 80;
const R2D = 180 / Math.PI;

/*
type Overlay = {
  name: string;
  geojson: any;
};
*/

type IAttachedData = {
  version: 1;
  bbox: string;
};

const frame = (() => {
  const sel = figma.currentPage.selection[0];

  if (sel?.type === "FRAME") {
    return sel;
  }

  /**
   * If the user has selected something inside of a map,
   * find the map frame as a parent of that selection.
   */
  const parentSel = getMaybeParentFrame(sel);
  if (parentSel) {
    return parentSel;
  }

  const frame = figma.createFrame();
  frame.name = "Placemark Map";
  frame.resize(720, 360);
  figma.viewport.scrollAndZoomIntoView([frame]);
  return frame;
})();

const aspect = frame.width / frame.height;
const dim = 720;

figma.showUI(__html__, {
  width: Math.round(dim),
  height: Math.round(dim / aspect) + 50,
});

figma.ui.postMessage({
  type: "ratio",
  width: frame.width,
  height: frame.height,
});

const attached = frame.getPluginData(ATTACHED_KEY);
if (attached) {
  try {
    const data = JSON.parse(attached);
    if (data.version === 1) {
      figma.ui.postMessage({
        type: "recover-viewport",
        bbox: data.bbox,
      });
    }
  } catch (e) {}
} else {
  void figma.clientStorage.getAsync(STORAGE_KEY).then((stored) => {
    if (stored) {
      figma.ui.postMessage({
        type: "recover-viewport",
        bbox: stored,
      });
    }
  });
}

void figma.clientStorage.getAsync("settings").then((settings) => {
  if (settings) {
    figma.ui.postMessage({
      type: "settings",
      settings,
    });
  }
});

figma.ui.onmessage = (msg) => {
  switch (msg.type) {
    case "cancel": {
      figma.closePlugin();
      break;
    }
    case "save-viewport": {
      void figma.clientStorage.setAsync(STORAGE_KEY, msg.bbox);
      break;
    }
    case "setting": {
      void figma.clientStorage.getAsync("settings").then((settings) => {
        if (!settings) settings = {};
        settings[msg.name] = msg.value;
        return figma.clientStorage.setAsync("settings", settings);
      });
      break;
    }
    case "render-map": {
      const attached: IAttachedData = {
        version: 1,
        bbox: msg.bbox,
      };
      frame.setPluginData(ATTACHED_KEY, JSON.stringify(attached));
      render(
        msg.bbox.split(",").map((b: string) => parseFloat(b)),
        { overlays: msg.overlays }
      )
        .catch((e) => {
          progress(e.message, { error: true });
        })
        .finally(() => {
          figma.ui.postMessage({
            type: "loaded",
          });
        });
    }
  }
};

interface Settings {
  labelSize: number;
  resetStyles: boolean;
}

const defaultSettings: Settings = {
  labelSize: 5,
  resetStyles: false,
};

async function getSettings(): Promise<Settings> {
  const settings = (await figma.clientStorage.getAsync("settings")) || {};

  if (!settings) {
    return defaultSettings;
  }

  const combined = Object.assign({}, defaultSettings, settings);

  return {
    labelSize: parseFloat(combined.labelSize),
    resetStyles: !!combined.resetStyles,
  };
}

interface Options {
  overlays?: any[];
}

async function render(bbox: BBOX, options: Options = {}) {
  const overlays = options?.overlays || [];
  const settings = await getSettings();
  const { width, height, x, y } = frame;
  const scaleFactor = width / (bbox[2] - bbox[0]);
  const { STYLES, labelStyle } = await getStyles(!!settings.resetStyles);

  console.log("Got styles, rendering now");

  const proj = geoMercator()
    .fitExtent(
      [
        [x, y],
        [x + width, y + height],
      ],
      {
        type: "LineString",
        coordinates: [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
      }
    )
    .clipExtent([
      [x - 100, y - 100],
      [x + width + 100, y + height + 100],
    ]);

  progress("Requesting data");

  const j = await request(bbox);
  progress("Building network");

  const grouped = buildNetwork(j);
  progress("Creating frame");

  let drawn = 0;

  clear();

  function projectRing(ring: Position[]) {
    return ring.map((position) => proj(position as Pos2)!);
  }

  function encodeRingXY(ring: Position[]) {
    return ring
      .map(
        (position, i) =>
          `${i === 0 ? "M" : "L"} ${(position as Pos2)?.join(" ")}`
      )
      .join(" ");
  }

  function encodeRing(ring: Position[]) {
    return ring
      .map(
        (position, i) =>
          `${i === 0 ? "M" : "L"} ${proj(position as Pos2)?.join(" ")}`
      )
      .join(" ");
  }

  /**
   * Label size is relative to the size of the output, because drawings
   * can be any pixel size imaginable.
   */
  const labelSize = settings.labelSize * (frame.height / 180);

  /**
   * This index is used to make sure that labels don’t collide.
   */
  const labelIndex = new RBush();
  const labels = [];

  /**
   * For labels on areas, we want to prioritize labels by the size
   * of the area in descending order. So, this map keeps track of each
   * feature's area.
   */
  const featureAreas = new Map<string, number>();

  for (const group of GROUP_ORDER) {
    const features = grouped.get(group);
    if (!features) continue;
    console.log(`Rendering ${group} (${features.length} features)`);

    const vecs = [];

    const style = STYLES[group];

    for (const feature of features) {
      drawn++;
      progress(
        `Drawing (${drawn} / ${features.length} elements), ${feature.geometry.type}`
      );
      // await new Promise<void>((resolve) => resolve());

      const name = feature.properties?.name;
      switch (feature.geometry.type) {
        case "Polygon":
        case "LineString":
        case "MultiLineString": {
          const vec = figma.createVector();
          await applyStyle(vec, style, scaleFactor);

          if (name) {
            vec.name = name;
          }

          const type = feature.geometry.type;

          const data =
            type === "LineString"
              ? [encodeRing(feature.geometry.coordinates)]
              : type === "MultiLineString" || type === "Polygon"
              ? feature.geometry.coordinates.map(encodeRing)
              : [];

          vec.vectorPaths = data.map((data) => {
            return {
              windingRule: "EVENODD",
              data,
            };
          });

          figma.currentPage.appendChild(vec);

          featureAreas.set(
            feature.properties!.id,
            vec.absoluteBoundingBox!.width * vec.absoluteBoundingBox!.height
          );

          vecs.push(vec);
          break;
        }
        case "Point": {
          const c = figma.createEllipse();
          await applyStyle(c, style, scaleFactor);

          if (feature.properties?.name) {
            c.name = feature.properties.name;
          }

          const [x, y] = proj(feature.geometry.coordinates as Pos2)!;
          c.x = x;
          c.y = y;

          figma.currentPage.appendChild(c);
          vecs.push(c);
          break;
        }
      }
    }

    if (vecs.length) {
      const figmaGroup = figma.group(vecs, frame);
      figmaGroup.expanded = false;
      figmaGroup.name = group;
    }
  }

  try {
    progress("Drawing overlays…");
    for (const overlay of overlays) {
      const vecs: Array<VectorNode | EllipseNode> = [];
      let context: "POLYGON" | "LINE" | null = null;
      let data: Array<Array<[number, number]>> = [];

      const stream = proj.stream({
        point(x, y) {
          if (context === null) {
            const c = figma.createEllipse();
            void applyStyle(c, STYLES.OverlayPoint, scaleFactor);
            c.x = x;
            c.y = y;
            figma.currentPage.appendChild(c);
            vecs.push(c);
            return;
          } else {
            data[data.length - 1]?.push([x, y]);
          }
        },
        lineStart() {
          if (context !== "POLYGON") {
            context = "LINE";
            data = [];
          }
          data.push([]);
        },
        lineEnd() {
          if (context === "POLYGON") {
            return;
          }

          context = null;

          const vec = figma.createVector();

          void applyStyle(vec, STYLES.OverlayLine, scaleFactor);

          vec.vectorPaths = data.map((d) => {
            return {
              windingRule: "EVENODD",
              data: encodeRingXY(d),
            };
          });

          data = [];

          vecs.push(vec);
        },
        polygonStart() {
          context = "POLYGON";
        },
        polygonEnd() {
          context = null;
          const vec = figma.createVector();

          void applyStyle(vec, STYLES.OverlayPolygon, scaleFactor);

          vec.vectorPaths = data.map((ring) => {
            ring.push(ring[0]);
            return {
              windingRule: "EVENODD",
              data: encodeRingXY(ring),
            };
          });

          data = [];

          vecs.push(vec);
        },
        sphere() {},
      });

      const normalized = rewindFeatureCollection(
        normalize(overlay.geojson),
        "d3"
      );

      geoStream(normalized, stream);

      const figmaGroup = figma.group(vecs, frame);
      figmaGroup.expanded = false;
      figmaGroup.name = overlay.name;
    }
  } catch (e) {
    console.error(e);
    progress("Failed to draw overlays", { error: true });
  }

  const labeledNames = new Set<string>();

  for (const group of GROUP_LABEL_ORDER) {
    const features = grouped.get(group);
    if (!features) continue;
    for (const feature of features) {
      await new Promise<void>((resolve) => resolve());
      const name = feature.properties?.name;
      if (!(feature.geometry.type === "LineString" && name)) continue;
      if (labeledNames.has(name) || name.length > MAX_NAME_LENGTH) continue;
      const projectedLine = projectRing(feature.geometry.coordinates);
      const labelPositions = centerSort(
        linelabel(projectedLine, name.length * labelSize).filter(
          (label) => label.length > name.length * labelSize * 0.5
        )
      );

      // If there are no viable positions, bail.
      if (!labelPositions.length) {
        continue;
      }

      function getLabelEndpoints(segment: LabelableSegment) {
        const c1 = projectedLine[segment.beginIndex];
        const c2 = projectedLine[segment.endIndex - 1];

        if (c1[0] < c2[0]) {
          return [c1, c2];
        }

        return [c2, c1];
      }

      function getLabelParameters(segment: LabelableSegment) {
        const [a, b] = getLabelEndpoints(segment);
        const width = Math.sqrt(
          Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)
        );

        const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const offset = angle + Math.PI / 2;

        return {
          width,
          rotation: -angle * R2D,
          x: a[0] - Math.cos(offset) * (labelSize / 1.7),
          y: a[1] - Math.sin(offset) * (labelSize / 1.7),
        };
      }

      /**
       * First we place the label, before
       * figuring out whether it can fit anywhere or moving
       * it around. We're using Figma's own ability to compute
       * the bounding box of the text to do this.
       */
      const label = figma.createText();
      frame.appendChild(label);
      await figma.loadFontAsync(label.fontName as FontName);
      label.characters = name;
      label.fontSize = labelSize;
      await applyStyle(label, labelStyle, scaleFactor);
      label.textAutoResize = "WIDTH_AND_HEIGHT";
      label.textAlignHorizontal = "CENTER";
      label.textAlignVertical = "CENTER";
      figma.currentPage.appendChild(label);
      const initialHeight = label.height;

      /**
       * We use this as a lazy way to keep track of whether
       * the label has been able to be placed somewhere
       * without a collision.
       */
      let foundPosition = false;

      // Try each possible position.
      for (const segment of labelPositions) {
        const { rotation, x, y, width } = getLabelParameters(segment);

        // Bail if this label is outside of the canvas.
        if (x < 0 || y < 0) continue;

        label.resize(width, initialHeight);
        label.rotation = rotation;
        label.x = x;
        label.y = y;
        // Not sure why this is negative! Investigate!
        const bbox = label.absoluteBoundingBox!;
        if (!bbox) continue;
        const placement = {
          minX: bbox.x,
          minY: bbox.y,
          maxY: bbox.y + bbox.height,
          maxX: bbox.x + bbox.width,
        };
        if (!labelIndex.collides(placement)) {
          labelIndex.insert(placement);
          labels.push(label);
          labeledNames.add(name);
          foundPosition = true;
          break;
        }
      }

      /**
       * We've exhausted all options for placing
       * this label, so remove it from the map.
       */
      if (!foundPosition) {
        label.remove();
      }
    }
  }

  const frameArea = frame.width * frame.height;

  console.log("Rendering group labels");

  /**
   * All lines have been labeled: now try to label areas,
   * if we can.
   */
  for (const group of GROUP_AREA_LABEL_ORDER) {
    const features = grouped.get(group);
    if (!features) continue;
    for (const feature of features) {
      await new Promise<void>((resolve) => resolve());
      const name = feature.properties?.name;
      if (!(feature.geometry.type === "Polygon" && name)) continue;
      if (labeledNames.has(name) || name.length > MAX_NAME_LENGTH) continue;

      const area = featureAreas.get(feature.properties!.id) || 0;
      if (area < frameArea / AREA_RATIO_CUTOFF) {
        continue;
      }

      const point = proj(
        polylabel(feature.geometry.coordinates) as unknown as Pos2
      );

      if (point) {
        if (point[0] > 0 && point[1] > 0) {
          const label = figma.createText();
          frame.appendChild(label);
          await figma.loadFontAsync(label.fontName as FontName);
          label.characters = name;
          label.textAlignHorizontal = "CENTER";
          label.textAlignVertical = "CENTER";
          label.fontSize = labelSize;
          await applyStyle(label, labelStyle, scaleFactor);

          label.x = point[0];
          label.y = point[1];
          figma.currentPage.appendChild(label);
          // Not sure why this is negative! Investigate!
          label.x -= label.width / 2;
          const bbox = label.absoluteBoundingBox!;
          if (bbox) {
            const placement = {
              minX: bbox.x,
              minY: bbox.y,
              maxY: bbox.y + bbox.height,
              maxX: bbox.x + bbox.width,
            };
            if (labelIndex.collides(placement)) {
              label.remove();
            } else {
              labelIndex.insert(placement);
              labels.push(label);
              labeledNames.add(name);
            }
          }
        }
      }
    }
  }

  if (labels.length) {
    const figmaGroup = figma.group(labels, frame);
    figmaGroup.expanded = false;
    figmaGroup.name = "Labels";
  }

  console.log("Done?");

  progress(`Writing attribution`);

  await createAttribution(frame);

  progress(`Done!`);
}

async function createAttribution(frame: FrameNode) {
  const attribution = figma.createText();
  frame.appendChild(attribution);
  await figma.loadFontAsync(attribution.fontName as FontName);
  attribution.characters = "OpenStreetMap";
  attribution.fontSize = Math.max(frame.height / 30, 12);
  attribution.x = 5;
  attribution.y = 5;
}

function clear() {
  for (const child of frame.children) {
    child.remove();
  }
}
