const flatgeobuf = require("flatgeobuf/dist/flatgeobuf.min.js");
import { proj } from "./projection";
import { BBOX, Pos2 } from "./types";

export async function getWater(bbox: BBOX) {
  const tl = proj([bbox[0], bbox[1]], 256);
  const br = proj([bbox[2], bbox[3]], 256);

  const tiles: Pos2[] = [];

  for (let x = Math.floor(tl[0]); x <= Math.ceil(br[0]); x++) {
    for (let y = Math.floor(tl[1]); y <= Math.ceil(br[1]); y++) {
      tiles.push([x, y]);
    }
  }

  const requests = await Promise.all(
    tiles.map(async (tile) => {
      const res = await fetch(
        `https://data-library.placemark.io/water/${tile[0]}_${tile[1]}.fgb`
      );
      const buffer = await res.arrayBuffer();
      return flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
    })
  );

  console.log(requests);

  return requests;
}
