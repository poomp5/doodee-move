// CO2 emission in grams per km per person
export const CO2_PER_KM: Record<string, number> = {
  CAR: 171,
  BUS: 68,
  BTS: 41,
  MRT: 41,
  ESCOOTER: 22, // Anywheel, GoGo
  BICYCLE: 0,
  WALK: 0,
};

export const MODE_LABEL: Record<string, string> = {
  BTS: "BTS Skytrain",
  MRT: "MRT / รถไฟฟ้า",
  BUS: "รถเมล์",
  ESCOOTER: "E-Scooter (Anywheel/GoGo)",
  BICYCLE: "จักรยาน",
  WALK: "เดิน",
  CAR: "รถยนต์/แท็กซี่",
};

export const MODE_EMOJI: Record<string, string> = {
  BTS: "🚆",
  MRT: "🚇",
  BUS: "🚌",
  ESCOOTER: "🛴",
  BICYCLE: "🚲",
  WALK: "🚶",
  CAR: "🚗",
};

/**
 * คำนวณ CO2 ที่ประหยัดได้เทียบกับการขับรถยนต์ (กรัม)
 */
export function calcCo2Saved(distanceKm: number, mode: string): number {
  const modeCo2 = CO2_PER_KM[mode] ?? 0;
  const carCo2 = CO2_PER_KM.CAR;
  return Math.max(0, (carCo2 - modeCo2) * distanceKm);
}

/**
 * แปลง CO2 ที่ประหยัดได้เป็นแต้มรักษ์โลก
 * ทุก 10g CO2 ที่ประหยัดได้ = 1 แต้ม
 */
export function calcPoints(co2SavedGrams: number): number {
  return Math.floor(co2SavedGrams / 10);
}
