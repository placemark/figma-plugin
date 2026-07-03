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

export type TagRule = {
  key: string;
  /** Include features with this tag at this zoom level and higher. */
  minzoom: number;
  /** Tag values to match. When omitted, any value matches. */
  values?: string[];
};

/**
 * Zoom-dependent feature inclusion, mimicking the OpenMapTiles schema
 * that OpenFreeMap styles render: each road class, landuse, etc. only
 * appears at the zoom level where those maps would draw it, so
 * zoomed-out requests stay small.
 * https://openmaptiles.org/schema/
 */
export const LINE_RULES: TagRule[] = [
  { key: "highway", minzoom: 4, values: ["motorway"] },
  { key: "highway", minzoom: 5, values: ["trunk"] },
  { key: "highway", minzoom: 7, values: ["primary"] },
  { key: "highway", minzoom: 9, values: ["secondary"] },
  { key: "highway", minzoom: 11, values: ["tertiary"] },
  {
    key: "highway",
    minzoom: 12,
    values: [
      "motorway_link",
      "trunk_link",
      "primary_link",
      "secondary_link",
      "tertiary_link",
      "residential",
      "unclassified",
      "living_street",
      "busway",
    ],
  },
  { key: "highway", minzoom: 13, values: Array.from(service_roads) },
  { key: "highway", minzoom: 14, values: Array.from(paths) },
  { key: "railway", minzoom: 8, values: ["rail"] },
  { key: "railway", minzoom: 13 },
  { key: "natural", minzoom: 0, values: ["coastline"] },
];

export const POLYGON_RULES: TagRule[] = [
  { key: "natural", minzoom: 0, values: ["water", "bay"] },
  { key: "landuse", minzoom: 0, values: Array.from(landuseWater) },
  { key: "leisure", minzoom: 6, values: ["nature_reserve"] },
  { key: "landuse", minzoom: 6, values: ["residential"] },
  { key: "natural", minzoom: 8, values: ["wood"] },
  { key: "landuse", minzoom: 8, values: ["forest"] },
  {
    key: "landuse",
    minzoom: 9,
    values: [...landuse, "industrial", "commercial", "retail", "railway"],
  },
  {
    key: "leisure",
    minzoom: 9,
    values: Array.from(leisure).filter((value) => value !== "nature_reserve"),
  },
  { key: "amenity", minzoom: 9, values: Array.from(educational) },
  { key: "building", minzoom: 13 },
  { key: "parking", minzoom: 13, values: Array.from(parking) },
  // Pedestrian plazas and the like, mapped as areas
  { key: "highway", minzoom: 13, values: Array.from(service_roads) },
  { key: "highway", minzoom: 14, values: Array.from(paths) },
];

export const POINT_RULES: TagRule[] = [
  { key: "natural", minzoom: 16, values: ["tree"] },
];

/**
 * Every highway value the grouping code understands: the zoom tiers
 * above should cover exactly this set.
 */
export const ALL_HIGHWAY_VALUES = new Set([
  ...supermajor_traffic_roads,
  ...major_traffic_roads,
  ...traffic_roads,
  ...service_roads,
  ...paths,
]);

function isBuilding(tags: Tags) {
  return (
    (!!tags.building && tags.building !== "no") || parking.has(tags.parking)
  );
}

function isWaterLine(tags: Tags) {
  return !!tags.waterway;
}

function isWater(tags: Tags) {
  return (
    naturalWater.has(tags.natural) ||
    landuseWater.has(tags.landuse) ||
    tags.leisure === "swimming_pool"
  );
}
function isUniversity(tags: Tags) {
  return educational.has(tags.amenity);
}

function isPitch(tags: Tags) {
  return tags.leisure === "pitch";
}

function isPath(tags: Tags) {
  return paths.has(tags.highway);
}

function isTrafficRoadSupermajor(tags: Tags) {
  return supermajor_traffic_roads.has(tags.highway);
}

function isTrafficRoadMajor(tags: Tags) {
  return major_traffic_roads.has(tags.highway);
}

function isTrafficRoad(tags: Tags) {
  return traffic_roads.has(tags.highway);
}

function isServiceRoad(tags: Tags) {
  return service_roads.has(tags.highway);
}

function isPark(tags: Tags) {
  return leisure.has(tags.leisure) || landuse.has(tags.landuse);
}

function isRail(tags: Tags) {
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
function isTree(tags: Tags) {
  return tags.natural === "tree";
}

/**
 * https://www.openstreetmap.org/way/1109695968
 */
function isWood(tags: Tags) {
  return tags.natural === "wood" || tags.landuse === "forest";
}

function isIndustrial(tags: Tags) {
  return tags.landuse === "industrial";
}

function isCommercial(tags: Tags) {
  return tags.landuse === "commercial" || tags.landuse === "retail";
}

function isResidential(tags: Tags) {
  return tags.landuse === "residential";
}

function getNodeGroup(tags: Tags): GROUPS | null {
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
