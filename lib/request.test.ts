import { test, expect } from "vitest";
import { buildQuery, toFeatureCollection } from "./request";

test("buildQuery", () => {
  const query = buildQuery([-73.99, 40.73, -73.985, 40.735]);
  expect(query).toContain("FROM postpass_linepolygon");
  expect(query).toContain("FROM postpass_point");
  expect(query).toContain(
    "ST_MakeEnvelope(-73.99, 40.73, -73.985, 40.735, 4326)",
  );
  expect(query).toContain("tags ? 'building'");
  expect(query).toContain("tags ? 'railway'");
  expect(query).toContain("'motorway'");
  expect(query).toContain("tags->>'natural' = 'tree'");
});

test("toFeatureCollection flattens tags and adds an id", () => {
  expect(
    toFeatureCollection({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-73.98, 40.73] },
          properties: {
            osm_type: "N",
            osm_id: 42,
            tags: { natural: "tree" },
          },
        },
      ],
    }),
  ).toMatchObject({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-73.98, 40.73] },
        properties: { natural: "tree", id: "N42" },
      },
    ],
  });
});

test("toFeatureCollection unwraps single-member MultiLineStrings", () => {
  expect(
    toFeatureCollection({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [0, 0],
                [1, 1],
              ],
            ],
          },
          properties: {
            osm_type: "W",
            osm_id: 1,
            tags: { highway: "primary", name: "4th Avenue" },
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [0, 0],
                [1, 1],
              ],
              [
                [2, 2],
                [3, 3],
              ],
            ],
          },
          properties: {
            osm_type: "R",
            osm_id: 2,
            tags: { railway: "rail" },
          },
        },
      ],
    }),
  ).toMatchObject({
    features: [
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        properties: { highway: "primary", name: "4th Avenue", id: "W1" },
      },
      {
        geometry: { type: "MultiLineString" },
        properties: { railway: "rail", id: "R2" },
      },
    ],
  });
});
