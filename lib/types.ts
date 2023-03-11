import { GeoJsonProperties } from "geojson";

export type Message = {
  type: "progress";
};

export type Tags = NonNullable<GeoJsonProperties>;

export type Pos2 = [number, number];

export type BBOX = [number, number, number, number];

export interface Bounds {
  minlat: number;
  minlon: number;
  maxlat: number;
  maxlon: number;
}

type Id = number;

export interface Element {
  type: "way" | "node" | "relation";
  id: Id;
  lat: number;
  lon: number;
  timestamp: Date;
  version: number;
  changeset: number;
  user: string;
  uid: number;
  tags: Tags;
  nodes?: Id[];
  members?: {
    type: "way" | "node";
    role: string;
    ref: Id;
  }[];
}

export interface RootObject {
  version: string;
  generator: string;
  copyright: string;
  attribution: string;
  license: string;
  bounds: Bounds;
  elements: Element[];
}

export interface MultiLine {
  type: "line";
  way: Element;
  nodes: Element[][];
}

export interface Circle {
  type: "circle";
  node: Element;
}

export type Mark = MultiLine | Circle;

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
