export type Message = {
  type: "progress";
};

export type Pos2 = [number, number];

export type BBOX = [number, number, number, number];

export interface Bounds {
  minlat: number;
  minlon: number;
  maxlat: number;
  maxlon: number;
}

export type Tags = Record<string, string>;
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

export interface Line {
  way: Element;
  nodes: Element[];
}

export enum GROUPS {
  Park = "Park",
  Rail = "Rail",
  ServiceRoad = "Service road",
  TrafficRoad = "Traffic road",
  TrafficRoadMajor = "Traffic road major",
  Path = "Path",
  Water = "Water",
  Building = "Building",
}

export const GROUP_ORDER = [
  GROUPS.Park,
  GROUPS.Water,
  GROUPS.Building,
  GROUPS.Rail,
  GROUPS.ServiceRoad,
  GROUPS.TrafficRoad,
  GROUPS.TrafficRoadMajor,
  GROUPS.Path,
];
