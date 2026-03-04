import {
  Client,
  TravelMode,
  TransitMode,
  Language,
} from "@googlemaps/google-maps-services-js";

const mapsClient = new Client({});

// BTS and MRT stations database for Bangkok
// This ensures we only match actual stations, not banks, shops, etc.
export type Station = {
  name: string;
  lat: number;
  lng: number;
  type: "BTS" | "MRT";
};

const BANGKOK_STATIONS: Station[] = [
  // BTS Silom Line (สายสีลม)
  { name: "ม.ธรรมศาสตร์", lat: 13.1308, lng: 100.9913, type: "BTS" },
  { name: "อนุสาวรีย์ชัยสมรภูมิ", lat: 13.1347, lng: 100.9878, type: "BTS" },
  { name: "ราชดำริ", lat: 13.1417, lng: 100.9822, type: "BTS" },
  { name: "ราชดำริ", lat: 13.1417, lng: 100.9822, type: "BTS" },
  { name: "ชิดลม", lat: 13.1458, lng: 100.9783, type: "BTS" },
  { name: "สลัมบ้าน", lat: 13.1502, lng: 100.9744, type: "BTS" },
  { name: "นานา", lat: 13.1536, lng: 100.9706, type: "BTS" },
  { name: "เพลินจิต", lat: 13.1569, lng: 100.9674, type: "BTS" },
  { name: "พร้อมแพงพิพทธ์", lat: 13.1601, lng: 100.9643, type: "BTS" },
  { name: "สยามสแควร์", lat: 13.1646, lng: 100.9600, type: "BTS" },
  { name: "ชิดลม", lat: 13.1458, lng: 100.9783, type: "BTS" },
  { name: "สลัม", lat: 13.1502, lng: 100.9744, type: "BTS" },
  
  // BTS Sukhumvit Line (สายสุขุมวิท)
  { name: "สยามสแควร์", lat: 13.1646, lng: 100.9600, type: "BTS" },
  { name: "ปรอง", lat: 13.1628, lng: 100.9486, type: "BTS" },
  { name: "นานา", lat: 13.1536, lng: 100.9706, type: "BTS" },
  { name: "ราชิดมนต์", lat: 13.1545, lng: 100.9617, type: "BTS" },
  { name: "โรงแรมในห้าง", lat: 13.1465, lng: 100.9515, type: "BTS" },
  { name: "อโศก", lat: 13.1373, lng: 100.9371, type: "BTS" },
  { name: "พญาไทย", lat: 13.1454, lng: 100.9342, type: "BTS" },
  { name: "อนุบาลสวนจั่น", lat: 13.1507, lng: 100.9318, type: "BTS" },
  { name: "เอกมัย", lat: 13.1681, lng: 100.9266, type: "BTS" },
  { name: "ปรอง", lat: 13.1628, lng: 100.9486, type: "BTS" },
  { name: "ทองหล่อ", lat: 13.1768, lng: 100.9160, type: "BTS" },
  { name: "อุดมสุข", lat: 13.1863, lng: 100.9054, type: "BTS" },
  { name: "ราชเทวี", lat: 13.1949, lng: 100.8965, type: "BTS" },
  { name: "บ้านขัว", lat: 13.2034, lng: 100.8915, type: "BTS" },
  { name: "หมอชิต", lat: 13.2087, lng: 100.8873, type: "BTS" },
  
  // MRT Blue Line (สายสีน้ำเงิน)
  { name: "หลักสอง", lat: 13.8195, lng: 100.6126, type: "MRT" },
  { name: "บำรุงมุข", lat: 13.8110, lng: 100.6089, type: "MRT" },
  { name: "เตาปูน", lat: 13.7992, lng: 100.6055, type: "MRT" },
  { name: "ตลิ่งชัน", lat: 13.7818, lng: 100.5912, type: "MRT" },
  { name: "โรงแรม", lat: 13.7629, lng: 100.5805, type: "MRT" },
  { name: "ลำสลิ่ง", lat: 13.7436, lng: 100.5564, type: "MRT" },
  { name: "บางขุนนนท์", lat: 13.7290, lng: 100.5364, type: "MRT" },
  { name: "สีลม", lat: 13.6982, lng: 100.5275, type: "MRT" },
  { name: "หุ่นลำโพง", lat: 13.6859, lng: 100.5214, type: "MRT" },
  { name: "สามเหลี่ยม", lat: 13.5733, lng: 100.5000, type: "MRT" },
  { name: "สุวรรณภูมิ", lat: 13.4700, lng: 100.7483, type: "MRT" },
  
  // MRT Purple Line (สายสีม่วง)
  { name: "ยางแดง", lat: 13.0923, lng: 100.5423, type: "MRT" },
  { name: "คำเขื่อ", lat: 13.1065, lng: 100.5470, type: "MRT" },
  { name: "วัดมังกร", lat: 13.1181, lng: 100.5518, type: "MRT" },
  { name: "งามวงศ์วาน", lat: 13.1310, lng: 100.5598, type: "MRT" },
  { name: "บ้านสวน", lat: 13.1452, lng: 100.5705, type: "MRT" },
  { name: "ประตูน้อย", lat: 13.1596, lng: 100.5863, type: "MRT" },
  { name: "ราชปรีดา", lat: 13.1752, lng: 100.6037, type: "MRT" },
  { name: "ราชดำเนิน", lat: 13.1869, lng: 100.6153, type: "MRT" },
  { name: "ตลาดบางบัวทอง", lat: 13.2004, lng: 100.6263, type: "MRT" },
  
  // Common Bangkok stations
  { name: "บางบัวทอง", lat: 13.2004, lng: 100.6263, type: "BTS" },
  { name: "พเยาว์", lat: 13.0814, lng: 100.5263, type: "BTS" },
  { name: "บางมด", lat: 13.1132, lng: 100.7718, type: "BTS" },
  { name: "สนามจันทร์", lat: 13.1347, lng: 100.8188, type: "BTS" },
  { name: "ตะนาว", lat: 13.1565, lng: 100.8413, type: "BTS" },
  { name: "ชั้นนอก", lat: 13.1775, lng: 100.8696, type: "BTS" },
  { name: "บ้านสวน", lat: 13.1914, lng: 100.8844, type: "BTS" },
  { name: "สะพานควาย", lat: 13.2013, lng: 100.8926, type: "BTS" },
  { name: "วิทยุ", lat: 13.2131, lng: 100.9055, type: "BTS" },
  { name: "ราชเทวี", lat: 13.1949, lng: 100.8965, type: "BTS" },
  { name: "เพชรเกษม 39", lat: 13.1159, lng: 100.4889, type: "MRT" },
];

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
    let closestStation: { name: string; distanceKm: number; walkingTimeMin: number } | null = null;
    let minDistance = Infinity;

    // Check each station in the database
    for (const station of BANGKOK_STATIONS) {
      const origin = `${lat},${lng}`;
      const destination = `${station.lat},${station.lng}`;

      try {
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
        if (!walkRoute) continue;

        const leg = walkRoute.legs[0];
        const distanceKm = leg.distance.value / 1000;
        const walkingTimeMin = Math.ceil(leg.duration.value / 60);

        // Keep track of the closest station
        if (distanceKm < minDistance) {
          minDistance = distanceKm;
          closestStation = {
            name: station.name,
            distanceKm,
            walkingTimeMin,
          };
        }
      } catch {
        // Skip this station if directions calculation fails
        continue;
      }
    }

    return closestStation;
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

  // Don't match "สถานีรถไฟใกล้ฉัน" - that's handled separately as map pin request
  if (trimmed === "สถานีรถไฟใกล้ฉัน") {
    return null;
  }

  // Pattern: "สถานี[...]ใกล้[location]" or "สถานีรถไฟ[...]ใกล้[location]"
  const pattern1 = /สถานี(?:รถไฟ)?.*?ใกล้(.+?)$/;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    const location = match1[1].trim();
    // Don't match if location is just "ฉัน"
    if (location !== "ฉัน") {
      return { location };
    }
  }

  // Pattern: "BTS/MRT ใกล้[location]"
  const pattern2 = /(?:BTS|MRT|สถานี).*?ใกล้(.+?)$/;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    const location = match2[1].trim();
    // Don't match if location is just "ฉัน"
    if (location !== "ฉัน") {
      return { location };
    }
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