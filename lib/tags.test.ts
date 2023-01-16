import { test, expect } from "vitest";
import { GROUPS } from "./types";
import { getWayGroup } from "./tags";
import { Feature, GeoJsonProperties } from "geojson";

function f(properties: GeoJsonProperties): Feature {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates: [42, 42],
    },
  };
}

test("getGroup", () => {
  expect(getWayGroup(f({}))).toEqual(null);
  expect(getWayGroup(f({ highway: "secondary" }))).toEqual(GROUPS.TrafficRoad);
  expect(getWayGroup(f({ leisure: "park" }))).toEqual(GROUPS.Park);
});
