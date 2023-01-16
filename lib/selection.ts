import { ATTACHED_KEY } from "./constants";

const DEPTH_LIMIT = 100;

/**
 * Used in the case when someone has selected something
 * inside of a map, like a street line,
 * and we need to find the map frame by traversing up
 * and finding frames with attached data.
 */
export function getMaybeParentFrame(sel: SceneNode) {
  if (sel && sel?.type !== "FRAME") {
    let parents = [];
    let parent = sel.parent;
    let depth = 0;

    while (parent) {
      parents.push(parent);
      parent = parent.parent;
      if (++depth > DEPTH_LIMIT) {
        break;
      }
    }

    for (let parent of parents) {
      if (parent.type === "FRAME" && parent.getPluginData(ATTACHED_KEY)) {
        return parent;
      }
    }
  }
  return null;
}
