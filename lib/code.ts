import { buildNetwork } from "./network";
import { request } from "./request";
import { applyStyle, STYLES } from "./styles";
import { BBOX, GROUP_ORDER } from "./types";

type Pos2 = [number, number];

const D2R = Math.PI / 180;

function proj(ll: Pos2): Pos2 {
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

function getLerp(bbox: BBOX, [width, height]: Pos2, [dx, dy]: Pos2) {
  const sw = proj([bbox[0], bbox[1]]);
  const ne = proj([bbox[2], bbox[3]]);

  return ([lon, lat]: Pos2) => {
    return [
      (width * (lon - sw[0])) / (ne[0] - sw[0]) + dx,
      height - (height * (lat - sw[1])) / (ne[1] - sw[1]) + dy,
    ].join(" ");
  };
}

const frame = figma.currentPage.selection[0];
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

function clear() {
  for (const child of (frame as FrameNode).children) {
    child.remove();
  }
}

clear();

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  switch (msg.type) {
    case "cancel": {
      figma.closePlugin();
      break;
    }
    case "render-map": {
      (async () => {
        const frame = figma.currentPage.selection[0];

        if (frame?.type !== "FRAME") {
          figma.ui.postMessage({
            type: "error",
            message: "Draw and select a frame to place a map.",
          });
          return;
        }

        let { width, height, x, y } = frame;

        const bbox: BBOX = msg.bbox
          .split(",")
          .map((b: string) => parseFloat(b));

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

        const attribution = figma.createText();
        frame.appendChild(attribution);
        await figma.loadFontAsync(attribution.fontName as FontName);
        attribution.characters = "OpenStreetMap";
        attribution.x = 5;
        attribution.y = 5;

        figma.ui.postMessage({
          type: "progress",
          message: `Done!`,
        });
      })().catch((e) => {
        figma.ui.postMessage({
          type: "error",
          message: e.message,
        });
      });
    }
  }
};
