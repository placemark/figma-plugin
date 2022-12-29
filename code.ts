import { buildNetwork } from "./network";
import { request } from "./request";
import { BBOX } from "./types";

figma.showUI(__html__);

function proj(node) {
  return [(node.lon - bbox[0]) * 30000, (node.lat - bbox[1]) * 30000].join(" ");
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === "create-rectangles") {
    (async () => {
      const bbox: BBOX = [
        -74.01079416275026, 40.68262324377143, -73.9749598503113,
        40.687976530243375,
      ];

      figma.ui.postMessage({ type: "progress", message: "Requesting data" });

      const j = await request(bbox);
      figma.ui.postMessage({ type: "progress", message: "Building network" });

      const { grouped, lines } = buildNetwork(j);
      figma.ui.postMessage({ type: "progress", message: "Creating frame" });

      figma.ui.postMessage({
        type: "progress",
        message: `Drawing (${lines.length} elements)`,
      });

      const frame = figma.createFrame();
      frame.resize(1000, 500);

      for (const [group, lines] of grouped.entries()) {
        const vecs = [];
        for (const line of lines) {
          const vec = figma.createVector();

          if (line.way.tags?.name) {
            vec.name = line.way.tags?.name;
          }

          const data = line.nodes
            .map((node, i) => `${i === 0 ? "M" : "L"} ${proj(node)}`)
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
        figmaGroup.name = group;
      }

      figma.closePlugin();
    })();
  }
};
