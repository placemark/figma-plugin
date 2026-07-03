import { Feature, FeatureCollection, Geometry } from "geojson";
import { BBOX, Tags } from "./types";
import { progress } from "./progress";
import { LINE_RULES, POINT_RULES, POLYGON_RULES, TagRule } from "./tags";

const ENDPOINT = "https://postpass.geofabrik.de/api/interpreter";

/**
 * The pixel width of the map in the plugin UI: used to recover
 * the web-map zoom level that a bbox was selected at.
 */
const UI_MAP_WIDTH = 720;

interface PostpassFeature {
  type: "Feature";
  geometry: Geometry;
  properties: {
    osm_type: string;
    osm_id: number;
    tags: Tags;
  };
}

export interface PostpassResponse {
  type: "FeatureCollection";
  features: PostpassFeature[];
}

function sqlList(values: string[]) {
  return values.map((value) => `'${value}'`).join(", ");
}

export function bboxZoom(bbox: BBOX): number {
  const lonSpan = bbox[2] - bbox[0];
  if (!(lonSpan > 0)) return 22;
  const zoom = Math.round(Math.log2((360 / lonSpan) * (UI_MAP_WIDTH / 256)));
  return Math.max(0, Math.min(22, zoom));
}

/**
 * Combine the rules that apply at this zoom into one filter
 * per tag key.
 */
function tagFilters(rules: TagRule[], zoom: number): string[] {
  const byKey = new Map<string, string[] | null>();
  for (const rule of rules) {
    if (zoom < rule.minzoom) continue;
    const values = byKey.get(rule.key);
    // null means a rule already matched every value of this key
    if (values === null) continue;
    byKey.set(rule.key, rule.values ? [...(values || []), ...rule.values] : null);
  }
  return Array.from(byKey, ([key, values]) =>
    values === null
      ? `tags ? '${key}'`
      : `tags->>'${key}' IN (${sqlList(values)})`,
  );
}

/** Width of one screen pixel at this zoom, in degrees of longitude. */
function pixelDegrees(zoom: number): number {
  return 360 / (256 * 2 ** zoom);
}

/**
 * The only tags that grouping and labeling read. Full OSM tag sets
 * (addresses, lane counts…) multiply response size, so everything
 * else is dropped server-side.
 */
const RENDER_KEYS = [
  "highway",
  "railway",
  "natural",
  "landuse",
  "leisure",
  "amenity",
  "parking",
  "building",
  "waterway",
  "name",
];

const PRUNED_TAGS = `jsonb_strip_nulls(jsonb_build_object(${RENDER_KEYS.map(
  (key) => `'${key}', tags->'${key}'`,
).join(", ")}))`;

/**
 * Simplify geometry to a sixteenth of a pixel of tolerance — the
 * quantization precision of vector tiles (4096 units per 256px
 * tile). At high zooms the plain geometry is already that fine.
 */
function simplified(expression: string, zoom: number): string {
  if (zoom >= 15) return expression;
  return `ST_SimplifyPreserveTopology(${expression}, ${pixelDegrees(zoom) / 16})`;
}

/**
 * Mimic OpenMapTiles generalization: below z14, drop polygons
 * smaller than about 4×4 pixels at the current zoom. The result is
 * in square degrees, since postpass geometries are EPSG:4326.
 */
function minPolygonArea(bbox: BBOX, zoom: number): number {
  const pixel = pixelDegrees(zoom);
  const centerLat = (((bbox[1] + bbox[3]) / 2) * Math.PI) / 180;
  return 16 * pixel * pixel * Math.cos(centerLat);
}

/**
 * Below this zoom, contiguous lines that share their rendered tags
 * (the same road, split into many OSM ways) are merged server-side,
 * the way OpenMapTiles merges them in zoomed-out tiles.
 */
const LINE_MERGE_MAX_ZOOM = 12;

export function buildQuery(bbox: BBOX, zoom: number) {
  const envelope = `ST_MakeEnvelope(${bbox.join(", ")}, 4326)`;
  const branches: string[] = [];

  const lineFilters = tagFilters(LINE_RULES, zoom);
  if (lineFilters.length) {
    if (zoom < LINE_MERGE_MAX_ZOOM) {
      const merged = simplified(
        `ST_LineMerge(ST_CollectionExtract(ST_Collect(geom), 2))`,
        zoom,
      );
      branches.push(`SELECT 'W' AS osm_type, min(osm_id) AS osm_id, ${PRUNED_TAGS} AS tags, ${merged} AS geom
FROM postpass_line
WHERE geom && ${envelope}
AND (${lineFilters.join("\n  OR ")})
GROUP BY ${PRUNED_TAGS}`);
    } else {
      branches.push(`SELECT osm_type, osm_id, ${PRUNED_TAGS} AS tags, ${simplified("geom", zoom)} AS geom
FROM postpass_line
WHERE geom && ${envelope}
AND (${lineFilters.join("\n  OR ")})`);
    }
  }

  const polygonFilters = tagFilters(POLYGON_RULES, zoom);
  if (polygonFilters.length) {
    const areaFilter =
      zoom < 14 ? `\nAND ST_Area(geom) > ${minPolygonArea(bbox, zoom)}` : "";
    branches.push(`SELECT osm_type, osm_id, ${PRUNED_TAGS} AS tags, ${simplified("geom", zoom)} AS geom
FROM postpass_polygon
WHERE geom && ${envelope}
AND (${polygonFilters.join("\n  OR ")})${areaFilter}`);
  }

  const pointFilters = tagFilters(POINT_RULES, zoom);
  if (pointFilters.length) {
    branches.push(`SELECT osm_type, osm_id, ${PRUNED_TAGS} AS tags, geom
FROM postpass_point
WHERE geom && ${envelope}
AND (${pointFilters.join("\n  OR ")})`);
  }

  return branches.join("\nUNION ALL\n");
}

/**
 * Postpass nests OSM tags under a `tags` member of each feature's
 * properties, and returns every line as a MultiLineString. Flatten
 * tags so the grouping code can read them directly, and unwrap
 * single-member MultiLineStrings because line labeling only
 * handles LineStrings.
 */
export function toFeatureCollection(
  response: PostpassResponse,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: response.features.map((feature): Feature => {
      const { osm_type, osm_id, tags } = feature.properties;
      const geometry: Geometry =
        feature.geometry.type === "MultiLineString" &&
        feature.geometry.coordinates.length === 1
          ? {
              type: "LineString",
              coordinates: feature.geometry.coordinates[0],
            }
          : feature.geometry;
      return {
        type: "Feature",
        geometry,
        properties: {
          ...tags,
          id: `${osm_type}${osm_id}`,
        },
      };
    }),
  };
}

export async function request(bbox: BBOX): Promise<FeatureCollection> {
  const query = buildQuery(bbox, bboxZoom(bbox));

  console.log(`${ENDPOINT}?data=${encodeURIComponent(query)}`);

  const res = await fetch(`${ENDPOINT}?data=${encodeURIComponent(query)}`, {
    /**
     * Figma doesn't support Headers()
     */
    headersObject: {
      Accept: "application/json",
    },
  } as unknown as RequestInit);

  progress("Getting text");

  /**
   * Figma doesn't have req.json()
   */
  const text = await res.text();

  if (res.status >= 400) {
    // Postpass returns errors as plain text.
    throw new Error(
      text || "Bad response from server (probably too zoomed-out)",
    );
  }

  progress("Parsing JSON");

  return toFeatureCollection(JSON.parse(text) as PostpassResponse);
}
