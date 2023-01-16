import { buildNetwork } from "./network";
import { getLerp, proj } from "./projection";
import { request } from "./request";
import { applyStyle, labelStyle, STYLES } from "./styles";
import { BBOX, GROUPS, GROUP_LABEL_ORDER, GROUP_ORDER, Pos2 } from "./types";
import { progress } from "./progress";
import { STORAGE_KEY, ATTACHED_KEY } from "./constants";
import { getMaybeParentFrame } from "./selection";
import { Position } from "geojson";
import RBush from "rbush";
import { linelabel } from "./linelabel";

const R2D = 180 / Math.PI;

type IAttachedData = {
  version: 1;
  bbox: string;
};

let frame = (() => {
  let sel = figma.currentPage.selection[0];

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

  let frame = figma.createFrame();
  frame.name = "Placemark Map";
  frame.resize(720, 360);
  figma.viewport.scrollAndZoomIntoView([frame]);
  return frame;
})();

const aspect = frame.width / frame.height;
const dim = 720;

figma.showUI(__html__, {
  width: Math.round(dim),
  height: Math.round(dim / aspect) + 80,
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
  figma.clientStorage.getAsync(STORAGE_KEY).then((stored) => {
    if (stored) {
      figma.ui.postMessage({
        type: "recover-viewport",
        bbox: stored,
      });
    }
  });
}

figma.ui.onmessage = (msg) => {
  switch (msg.type) {
    case "cancel": {
      figma.closePlugin();
      break;
    }
    case "save-viewport": {
      figma.clientStorage.setAsync(STORAGE_KEY, msg.bbox);
      break;
    }
    case "render-map": {
      const attached: IAttachedData = {
        version: 1,
        bbox: msg.bbox,
      };
      frame.setPluginData(ATTACHED_KEY, JSON.stringify(attached));
      render(msg.bbox.split(",").map((b: string) => parseFloat(b))).catch(
        (e) => {
          progress(e.message, { error: true });
        }
      );
    }
  }
};

async function render(bbox: BBOX) {
  let { width, height, x, y } = frame;
  const scaleFactor = width / (bbox[2] - bbox[0]);
  const lerp = getLerp(bbox, [width, height], [x, y]);

  progress("Requesting data");

  const j = await request(bbox);
  progress("Building network");

  const grouped = buildNetwork(j);
  progress("Creating frame");

  let drawn = 0;

  clear();

  function projectRing(ring: Position[]) {
    return ring.map((position, i) => lerp(proj(position as Pos2)));
  }

  function encodeRing(ring: Position[]) {
    return ring
      .map(
        (position, i) =>
          `${i === 0 ? "M" : "L"} ${lerp(proj(position as Pos2)).join(" ")}`
      )
      .join(" ");
  }

  const labelSize = Math.max(frame.height / 40, 8);
  const labelIndex = new RBush();
  const labels = [];

  for (const group of GROUP_ORDER) {
    const features = grouped.get(group);
    if (!features) continue;

    const vecs = [];

    const style = STYLES[group]();

    for (const feature of features) {
      drawn++;
      progress(`Drawing (${drawn} / ${features.length} elements)`);

      const name = feature.properties?.name;
      switch (feature.geometry.type) {
        case "Polygon":
        case "LineString":
        case "MultiLineString": {
          const vec = figma.createVector();
          applyStyle(vec, style, scaleFactor);

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
          vecs.push(vec);
          break;
        }
        case "Point": {
          const c = figma.createEllipse();
          applyStyle(c, style, scaleFactor);

          if (feature.properties?.name) {
            c.name = feature.properties.name;
          }

          const [x, y] = lerp(proj(feature.geometry.coordinates as Pos2));
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

  for (const group of GROUP_LABEL_ORDER) {
    const features = grouped.get(group);
    if (!features) continue;
    for (let feature of features) {
      const name = feature.properties?.name;
      if (feature.geometry.type === "LineString" && name) {
        const projectedLine = projectRing(feature.geometry.coordinates);
        const firstLabel = linelabel(
          projectedLine,
          name.length * labelSize
        ).filter((label) => label.length > name.length * labelSize * 0.5)[0];

        if (firstLabel) {
          const label = figma.createText();
          frame.appendChild(label);
          await figma.loadFontAsync(label.fontName as FontName);
          label.characters = name;
          label.fontSize = labelSize;
          applyStyle(label, labelStyle(), scaleFactor);
          const c1 = projectedLine[firstLabel.beginIndex];
          const c2 = projectedLine[firstLabel.endIndex - 1];
          let a: Pos2;
          let b: Pos2;
          if (c1[0] < c2[0]) {
            a = c1;
            b = c2;
          } else {
            a = c2;
            b = c1;
          }
          const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const offset = angle + Math.PI / 2;
          label.x = a[0] - Math.cos(offset) * (labelSize / 1.7);
          label.y = a[1] - Math.sin(offset) * (labelSize / 1.7);
          // Not sure why this is negative! Investigate!
          label.rotation = -angle * R2D;
          figma.currentPage.appendChild(label);
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
  for (const child of (frame as FrameNode).children) {
    child.remove();
  }
}
