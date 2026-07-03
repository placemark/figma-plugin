import { Feature, FeatureCollection, Geometry } from "geojson";
import { BBOX, Tags } from "./types";
import { progress } from "./progress";
import { TAGS_FOR_QUERY } from "./tags";

const ENDPOINT = "https://postpass.geofabrik.de/api/interpreter";

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

export function buildQuery(bbox: BBOX) {
  const envelope = `ST_MakeEnvelope(${bbox.join(", ")}, 4326)`;

  // Query only the specific features we need instead of all
  // lines and polygons in the bounding box.
  const filters = [
    `tags->>'highway' IN (${sqlList(TAGS_FOR_QUERY.highway)})`,
    `tags ? 'building'`,
    `tags->>'natural' IN (${sqlList(TAGS_FOR_QUERY.natural)})`,
    `tags->>'landuse' IN (${sqlList(TAGS_FOR_QUERY.landuse)})`,
    `tags->>'leisure' IN (${sqlList(TAGS_FOR_QUERY.leisure)})`,
    `tags ? 'railway'`,
    `tags->>'amenity' IN (${sqlList(TAGS_FOR_QUERY.amenity)})`,
    `tags->>'parking' IN (${sqlList(TAGS_FOR_QUERY.parking)})`,
  ];

  return `SELECT osm_type, osm_id, tags, geom
FROM postpass_linepolygon
WHERE geom && ${envelope}
AND (${filters.join("\n  OR ")})
UNION ALL
SELECT osm_type, osm_id, tags, geom
FROM postpass_point
WHERE geom && ${envelope}
AND tags->>'natural' = 'tree'`;
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
  const query = buildQuery(bbox);

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
