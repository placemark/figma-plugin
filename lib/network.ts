import { Element, GROUPS, Line, RootObject } from "./types";
import { getGroup } from "./tags";

export function buildNetwork(j: RootObject) {
  const nodes = new Map<number, Element>();
  const lines: Line[] = [];

  for (let element of j.elements) {
    if (element.type === "node") {
      nodes.set(element.id, element);
    }
  }

  const grouped: Map<GROUPS, Line[]> = new Map();

  for (let element of j.elements) {
    if (element.type === "way") {
      const line: Line = {
        way: element,
        nodes:
          element.nodes?.map((id) => {
            return nodes.get(id)!;
          }) || [],
      };
      lines.push(line);
      const group = element.tags && getGroup(element.tags);

      if (group) {
        const lines: Line[] = grouped.get(group) || [];
        lines.push(line);
        grouped.set(group, lines);
      } else {
        console.log(element.tags);
      }
    }
  }

  return { lines, grouped };
}
