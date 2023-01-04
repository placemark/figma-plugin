import { RootObject } from "./types";
import { progress } from "./progress";

export async function request(bbox: [number, number, number, number]) {
  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A30%5D%3B%28node%28${bbox[1]}%2C${bbox[0]}%2C${bbox[3]}%2C${bbox[2]}%29%3B%3C%3Bnode%28w%29%3B%29%3Bout%3B`
    {
      /**
       * Figma doesn't support Headers()
       */
      headersObject: {
        Accept: "application/json",
      },
    } as unknown as RequestInit
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
