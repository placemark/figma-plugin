import { test, expect } from "vitest";
import { bboxZoom, buildQuery, toFeatureCollection } from "./request";
import { ALL_HIGHWAY_VALUES, LINE_RULES } from "./tags";

test("bboxZoom", () => {
  // A few Manhattan blocks
  expect(bboxZoom([-73.99, 40.73, -73.985, 40.735])).toEqual(18);
  // A metro region
  expect(bboxZoom([-74.5, 40.2, -73.5, 41.2])).toEqual(10);
  // A continent
  expect(bboxZoom([-130, 20, -60, 55])).toEqual(4);
  expect(bboxZoom([0, 0, 0, 0])).toEqual(22);
});

test("buildQuery at high zoom includes everything", () => {
  const query = buildQuery([-73.99, 40.73, -73.985, 40.735], 18);
  expect(query).toContain("FROM postpass_line");
  expect(query).toContain("FROM postpass_polygon");
  expect(query).toContain("FROM postpass_point");
  expect(query).toContain(
    "ST_MakeEnvelope(-73.99, 40.73, -73.985, 40.735, 4326)",
  );
  expect(query).toContain("tags ? 'building'");
  expect(query).toContain("tags ? 'railway'");
  expect(query).toContain("'motorway'");
  expect(query).toContain("'footway'");
  expect(query).toContain("'tree'");
  // No generalization at high zoom
  expect(query).not.toContain("ST_Area");
  expect(query).not.toContain("ST_SimplifyPreserveTopology");
  expect(query).not.toContain("GROUP BY");
  // Tags are pruned at every zoom
  expect(query).toContain("jsonb_build_object");
});

test("buildQuery at mid zoom excludes detail features", () => {
  const query = buildQuery([-74.5, 40.2, -73.5, 41.2], 10);
  expect(query).toContain("'motorway'");
  expect(query).toContain("'secondary'");
  expect(query).not.toContain("'tertiary'");
  // Minor roads arrive at z12; landuse=residential polygons are allowed
  expect(query).not.toContain("'living_street'");
  expect(query).not.toContain("tags ? 'building'");
  expect(query).not.toContain("FROM postpass_point");
  // Railways are limited to main lines
  expect(query).toContain("tags->>'railway' IN ('rail')");
  // Small polygons are dropped
  expect(query).toContain("ST_Area(geom) >");
  // Lines are merged per rendered-tag group and simplified
  expect(query).toContain("ST_LineMerge");
  expect(query).toContain("GROUP BY");
  expect(query).toContain("ST_SimplifyPreserveTopology");
});

test("buildQuery at city zoom simplifies but keeps individual ways", () => {
  const query = buildQuery([-74.03, 40.69, -73.95, 40.76], 14);
  expect(query).toContain("ST_SimplifyPreserveTopology");
  expect(query).not.toContain("GROUP BY");
  expect(query).not.toContain("ST_Area(geom) >");
});

test("buildQuery at low zoom keeps water and major roads only", () => {
  const query = buildQuery([-130, 20, -60, 55], 4);
  expect(query).toContain("tags->>'highway' IN ('motorway')");
  expect(query).toContain("'coastline'");
  expect(query).toContain("'water'");
  expect(query).not.toContain("'trunk'");
  expect(query).not.toContain("'wood'");
});

test("highway zoom tiers cover every rendered highway value", () => {
  const tiered = new Set(
    LINE_RULES.filter((rule) => rule.key === "highway").flatMap(
      (rule) => rule.values || [],
    ),
  );
  expect(tiered).toEqual(ALL_HIGHWAY_VALUES);
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
