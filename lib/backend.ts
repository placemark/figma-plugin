import { buildNetwork } from "./network";
import { getLerp, proj } from "./projection";
import { request } from "./request";
import { applyStyle, STYLES } from "./styles";
import { BBOX, GROUP_ORDER } from "./types";

const frame = figma.currentPage.selection[0];

if (!frame) {
  figma.notify("Create and select an empty frame to place a map.");
} else {
  const aspect = frame.width / frame.height;
  const dim = 720;

  figma.showUI(__html__, {
    width: Math.round(dim),
    height: Math.round(dim / aspect) + 80,
  });

  if (frame?.type !== "FRAME") {
    figma.ui.postMessage({
      type: "fatal-error",
      message: "Draw and select a frame to place a map.",
    });
  } else {
    figma.ui.postMessage({
      type: "ratio",
      width: frame.width,
      height: frame.height,
    });
  }
}

clear();

figma.ui.onmessage = (msg) => {
  switch (msg.type) {
    case "cancel": {
      figma.closePlugin();
      break;
    }
    case "render-map": {
      render(msg.bbox.split(",").map((b: string) => parseFloat(b))).catch(
        (e) => {
          figma.ui.postMessage({
            type: "error",
            message: e.message,
          });
        }
      );
    }
  }
};

async function render(bbox: BBOX) {
  if (frame?.type !== "FRAME") {
    figma.ui.postMessage({
      type: "error",
      message: "Draw and select a frame to place a map.",
    });
    return;
  }

  let { width, height, x, y } = frame;
  const scaleFactor = width / (bbox[2] - bbox[0]);
  const lerp = getLerp(bbox, [width, height], [x, y]);

  figma.ui.postMessage({
    type: "progress",
    message: "Requesting data",
  });

  const j = await request(bbox);
  figma.ui.postMessage({
    type: "progress",
    message: "Building network",
  });

  const { grouped, lines } = buildNetwork(j);
  figma.ui.postMessage({ type: "progress", message: "Creating frame" });

  figma.ui.postMessage({
    type: "progress",
    message: `Drawing (${lines.length} elements)`,
  });

  let drawn = 0;

  clear();

  for (const group of GROUP_ORDER) {
    const lines = grouped.get(group);
    if (!lines) continue;

    const vecs = [];

    const style = STYLES[group]();

    for (const line of lines) {
      drawn++;
      figma.ui.postMessage({
        type: "progress",
        message: `Drawing (${drawn} / ${lines.length} elements)`,
      });
      const vec = figma.createVector();
      applyStyle(vec, style, scaleFactor);

      if (line.way.tags?.name) {
        vec.name = line.way.tags?.name;
      }

      const data = line.nodes
        .map(
          (node, i) =>
            `${i === 0 ? "M" : "L"} ${lerp(proj([node.lon, node.lat]))}`
        )
        .join(" ");

      vec.vectorPaths = [
        {
          windingRule: "EVENODD",
          data,
        },
      ];

      figma.currentPage.appendChild(vec);
      vecs.push(vec);
    }

    const figmaGroup = figma.group(vecs, frame);
    figmaGroup.expanded = false;
    figmaGroup.name = group;
  }

  figma.ui.postMessage({
    type: "progress",
    message: `Writing attribution`,
  });

  await createAttribution(frame);

  figma.ui.postMessage({
    type: "progress",
    message: `Done!`,
  });
}

async function createAttribution(frame: FrameNode) {
  const attribution = figma.createText();
  frame.appendChild(attribution);
  await figma.loadFontAsync(attribution.fontName as FontName);
  attribution.characters = "OpenStreetMap";
  attribution.x = 5;
  attribution.y = 5;
}

function clear() {
  for (const child of (frame as FrameNode).children) {
    child.remove();
  }
}
