import { Circle, Element, GROUPS, MultiLine, Mark, RootObject } from "./types";
import { getNodeGroup, getWayGroup } from "./tags";

export function buildNetwork(j: RootObject) {
  const nodeIndex = new Map<number, Element>();
  const wayIndex = new Map<number, Element>();
  const circles: Circle[] = [];

  for (let element of j.elements) {
    if (element.type === "node") {
      nodeIndex.set(element.id, element);
    } else if (element.type === "way") {
      wayIndex.set(element.id, element);
    }
  }

  const grouped: Map<GROUPS, Mark[]> = new Map();

  for (let element of j.elements) {
    switch (element.type) {
      case "way": {
        const elementNodes = element.nodes;
        const line: MultiLine = {
          type: "line",
          way: element,
          nodes: elementNodes
            ? [
                elementNodes.map((id) => {
                  return nodeIndex.get(id)!;
                }),
              ]
            : [],
        };
        const group = element.tags && getWayGroup(element.tags, true);

        if (group) {
          const marks: Mark[] = grouped.get(group) || [];
          marks.push(line);
          grouped.set(group, marks);
        } else {
          // console.log(element.tags);
        }
        break;
      }
      case "node": {
        let group = element.tags && getNodeGroup(element.tags);
        if (group) {
          const marks: Mark[] = grouped.get(group) || [];
          const circle: Circle = {
            type: "circle",
            node: element,
          };
          marks.push(circle);
          grouped.set(group, marks);
        }
        break;
      }
      case "relation": {
        let group = getWayGroup(element.tags, true);
        if (element.tags?.type === "multipolygon" && group) {
          const { members } = element;
          if (!members) continue;
          const ways = members
            .sort((m) => (m.role === "outer" ? -1 : 1))
            .map((m) => {
              return wayIndex.get(m.ref);
            })
            .filter(Boolean) as Element[];
          if (ways.length) {
            const line: MultiLine = {
              type: "line",
              way: ways[0]!,
              nodes:
                ways.map((way) => {
                  return (
                    way.nodes?.map((id) => {
                      return nodeIndex.get(id)!;
                    }) || []
                  );
                }) || [],
            };

            const marks: Mark[] = grouped.get(group) || [];
            marks.push(line);
            grouped.set(group, marks);
          }
        }
        break;
      }
    }
  }

  return { circles, grouped };
}
