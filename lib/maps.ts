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

export async function getNearestTrainStation(
  lat: number,
  lng: number
): Promise<{ name: string; distanceKm: number; walkingTimeMin: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY!;
  
  try {
    // Find nearest transit station (includes BTS, MRT, and other transit stations)
    const res = await mapsClient.placesNearby({
      params: {
        location: { lat, lng },
        radius: 5000, // 5km radius
        type: "transit_station",
        key,
        language: Language.th,
      },
    });

    if (!res.data.results || res.data.results.length === 0) {
      return null;
    }

    // Find the closest station
    let nearestStop = res.data.results[0];
    if (!nearestStop?.geometry?.location) {
      return null;
    }

    const stopLat = nearestStop.geometry.location.lat;
    const stopLng = nearestStop.geometry.location.lng;

    // Calculate walking distance and time to the station
    const origin = `${lat},${lng}`;
    const destination = `${stopLat},${stopLng}`;

    const walkRes = await mapsClient.directions({
      params: {
        origin,
        destination,
        mode: TravelMode.walking,
        language: Language.th,
        key,
      },
    });

    const walkRoute = walkRes.data.routes[0];
    if (!walkRoute) return null;

    const leg = walkRoute.legs[0];
    const distanceKm = leg.distance.value / 1000;
    const walkingTimeMin = Math.ceil(leg.duration.value / 60);

    return {
      name: nearestStop.name || "สถานีรถไฟ",
      distanceKm,
      walkingTimeMin,
    };
  } catch (error) {
    console.error("[maps] getNearestTrainStation error", error);
    return null;
  }
}

/**
 * Find nearest train station from a place (by name)
 * Usage: "สถานีรถไฟใกล้เดอะมอล" -> finds nearest station from The Mall
 */
export async function getNearestTrainStationFromPlace(
  placeName: string
): Promise<{ name: string; distanceKm: number; walkingTimeMin: number } | null> {
  try {
    // First geocode the place
    const placeGeocode = await geocodePlace(placeName);
    if (!placeGeocode) {
      return null;
    }

    // Then find nearest station from that location
    return getNearestTrainStation(placeGeocode.lat, placeGeocode.lng);
  } catch (error) {
    console.error("[maps] getNearestTrainStationFromPlace error", error);
    return null;
  }
}

/**
 * Parse Thai text for train station queries
 * Supports formats like:
 * - "สถานีรถไฟใกล้เดอะมอล" (nearest train station from The Mall)
 * - "สถานีใกล้เดอะมอล" (nearest station from The Mall)
 * - "BTS ใกล้เดอะมอล" (nearest BTS from The Mall)
 */
export function parseTrainStationQuery(text: string): { location: string } | null {
  const trimmed = text.trim();

  // Pattern: "สถานี[...]ใกล้[location]" or "สถานีรถไฟ[...]ใกล้[location]"
  const pattern1 = /สถานี(?:รถไฟ)?.*?ใกล้(.+?)$/;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    return { location: match1[1].trim() };
  }

  // Pattern: "BTS/MRT ใกล้[location]"
  const pattern2 = /(?:BTS|MRT|สถานี).*?ใกล้(.+?)$/;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    return { location: match2[1].trim() };
  }

  return null;
}

/**
 * Geocode a place name to coordinates
 * Uses Google Geocoding API with Bangkok, Thailand context
 */
export async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY!;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + " Bangkok Thailand")}&key=${key}&language=th`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data?.results?.[0]?.partial_match) {
      console.warn("[maps] Geocode partial_match", { query, topResult: data.results[0].formatted_address });
    }
    
    if (data.status !== "OK" || !data.results[0]) return null;
    
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (error) {
    console.error("[maps] geocodePlace error", error);
    return null;
  }
}

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
      let steps = leg.steps
        .filter((s) => s.html_instructions)
        .map((s) =>
          s.html_instructions
            .replace(/<[^>]*>/g, "")
            // strip Google "plus codes" which are useless in directions
            .replace(/\b[A-Z0-9]{4}\+[A-Z0-9]{2,3}\b/g, "")
            .trim()
        );
      const polyline = route.overview_polyline?.points;

      // ป้องกัน duplicate mode
      if (!results.find((r) => r.mode === modeKey)) {
        results.push({ mode: modeKey, label: modeKey, distanceKm, durationMin, steps, polyline });
      }
    } catch {
      // mode นี้ไม่มีเส้นทาง ข้ามไป
    }
  }

  // Walking/equipment routes
  try {
    const res = await mapsClient.directions({
      params: { origin, destination, mode: TravelMode.walking, language: Language.th, key },
    });
    const walkRoute = res.data.routes[0];
    if (walkRoute) {
      const leg = walkRoute.legs[0];
      const distanceKm = leg.distance.value / 1000;
      // always offer walking as an option
      results.push({
        mode: "WALK",
        label: "เดิน",
        distanceKm,
        durationMin: Math.ceil(leg.duration.value / 60),
        steps: leg.steps
          .filter((s) => s.html_instructions)
          .map((s) => s.html_instructions.replace(/<[^>]*>/g, "").replace(/\b[A-Z0-9]{4}\+[A-Z0-9]{2,3}\b/g, "").trim()),
        polyline: walkRoute.overview_polyline?.points,
      });

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

  // Driving / taxi route – good fallback when transit isn’t practical
  try {
    const res = await mapsClient.directions({
      params: { origin, destination, mode: TravelMode.driving, language: Language.th, key },
    });
    const driveRoute = res.data.routes[0];
    if (driveRoute) {
      const leg = driveRoute.legs[0];
      const distanceKm = leg.distance.value / 1000;
      const durationMin = Math.ceil(leg.duration.value / 60);
      const steps = leg.steps
        .filter((s) => s.html_instructions)
        .map((s) =>
          s.html_instructions
            .replace(/<[^>]*>/g, "")
            .replace(/\b[A-Z0-9]{4}\+[A-Z0-9]{2,3}\b/g, "")
            .trim()
        );
      // only add driving if it isn’t already represented by a transit mode
      if (!results.find((r) => r.mode === "CAR")) {
        results.push({
          mode: "CAR",
          label: "รถยนต์/แท็กซี่",
          distanceKm,
          durationMin,
          steps,
          polyline: driveRoute.overview_polyline?.points,
        });
      }
    }
  } catch {
    // ignore
  }

  return results;
}
/**
 * Parse Thai text to extract origin and destination
 * Supports formats like:
 * - "ไปสยามจากเดอะมอล" (go to Siam from The Mall)
 * - "เดอะมอลไปสยาม" (The Mall go to Siam)
 * - "จากเดอะมอลไปสยาม" (from The Mall go to Siam)
 */
export function parseThaiDirectionText(text: string): { origin: string; destination: string } | null {
  const trimmed = text.trim();
  
  // Pattern 1: "ไป[destination]จาก[origin]"
  const pattern1 = /ไป(.+?)จาก(.+?)$/;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    return {
      destination: match1[1].trim(),
      origin: match1[2].trim(),
    };
  }

  // Pattern 2: "จาก[origin]ไป[destination]"
  const pattern2 = /จาก(.+?)ไป(.+?)$/;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    return {
      origin: match2[1].trim(),
      destination: match2[2].trim(),
    };
  }

  // Pattern 3: "[origin]ไป[destination]"
  const pattern3 = /^(.+?)ไป(.+?)$/;
  const match3 = trimmed.match(pattern3);
  if (match3) {
    return {
      origin: match3[1].trim(),
      destination: match3[2].trim(),
    };
  }

  return null;
}