import type { RouteResult } from "./maps";

const TYPHOON_BASE_URL = "https://api.opentyphoon.ai/v1";

type TyphoonMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type TyphoonResponse = {
  choices: { message: { content: string } }[];
};

async function callTyphoon(messages: TyphoonMessage[]): Promise<string> {
  const apiKey = process.env.TYPHOON;
  if (!apiKey) throw new Error("TYPHOON API key not configured");

  const res = await fetch(`${TYPHOON_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "typhoon-v2.1-12b-instruct",
      messages,
      max_tokens: 500,
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

  const systemPrompt = `คุณคือผู้ช่วยนำทางของ Doodee Move แอปขนส่งสาธารณะในประเทศไทย

กฎสำคัญที่ต้องปฏิบัติอย่างเคร่งครัด:
- ใช้เฉพาะข้อมูลที่ได้รับใน context เท่านั้น ห้ามเพิ่มข้อมูลที่ไม่มีในข้อมูลที่ให้ไว้
- ห้าม hallucinate ราคา, เวลา, หรือสถานีที่ไม่ได้ระบุใน context
- ถ้าข้อมูลไม่ชัดเจน ให้บอกตามที่มีเท่านั้น อย่าเดา
- ตอบเป็นภาษาไทยที่เป็นธรรมชาติ สั้น กระชับ เหมาะสำหรับ LINE chat
- ไม่ต้องใส่ emoji มากเกินไป`;

  const userPrompt = `ข้อมูลเส้นทางจาก Google Maps (ข้อมูลจริง):
- ต้นทาง: ${originLabel}
- ปลายทาง: ${destLabel}
- วิธีเดินทาง: ${route.label}
- ระยะทาง: ${route.distanceKm.toFixed(1)} กม.
- เวลาโดยประมาณ: ${route.durationMin} นาที

ขั้นตอนการเดินทาง:
${stepsText}

โปรดอธิบายเส้นทางนี้เป็นภาษาไทยที่เข้าใจง่ายสำหรับผู้ใช้ทั่วไป ใช้ข้อมูลข้างต้นเท่านั้น อธิบายแบบกระชับ 2-4 ประโยค`;

  const explanation = await callTyphoon([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
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

  const systemPrompt = `คุณคือผู้ช่วยนำทางของ Doodee Move แอปขนส่งสาธารณะในประเทศไทย

กฎสำคัญที่ต้องปฏิบัติอย่างเคร่งครัด:
- ใช้เฉพาะข้อมูลที่ได้รับใน context เท่านั้น ห้ามเพิ่มข้อมูลที่ไม่มีในข้อมูลที่ให้ไว้
- ห้าม hallucinate ราคา, เวลา, หรือสถานีที่ไม่ได้ระบุใน context
- แนะนำตามข้อมูลระยะทางและเวลาจริงที่มีเท่านั้น
- ตอบเป็นภาษาไทยที่เป็นธรรมชาติ สั้น กระชับ เหมาะสำหรับ LINE chat
- ไม่ต้องใส่ emoji มากเกินไป`;

  const userPrompt = `ข้อมูลเส้นทางทั้งหมดจาก Google Maps (ข้อมูลจริง):
- ต้นทาง: ${originLabel}
- ปลายทาง: ${destLabel}

ตัวเลือกเส้นทาง:
${routeSummaries}

โปรดแนะนำเส้นทางที่เหมาะสมที่สุดสำหรับขนส่งสาธารณะ โดยใช้ข้อมูลข้างต้นเท่านั้น อธิบายแบบกระชับ 1-2 ประโยค`;

  const recommendation = await callTyphoon([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return recommendation;
}
