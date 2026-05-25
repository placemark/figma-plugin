import { RootObject } from "./types";
import { progress } from "./progress";
import { TAGS_FOR_QUERY } from "./tags";

const OVERPASS_SERVERS = [
  { url: "https://overpass-api.de/api/interpreter", hostname: "overpass-api.de" },
  { url: "https://overpass.kumi.systems/api/interpreter", hostname: "overpass.kumi.systems" },
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function fetchWithRetry(query: string): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const server = OVERPASS_SERVERS[attempt % OVERPASS_SERVERS.length];

    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      progress(`Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      progress(`Requesting data from ${server.hostname}…`);
      const res = await fetch(
        `${server.url}?data=${encodeURIComponent(query)}`,
        {
          headersObject: {
            Accept: "application/json",
          },
        } as unknown as RequestInit,
      );

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${server.hostname} returned ${res.status}`);
        continue;
      }

      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("All Overpass API requests failed");
}

export async function request(
  bbox: [number, number, number, number],
  options: { zoom?: number; showBuildings?: boolean } = {},
) {
  // Overpass appears to use lat/lon bbox order
  const bboxString = [bbox[1], bbox[0], bbox[3], bbox[2]].join(",");
  const zoom = options.zoom ?? 15;

  // Build highway query based on zoom, mimicking OpenMapTiles cutoffs:
  //   motorway/trunk/primary: always (z5+)
  //   secondary/tertiary: z11+
  //   residential/unclassified: z12+
  //   service roads: z13+
  //   paths: z13+
  const { highways } = TAGS_FOR_QUERY;
  const highwayTypes = [highways.supermajor, highways.major];
  if (zoom >= 11) highwayTypes.push(highways.traffic);
  if (zoom >= 13) highwayTypes.push(highways.service, highways.paths);
  const highwayRegex = highwayTypes.join("|");

  const parts: string[] = [];

  parts.push(`way["highway"~"^(${highwayRegex})$"](${bboxString});`);

  // Buildings: z13+
  if (zoom >= 13 || options.showBuildings) {
    parts.push(`way["building"](${bboxString});`);
  }

  // Natural features & water: always
  parts.push(`way["natural"~"^(${TAGS_FOR_QUERY.natural})$"](${bboxString});`);
  parts.push(`relation["natural"~"^(water|bay)$"](${bboxString});`);
  parts.push(`way["waterway"](${bboxString});`);
  parts.push(`relation["waterway"](${bboxString});`);

  // Landuse: always
  parts.push(
    `way["landuse"~"^(${TAGS_FOR_QUERY.landuse})$"](${bboxString});`,
  );
  parts.push(`relation["landuse"~"^(pond|basin|reservoir|salt_pond)$"](${bboxString});`);

  // Leisure: always
  parts.push(`way["leisure"~"^(${TAGS_FOR_QUERY.leisure})$"](${bboxString});`);

  // Railway: always
  parts.push(`way["railway"](${bboxString});`);

  // Educational amenities: always
  parts.push(`way["amenity"~"^(${TAGS_FOR_QUERY.amenity})$"](${bboxString});`);

  // Parking structures: z13+
  if (zoom >= 13) {
    parts.push(`way["parking"~"^(${TAGS_FOR_QUERY.parking})$"](${bboxString});`);
  }

  // Trees: z16+
  if (zoom >= 16) {
    parts.push(`node["natural"="tree"](${bboxString});`);
  }

  const query = `[out:json][timeout:30];(\n${parts.map((p) => `    ${p}`).join("\n")}\n  ); out geom;`;

  const res = await fetchWithRetry(query);

  progress("Getting text");

  if (res.status >= 400) {
    const error = (res as any).headersObject.error;
    if (error) {
      throw new Error(error);
    }
    throw new Error("Bad response from server (probably too zoomed-out)");
  }

  /**
   * Figma doesn't have req.json()
   */
  const text = await res.text();

  progress("Parsing JSON");

  return JSON.parse(text) as RootObject;
}
