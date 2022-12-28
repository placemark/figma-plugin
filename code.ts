// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

// From iD
function isBuilding(tags) {
  if (!tags) return;
  return (
    (!!tags.building && tags.building !== "no") ||
    tags.parking === "multi-storey" ||
    tags.parking === "sheds" ||
    tags.parking === "carports" ||
    tags.parking === "garage_boxes"
  );
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => {
  const traffic_roads = {
    motorway: true,
    motorway_link: true,
    trunk: true,
    trunk_link: true,
    primary: true,
    primary_link: true,
    secondary: true,
    secondary_link: true,
    tertiary: true,
    tertiary_link: true,
    residential: true,
    unclassified: true,
    living_street: true,
    busway: true,
  };

  const traffic_styles = {};
  const buildings = [];

  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === "create-rectangles") {
    (async () => {
      const bbox = [
        -74.01079416275026, 40.68262324377143, -73.9749598503113,
        40.687976530243375,
      ];
      const res = await fetch(
        `https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.join(",")}`,
        {
          headersObject: {
            Accept: "application/json",
          },
        }
      );
      const j = JSON.parse(await res.text());

      const nodes = new Map();
      const ways = new Map();

      for (let element of j.elements) {
        if (element.type === "node") {
          nodes.set(element.id, element);
        }
      }

      function proj(node) {
        return [
          (node.lon - bbox[0]) * 30000,
          (node.lat - bbox[1]) * 30000,
        ].join(" ");
      }

      let styles = {};

      for (let key of ["building"]) {
        const style = figma.createPaintStyle();
        style.paints = [
          {
            type: "SOLID",
            color: {
              r: 1,
              g: Math.random(),
              b: Math.random(),
            },
          },
        ];
        styles[key] = style;
        styles[key].name = key;
      }

      for (let key in traffic_roads) {
        const style = figma.createPaintStyle();
        style.paints = [
          {
            type: "SOLID",
            color: {
              r: 1,
              g: Math.random(),
              b: Math.random(),
            },
          },
        ];
        styles[key] = style;
        styles[key].name = key;
      }

      const frame = figma.createFrame();

      for (let element of j.elements) {
        if (element.type === "way") {
          element.nodes = element.nodes.map((id) => {
            return nodes.get(id);
          });

          const vec = figma.createVector();
          const data = element.nodes
            .map((node, i) => `${i === 0 ? "M" : "L"} ${proj(node)}`)
            .join(" ");

          if (isBuilding(element.tags)) {
            vec.fillStyleId = styles.building.id;
            vec.strokeWeight = 1;
            vec.strokeAlign = "INSIDE";
            buildings.push(vec);
          } else if (traffic_roads[element.tags?.highway]) {
            vec.strokeStyleId = styles[element.tags?.highway].id;
          }

          if (element.tags?.name) {
            vec.name = element.tags?.name;
          }

          vec.vectorPaths = [
            {
              windingRule: "EVENODD",
              data,
            },
          ];
          figma.currentPage.appendChild(vec);
        }
      }

      const buildingsGroup = figma.group(buildings, frame);
      buildingsGroup.name = "Buildings";

      figma.closePlugin();
    })();
  }
};
