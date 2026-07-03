import { GeoJsonProperties } from "geojson";

export type Message = {
  type: "progress";
};

export type Tags = NonNullable<GeoJsonProperties>;

export type Pos2 = [number, number];

export type BBOX = [number, number, number, number];

export enum GROUPS {
  Park = "Park",
  OverlayPoint = "OverlayPoint",
  OverlayPolygon = "OverlayPolygon",
  OverlayLine = "OverlayLine",
  Commercial = "Commercial",
  Pitch = "Pitch",
  Residential = "Residential",
  Wood = "Wood",
  Rail = "Rail",
  ServiceRoad = "Service road",
  TrafficRoad = "Traffic road",
  TrafficRoadMajor = "Traffic road major",
  TrafficRoadSupermajor = "Traffic road super-major",
  Path = "Path",
  Water = "Water",
  WaterLine = "Water lines",
  WaterArea = "Water area",
  Building = "Building",
  University = "University",
  Industrial = "Industrial",
  Tree = "Tree",
}

/**
 * From bottom to top
 */
export const GROUP_ORDER = [
  GROUPS.University,
  GROUPS.Industrial,
  GROUPS.Commercial,
  GROUPS.Residential,
  GROUPS.Park,
  GROUPS.Wood,
  GROUPS.Pitch,
  GROUPS.Water,
  GROUPS.WaterArea,
  GROUPS.WaterLine,
  GROUPS.Building,
  GROUPS.Rail,
  GROUPS.ServiceRoad,
  GROUPS.TrafficRoad,
  GROUPS.TrafficRoadMajor,
  GROUPS.TrafficRoadSupermajor,
  GROUPS.Path,
  GROUPS.Tree,
];

export const GROUP_LABEL_ORDER = [
  GROUPS.TrafficRoadSupermajor,
  GROUPS.TrafficRoadMajor,
  GROUPS.TrafficRoad,
];

export const GROUP_AREA_LABEL_ORDER = [GROUPS.Park, GROUPS.WaterArea];
