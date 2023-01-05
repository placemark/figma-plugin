import { test, expect } from "vitest";
import { GROUPS } from "./types";
import { getGroup } from "./tags";

test("getGroup", () => {
  expect(getGroup({})).toEqual(null);
  expect(getGroup({ highway: "secondary" })).toEqual(GROUPS.TrafficRoad);
  expect(getGroup({ leisure: "park" })).toEqual(GROUPS.Park);
});
