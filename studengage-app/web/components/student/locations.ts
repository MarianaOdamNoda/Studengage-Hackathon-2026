/**
 * Neighbourhood presets near each Bluenose University campus. Used to set a student's
 * home location (for the distance part of the ranking) without asking for an exact address.
 */
export interface LocationPreset {
  label: string;
  lat: number;
  lon: number;
}

export const LOCATION_PRESETS: Record<string, LocationPreset[]> = {
  Harbour: [
    { label: "Downtown Halifax", lat: 44.6476, lon: -63.5728 },
    { label: "South End, Halifax", lat: 44.6335, lon: -63.5795 },
    { label: "North End, Halifax", lat: 44.6589, lon: -63.5985 },
    { label: "Quinpool / West End", lat: 44.6455, lon: -63.6052 },
    { label: "Clayton Park", lat: 44.6638, lon: -63.6488 },
    { label: "Spryfield", lat: 44.6105, lon: -63.6125 },
  ],
  Northshore: [
    { label: "Downtown Dartmouth", lat: 44.6663, lon: -63.5682 },
    { label: "Woodside", lat: 44.6497, lon: -63.5447 },
    { label: "Portland Hills", lat: 44.6797, lon: -63.5198 },
    { label: "Cole Harbour", lat: 44.6731, lon: -63.4897 },
    { label: "Burnside", lat: 44.6992, lon: -63.5806 },
    { label: "Bedford", lat: 44.7290, lon: -63.6557 },
  ],
  Valley: [
    { label: "Wolfville town centre", lat: 45.0911, lon: -64.3602 },
    { label: "Port Williams", lat: 45.1002, lon: -64.4004 },
    { label: "Greenwich", lat: 45.0853, lon: -64.3351 },
    { label: "Kentville", lat: 45.0771, lon: -64.4961 },
    { label: "Grand-Pré", lat: 45.1070, lon: -64.3080 },
  ],
};

/** Presets for a campus; falls back to every preset when the campus name is unknown. */
export function presetsFor(campus: string): LocationPreset[] {
  const key = Object.keys(LOCATION_PRESETS).find((k) => campus.toLowerCase().includes(k.toLowerCase()));
  return key ? LOCATION_PRESETS[key] : Object.values(LOCATION_PRESETS).flat();
}

export function samePlace(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lon - b.lon) < 0.0005;
}
