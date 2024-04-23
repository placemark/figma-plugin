/**
 * Vendored from https://github.com/mapbox/tilebelt
 */
const d2r = Math.PI / 180;

/**
 * Get the tile for a point at a specified zoom level
 *
 * @name pointToTile
 */
export function pointToTile(lon: number, lat: number, z: number) {
  const tile = pointToTileFraction(lon, lat, z);
  tile[0] = Math.floor(tile[0]);
  tile[1] = Math.floor(tile[1]);
  return tile;
}

/**
 * Get the precise fractional tile location for a point at a zoom level
 */
export function pointToTileFraction(lon: number, lat: number, z: number) {
  const sin = Math.sin(lat * d2r);
  const z2 = Math.pow(2, z);
  let x = z2 * (lon / 360 + 0.5);
  const y = z2 * (0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI);

  // Wrap Tile X
  x = x % z2;
  if (x < 0) x = x + z2;
  return [x, y, z];
}
