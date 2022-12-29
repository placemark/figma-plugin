import { Tags } from "./types";

/**
 * All of this is derived from iD (ISC license)
 * https://github.com/openstreetmap/iD/blob/3dde091fdd3f8c5e54abd9923d642e67adb05064/modules/renderer/features.js
 */

const traffic_roads = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "residential",
  "unclassified",
  "living_street",
  "busway",
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

export function isBuilding(tags: Tags) {
  return (
    (!!tags.building && tags.building !== "no") ||
    tags.parking === "multi-storey" ||
    tags.parking === "sheds" ||
    tags.parking === "carports" ||
    tags.parking === "garage_boxes"
  );
}

export function isWater(tags: Tags) {
  return (
    !!tags.waterway ||
    tags.natural === "water" ||
    tags.natural === "coastline" ||
    tags.natural === "bay" ||
    tags.landuse === "pond" ||
    tags.landuse === "basin" ||
    tags.landuse === "reservoir" ||
    tags.landuse === "salt_pond"
  );
}

export function isPath(tags: Tags) {
  return paths.has(tags.highway);
}

export function isTrafficRoad(tags: Tags) {
  return traffic_roads.has(tags.highway);
}

export function isServiceRoad(tags: Tags) {
  return service_roads.has(tags.highway);
}

export function isRail(tags: Tags) {
  return (
    (!!tags.railway || tags.landuse === "railway") &&
    !(
      traffic_roads.has(tags.highway) ||
      service_roads.has(tags.highway) ||
      paths.has(tags.highway)
    )
  );
}

export enum GROUPS {
  Rail = "Rail",
  ServiceRoad = "Service road",
  TrafficRoad = "Traffic road",
  Path = "Path",
  Water = "Water",
  Building = "Building",
}

export function getGroup(tags: Tags): GROUPS | null {
  return (
    (isRail(tags) && GROUPS.Rail) ||
    (isServiceRoad(tags) && GROUPS.ServiceRoad) ||
    (isTrafficRoad(tags) && GROUPS.TrafficRoad) ||
    (isPath(tags) && GROUPS.Path) ||
    (isWater(tags) && GROUPS.Water) ||
    (isBuilding(tags) && GROUPS.Building) ||
    null
  );
}
