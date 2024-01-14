import { GROUPS, RootObject } from "./types";
import osmtogeojson from "./osmtogeojson";
import { FeatureCollection, Feature } from "geojson";
import { getGroup } from "./tags";

export function buildNetwork(j: RootObject) {
  const geojson: FeatureCollection = osmtogeojson(j);
  const grouped: Map<GROUPS, Feature[]> = new Map();

  for (let feature of geojson.features) {
    const group = getGroup(feature);

    if (group) {
      const marks: Feature[] = grouped.get(group) || [];
      if (feature.geometry.type === "MultiPolygon") {
        for (const coordinates of feature.geometry.coordinates) {
          marks.push(
            Object.assign({}, feature, {
              geometry: {
                type: "Polygon",
                coordinates,
              },
            })
          );
        }
      } else {
        marks.push(feature);
      }
      grouped.set(group, marks);
    } else {
      // console.log(element.tags);
    }
  }

  return grouped;
}
