import { RootObject } from "./types";

export async function request(bbox: [number, number, number, number]) {
  const res = await fetch(
    `https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.join(",")}`,
    {
      /**
       * Figma doesn't support Headers()
       */
      headersObject: {
        Accept: "application/json",
      },
    }
  );

  figma.ui.postMessage({ type: "progress", message: "Parsing response" });

  if (res.status >= 400) {
    if (res.headersObject.error) {
      throw new Error(res.headersObject.error);
    }
    throw new Error("Bad response from server");
  }

  /**
   * Figma doesn't have req.json()
   */
  const text = await res.text();

  return JSON.parse(text) as RootObject;
}
