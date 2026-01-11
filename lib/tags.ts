import { Feature } from "geojson";
import { GROUPS, Tags } from "./types";

/**
 * All of this is derived from iD (ISC license)
 * https://github.com/openstreetmap/iD/blob/3dde091fdd3f8c5e54abd9923d642e67adb05064/modules/renderer/features.js
 */

const supermajor_traffic_roads = new Set(["motorway", "motorway_link"]);

const educational = new Set([
  "school",
  "university",
  "college",
  "music_school",
  "driving_school",
]);

const major_traffic_roads = new Set([
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
]);

const traffic_roads = new Set([
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "residential",
  "unclassified",
  "living_street",
  "busway",
]);

const landuse = new Set([
  "flowerbed",
  "grass",
  "cemetery",
  "recreation_ground",
  "village_green",
]);

const leisure = new Set([
  "garden",
  "golf_course",
  "nature_reserve",
  "park",
  "pitch",
  "track",
  "sports_centre",
]);

const service_roads = new Set(["service", "road", "track"]);

const paths = new Set([
  "path",
  "footway",
  "cycleway",
  "bridleway",
  "steps",
  "pedestrian",
]);

const parking = new Set(["multi-storey", "sheds", "carports", "garage_boxes"]);

const landuseWater = new Set(["pond", "basin", "reservoir", "salt_pond"]);
const naturalWater = new Set(["water", "coastline", "bay"]);

const highwaysQuery = new Set([
  ...supermajor_traffic_roads,
  ...major_traffic_roads,
  ...traffic_roads,
  ...service_roads,
  ...paths,
]);

const naturalQuery = new Set([...naturalWater, "tree", "wood"]);

const landuseQuery = new Set([
  ...landuseWater,
  ...landuse,
  "industrial",
  "commercial",
  "retail",
  "residential",
  "forest",
  "railway",
]);

export const TAGS_FOR_QUERY = {
  amenity: Array.from(educational).join("|"),
  parking: Array.from(parking).join("|"),
  leisure: Array.from(leisure).join("|"),
  landuse: Array.from(landuseQuery).join("|"),
  highway: Array.from(highwaysQuery).join("|"),
  natural: Array.from(naturalQuery).join("|"),
};

export function isBuilding(tags: Tags) {
  return (
    (!!tags.building && tags.building !== "no") || parking.has(tags.parking)
  );
}

export function isWaterLine(tags: Tags) {
  return !!tags.waterway;
}

export function isWater(tags: Tags) {
  return (
    naturalWater.has(tags.natural) ||
    landuseWater.has(tags.landuse) ||
    tags.leisure === "swimming_pool"
  );
}
export function isUniversity(tags: Tags) {
  return educational.has(tags.amenity);
}

export function isPitch(tags: Tags) {
  return tags.leisure === "pitch";
}

export function isPath(tags: Tags) {
  return paths.has(tags.highway);
}

export function isTrafficRoadSupermajor(tags: Tags) {
  return supermajor_traffic_roads.has(tags.highway);
}

export function isTrafficRoadMajor(tags: Tags) {
  return major_traffic_roads.has(tags.highway);
}

export function isTrafficRoad(tags: Tags) {
  return traffic_roads.has(tags.highway);
}

export function isServiceRoad(tags: Tags) {
  return service_roads.has(tags.highway);
}

export function isPark(tags: Tags) {
  return leisure.has(tags.leisure) || landuse.has(tags.landuse);
}

export function isRail(tags: Tags) {
  return (
    (!!tags.railway || tags.landuse === "railway") &&
    !(
      traffic_roads.has(tags.highway) ||
      major_traffic_roads.has(tags.highway) ||
      supermajor_traffic_roads.has(tags.highway) ||
      service_roads.has(tags.highway) ||
      paths.has(tags.highway)
    )
  );
}

/**
 * https://wiki.openstreetmap.org/wiki/Tag:natural%3Dtree
 */
export function isTree(tags: Tags) {
  return tags.natural === "tree";
}

/**
 * https://www.openstreetmap.org/way/1109695968
 */
export function isWood(tags: Tags) {
  return tags.natural === "wood" || tags.landuse === "forest";
}

export function isIndustrial(tags: Tags) {
  return tags.landuse === "industrial";
}

export function isCommercial(tags: Tags) {
  return tags.landuse === "commercial" || tags.landuse === "retail";
}

export function isResidential(tags: Tags) {
  return tags.landuse === "residential";
}

export function getNodeGroup(tags: Tags): GROUPS | null {
  return (isTree(tags) && GROUPS.Tree) || null;
}

export function getWayGroup(feature: Feature): GROUPS | null {
  const {
    geometry: { type },
    properties,
  } = feature;
  if (!properties) return null;
  return (
    (isRail(properties) && GROUPS.Rail) ||
    (isServiceRoad(properties) && GROUPS.ServiceRoad) ||
    (isTrafficRoad(properties) && GROUPS.TrafficRoad) ||
    (isTrafficRoadMajor(properties) && GROUPS.TrafficRoadMajor) ||
    (isTrafficRoadSupermajor(properties) && GROUPS.TrafficRoadSupermajor) ||
    (isPath(properties) && GROUPS.Path) ||
    (isWaterLine(properties) && GROUPS.WaterLine) ||
    (isWater(properties) &&
      (type === "Polygon" || type === "MultiPolygon"
        ? GROUPS.WaterArea
        : GROUPS.Water)) ||
    (isBuilding(properties) && GROUPS.Building) ||
    (isIndustrial(properties) && GROUPS.Industrial) ||
    (isCommercial(properties) && GROUPS.Commercial) ||
    (isResidential(properties) && GROUPS.Residential) ||
    (isPitch(properties) && GROUPS.Pitch) ||
    (isUniversity(properties) && GROUPS.University) ||
    (isPark(properties) && GROUPS.Park) ||
    (isWood(properties) && GROUPS.Wood) ||
    null
  );
}

export function getGroup(feature: Feature) {
  const { properties } = feature;
  if (!properties) return null;
  if (feature.geometry.type === "Point") {
    return getNodeGroup(properties);
  }
  return getWayGroup(feature);
}
