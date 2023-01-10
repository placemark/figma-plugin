import { buildNetwork } from "./network";
import { getLerp, proj } from "./projection";
import { request } from "./request";
import { applyStyle, STYLES } from "./styles";
import { BBOX, GROUP_ORDER } from "./types";
import { progress } from "./progress";

let frame = (() => {
  let sel = figma.currentPage.selection[0];
  if (sel?.type === "FRAME") {
    return sel;
  }

  let frame = figma.createFrame();
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

figma.ui.onmessage = (msg) => {
  switch (msg.type) {
    case "cancel": {
      figma.closePlugin();
      break;
    }
    case "render-map": {
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

  const { grouped } = buildNetwork(j);
  progress("Creating frame");

  let drawn = 0;

  clear();

  for (const group of GROUP_ORDER) {
    const marks = grouped.get(group);
    if (!marks) continue;

    const vecs = [];

    const style = STYLES[group]();

    for (const mark of marks) {
      drawn++;
      progress(`Drawing (${drawn} / ${marks.length} elements)`);

      switch (mark.type) {
        case "line": {
          const vec = figma.createVector();
          applyStyle(vec, style, scaleFactor);

          if (mark.way.tags?.name) {
            vec.name = mark.way.tags?.name;
          }

          const data = mark.nodes.map((way) => {
            return way
              .map(
                (node, i) =>
                  `${i === 0 ? "M" : "L"} ${lerp(
                    proj([node.lon, node.lat])
                  ).join(" ")}`
              )
              .join(" ");
          });

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
        case "circle": {
          const c = figma.createEllipse();
          applyStyle(c, style, scaleFactor);

          if (mark.node.tags?.name) {
            c.name = mark.node.tags?.name;
          }

          const [x, y] = lerp(proj([mark.node.lon, mark.node.lat]));
          c.x = x;
          c.y = y;

          figma.currentPage.appendChild(c);
          vecs.push(c);
          break;
        }
      }
    }

    const figmaGroup = figma.group(vecs, frame);
    figmaGroup.expanded = false;
    figmaGroup.name = group;
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
