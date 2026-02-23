import {
  Client,
  TravelMode,
  TransitMode,
  Language,
} from "@googlemaps/google-maps-services-js";

const mapsClient = new Client({});

export type RouteResult = {
  mode: string;
  label: string;
  distanceKm: number;
  durationMin: number;
  // individual step instructions (already stripped of HTML);
  // we deliberately return the full list here because the UI will
  // display a condensed preview first and then the complete details
  // after the user makes a selection.
  steps: string[];
  // overview polyline from Google, used when generating a static map
  // image for the detail message. May be undefined if the API didn't
  // provide one (e.g. for the simple ESCOOTER/BICYCLE routes).
  polyline?: string;
};

const TRANSIT_MODES = [
  { travelMode: TravelMode.transit, transitMode: TransitMode.subway, key: "MRT" },
  { travelMode: TravelMode.transit, transitMode: TransitMode.rail, key: "BTS" },
  { travelMode: TravelMode.transit, transitMode: TransitMode.bus, key: "BUS" },
];

export async function getRoutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult[]> {
  const origin = `${originLat},${originLng}`;
  const destination = `${destLat},${destLng}`;
  const key = process.env.GOOGLE_MAPS_API_KEY!;
  const results: RouteResult[] = [];

  // Transit routes (BTS/MRT/Bus) — Google Directions
  for (const { travelMode, transitMode, key: modeKey } of TRANSIT_MODES) {
    try {
      const res = await mapsClient.directions({
        params: {
          origin,
          destination,
          mode: travelMode,
          transit_mode: [transitMode],
          language: Language.th,
          key,
        },
      });
      const route = res.data.routes[0];
      if (!route) continue;
      const leg = route.legs[0];
      const distanceKm = leg.distance.value / 1000;
      const durationMin = Math.ceil(leg.duration.value / 60);
      const steps = leg.steps
        .filter((s) => s.html_instructions)
        .map((s) => s.html_instructions.replace(/<[^>]*>/g, ""));
      const polyline = route.overview_polyline?.points;

      // ป้องกัน duplicate mode
      if (!results.find((r) => r.mode === modeKey)) {
        results.push({ mode: modeKey, label: modeKey, distanceKm, durationMin, steps, polyline });
      }
    } catch {
      // mode นี้ไม่มีเส้นทาง ข้ามไป
    }
  }

  // Walking route
  try {
    const res = await mapsClient.directions({
      params: { origin, destination, mode: TravelMode.walking, language: Language.th, key },
    });
    const route = res.data.routes[0];
    if (route) {
      const leg = route.legs[0];
      const distanceKm = leg.distance.value / 1000;
      // เสนอจักรยาน/e-scooter ถ้าระยะ <= 10km
      if (distanceKm <= 10) {
        results.push({
          mode: "ESCOOTER",
          label: "ESCOOTER",
          distanceKm,
          durationMin: Math.ceil((distanceKm / 20) * 60),
          steps: ["ขี่ E-Scooter (Anywheel/GoGo) ตรงไปยังปลายทาง"],
        });
        results.push({
          mode: "BICYCLE",
          label: "BICYCLE",
          distanceKm,
          durationMin: Math.ceil((distanceKm / 15) * 60),
          steps: ["ขี่จักรยานตรงไปยังปลายทาง"],
        });
      }
    }
  } catch {
    // ignore
  }

  return results;
}
