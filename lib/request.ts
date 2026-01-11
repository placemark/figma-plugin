import { RootObject } from "./types";
import { progress } from "./progress";
import { TAGS_FOR_QUERY } from "./tags";

export async function request(bbox: [number, number, number, number]) {
  // Overpass appears to use lat/lon bbox order
  const bboxString = [bbox[1], bbox[0], bbox[3], bbox[2]].join(",");

  // Query only the specific features we need instead of all nodes/ways
  // This is much more efficient than downloading all nodes then all ways
  const query = `[out:json][timeout:30];(
    // Highways (roads)
    way["highway"~"^(${TAGS_FOR_QUERY.highway})$"](${bboxString});
    // Buildings
    way["building"](${bboxString});
    // Natural features
    way["natural"~"^(${TAGS_FOR_QUERY.natural})$"](${bboxString});
    // Landuse
    way["landuse"~"^(industrial|commercial|retail|residential|pond|basin|reservoir|salt_pond|forest|railway|flowerbed|grass|cemetery|recreation_ground|village_green)$"](${bboxString});
    // Leisure
    way["leisure"~"^(${TAGS_FOR_QUERY.leisure})$"](${bboxString});
    // Railway
    way["railway"](${bboxString});
    // Educational amenities
    way["amenity"~"^(${TAGS_FOR_QUERY.amenity})$"](${bboxString});
    // Parking structures
    way["parking"~"^(${TAGS_FOR_QUERY.parking})$"](${bboxString});
    // Individual trees (points)
    node["natural"="tree"](${bboxString});
  ); out geom;`;

  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    {
      /**
       * Figma doesn't support Headers()
       */
      headersObject: {
        Accept: "application/json",
      },
    } as unknown as RequestInit,
  );

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
