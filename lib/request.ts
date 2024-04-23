import { RootObject } from "./types";
import { progress } from "./progress";

export async function request(bbox: [number, number, number, number]) {
  // Overpass appears to use lat/lon bbox order
  const bboxString = [bbox[1], bbox[0], bbox[3], bbox[2]].join(",");

  const query = `[out:json][timeout:30];(node(${bboxString});<;node(w););out;`;

  console.log("OVERPASS QUERY:", query);

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
