/**
 * Zoom cutoffs for Overpass query layers,
 * matching OpenMapTiles conventions.
 * minZoom = null means always included.
 */
export const ZOOM_LAYERS = [
  { name: "Motorway / trunk / primary", minZoom: null },
  { name: "Water & waterways", minZoom: null },
  { name: "Landuse", minZoom: null },
  { name: "Parks & leisure", minZoom: null },
  { name: "Railway", minZoom: null },
  { name: "Education", minZoom: null },
  { name: "Ocean", minZoom: null },
  { name: "Secondary / tertiary roads", minZoom: 11 },
  { name: "Service roads & paths", minZoom: 13 },
  { name: "Buildings", minZoom: 13 },
  { name: "Parking structures", minZoom: 13 },
  { name: "Trees", minZoom: 16 },
] as const;
