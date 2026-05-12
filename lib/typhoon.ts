import type { RouteResult } from "./maps";

const TYPHOON_BASE_URL = "https://api.opentyphoon.ai/v1";

type TyphoonMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type TyphoonResponse = {
  choices: { message: { content: string } }[];
};

async function callTyphoon(
  messages: TyphoonMessage[],
  maxTokens = 500
): Promise<string> {
  const apiKey = process.env.TYPHOON;
  if (!apiKey) throw new Error("TYPHOON API key not configured");

  const res = await fetch(`${TYPHOON_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "typhoon-v2.5-30b-a3b-instruct",
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Typhoon API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as TyphoonResponse;
  return data.choices[0]?.message?.content?.trim() ?? "";
}

export type ParsedIntent =
  | { type: "destination_only"; destination: string }
  | { type: "origin_and_destination"; origin: string; destination: string }
  | { type: "unknown" };

/**
 * ให้ Typhoon วิเคราะห์ว่า user พิมพ์อะไรมา — บอกแค่ปลายทาง หรือ origin+dest
 * ตัวอย่าง:
 *   "อยากไปจุฬา"          → destination_only: "จุฬาลงกรณ์มหาวิทยาลัย"
 *   "เดอะมอลไปสยาม"       → origin_and_destination
 *   "จากบ้านไปออฟฟิศ"     → origin_and_destination
 *   "ร้านกาแฟใกล้ๆ"       → unknown (ไม่ใช่ direction request)
 */
export async function parseUserIntent(text: string): Promise<ParsedIntent> {
  try {
    const result = await callTyphoon(
      [
        {
          role: "system",
          content: `คุณช่วยวิเคราะห์ข้อความจากผู้ใช้แอปนำทางในไทย แล้วตอบเป็น JSON เท่านั้น ห้ามตอบอย่างอื่น

รูปแบบ JSON ที่ต้องตอบ (เลือก 1 แบบ):
1. ถ้าบอกแค่ปลายทาง: {"type":"destination_only","destination":"ชื่อสถานที่ปลายทาง"}
2. ถ้าบอกทั้งต้นทางและปลายทาง: {"type":"origin_and_destination","origin":"ต้นทาง","destination":"ปลายทาง"}
3. ถ้าไม่ใช่คำถามเกี่ยวกับการเดินทาง: {"type":"unknown"}

กฎ:
- ชื่อสถานที่ให้เขียนให้ครบ เช่น "จุฬา" → "จุฬาลงกรณ์มหาวิทยาลัย", "เดอะมอล" → "The Mall"
- คำว่า "อยาก", "ต้องการ", "จะ", "ขอ" ไม่ใช่ชื่อสถานที่
- ตอบ JSON เท่านั้น ห้ามมีข้อความอื่น`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      120
    );

    const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as ParsedIntent;
    console.log(`[typhoon] parseUserIntent "${text}" →`, parsed);
    return parsed;
  } catch (err) {
    console.error(`[typhoon] parseUserIntent failed for "${text}"`, err);
    return { type: "unknown" };
  }
}

/**
 * Normalize ชื่อสถานที่ไทยที่พิมพ์ย่อ/ผิดสะกด ให้ Google Maps หาเจอ
 * ใช้ความรู้ทั่วไปของ Typhoon เกี่ยวกับสถานที่ในไทย (ไม่ใช่ route data)
 * return ชื่อที่ normalize แล้ว หรือชื่อเดิมถ้า Typhoon ล้มเหลว
 */
export async function normalizePlaceName(placeName: string): Promise<string> {
  try {
    const result = await callTyphoon(
      [
        {
          role: "system",
          content: `คุณช่วย normalize ชื่อสถานที่ในประเทศไทยให้ Google Maps ค้นหาได้
กฎ:
- ตอบแค่ชื่อสถานที่ที่ normalize แล้ว ไม่ต้องอธิบาย
- ถ้าเป็นชื่อย่อ ให้เป็นชื่อเต็ม เช่น "เดอะมอล" → "The Mall"
- ถ้าสะกดผิด ให้แก้ให้ถูก เช่น "สยามพารา" → "Siam Paragon"
- ถ้าชื่อถูกแล้วหรือไม่รู้จัก ให้ตอบชื่อเดิมกลับมา
- ตอบเป็นภาษาไทยหรืออังกฤษตามที่เหมาะสมกับ Google Maps`,
        },
        {
          role: "user",
          content: `normalize ชื่อสถานที่นี้: "${placeName}"`,
        },
      ],
      50
    );

    const normalized = result.trim().replace(/^["']|["']$/g, "");
    if (normalized && normalized.length > 0) {
      console.log(`[typhoon] normalizePlaceName "${placeName}" → "${normalized}"`);
      return normalized;
    }
    return placeName;
  } catch (err) {
    console.error(`[typhoon] normalizePlaceName failed for "${placeName}", using original`, err);
    return placeName;
  }
}

/**
 * อธิบาย route summary เป็นภาษาไทยที่เข้าใจง่าย
 * ใช้เฉพาะข้อมูลจาก Google Maps ที่ได้รับมา ห้าม hallucinate
 */
export async function explainRoute(
  route: RouteResult,
  originLabel: string,
  destLabel: string
): Promise<string> {
  const stepsText = route.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

  const explanation = await callTyphoon([
    {
      role: "system",
      content: `คุณคือผู้ช่วยนำทางของ Doodee Move แอปขนส่งสาธารณะในประเทศไทย

กฎสำคัญที่ต้องปฏิบัติอย่างเคร่งครัด:
- ใช้เฉพาะข้อมูลที่ได้รับใน context เท่านั้น ห้ามเพิ่มข้อมูลที่ไม่มีในข้อมูลที่ให้ไว้
- ห้าม hallucinate ราคา, เวลา, หรือสถานีที่ไม่ได้ระบุใน context
- ถ้าข้อมูลไม่ชัดเจน ให้บอกตามที่มีเท่านั้น อย่าเดา
- ตอบเป็นภาษาไทยที่เป็นธรรมชาติ สั้น กระชับ เหมาะสำหรับ LINE chat`,
    },
    {
      role: "user",
      content: `ข้อมูลเส้นทางจาก Google Maps (ข้อมูลจริง):
- ต้นทาง: ${originLabel}
- ปลายทาง: ${destLabel}
- วิธีเดินทาง: ${route.label}
- ระยะทาง: ${route.distanceKm.toFixed(1)} กม.
- เวลาโดยประมาณ: ${route.durationMin} นาที

ขั้นตอนการเดินทาง:
${stepsText}

อธิบายเส้นทางนี้เป็นภาษาไทยที่เข้าใจง่ายสำหรับผู้ใช้ทั่วไป ใช้ข้อมูลข้างต้นเท่านั้น อธิบายแบบกระชับ 2-4 ประโยค`,
    },
  ]);

  return explanation;
}

/**
 * เปรียบเทียบและแนะนำเส้นทางที่ดีที่สุด
 * ใช้เฉพาะข้อมูลจาก Google Maps ที่ได้รับมา ห้าม hallucinate
 */
export async function recommendBestRoute(
  routes: RouteResult[],
  originLabel: string,
  destLabel: string
): Promise<string> {
  const routeSummaries = routes
    .map(
      (r) =>
        `- ${r.label}: ${r.distanceKm.toFixed(1)} กม., ${r.durationMin} นาที`
    )
    .join("\n");

  const recommendation = await callTyphoon([
    {
      role: "system",
      content: `คุณคือผู้ช่วยนำทางของ Doodee Move แอปขนส่งสาธารณะในประเทศไทย

กฎสำคัญที่ต้องปฏิบัติอย่างเคร่งครัด:
- ใช้เฉพาะข้อมูลที่ได้รับใน context เท่านั้น ห้ามเพิ่มข้อมูลที่ไม่มีในข้อมูลที่ให้ไว้
- ห้าม hallucinate ราคา, เวลา, หรือสถานีที่ไม่ได้ระบุใน context
- แนะนำตามข้อมูลระยะทางและเวลาจริงที่มีเท่านั้น
- ตอบเป็นภาษาไทยที่เป็นธรรมชาติ สั้น กระชับ เหมาะสำหรับ LINE chat`,
    },
    {
      role: "user",
      content: `ข้อมูลเส้นทางทั้งหมดจาก Google Maps (ข้อมูลจริง):
- ต้นทาง: ${originLabel}
- ปลายทาง: ${destLabel}

ตัวเลือกเส้นทาง:
${routeSummaries}

แนะนำเส้นทางที่เหมาะสมที่สุดสำหรับขนส่งสาธารณะ โดยใช้ข้อมูลข้างต้นเท่านั้น อธิบายแบบกระชับ 1-2 ประโยค`,
    },
  ]);

  return recommendation;
}
