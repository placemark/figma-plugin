import { test, expect } from "vitest";
import { GROUPS } from "./types";
import { getWayGroup } from "./tags";

test("getGroup", () => {
  expect(getWayGroup({})).toEqual(null);
  expect(getWayGroup({ highway: "secondary" })).toEqual(GROUPS.TrafficRoad);
  expect(getWayGroup({ leisure: "park" })).toEqual(GROUPS.Park);
});
