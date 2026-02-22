import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent, validateSignature, messagingApi } from "@line/bot-sdk";
import { lineClient } from "@/lib/line";
import { getPrisma } from "@/lib/prisma";
import { getSession, setSession, clearSession } from "@/lib/session";
import { getRoutes } from "@/lib/maps";
import { calcCo2Saved, calcPoints } from "@/lib/carbon";
import { buildRoutesFlexMessage } from "@/lib/flex";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    console.error("[webhook] LINE_CHANNEL_SECRET is missing");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const isValid = validateSignature(body, channelSecret, signature);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events: WebhookEvent[] = [];
  try {
    ({ events } = JSON.parse(body) as { events: WebhookEvent[] });
  } catch (error) {
    console.error("[webhook] Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results = await Promise.allSettled(events.map(handleEvent));
  const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failed.length > 0) {
    failed.forEach((result) => console.error("[webhook] handleEvent failed", result.reason));
  }

  return NextResponse.json({ ok: true, processed: events.length, failed: failed.length });
}

async function handleEvent(event: WebhookEvent) {
  if (event.type !== "message") return;
  if (!event.source.userId) return;

  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = (event as any).message as { type: string; latitude?: number; longitude?: number; address?: string; title?: string; text?: string };

  try {
    const prisma = await getPrisma();

    // ดึงหรือสร้าง user
    let user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
      let displayName = "ผู้ใช้";
      try {
        const profile = await lineClient.getProfile(lineUserId);
        displayName = profile.displayName;
      } catch {
        // ignore profile read error
      }
      user = await prisma.user.create({ data: { lineUserId, displayName } });
    }

    const session = await getSession(lineUserId);

    // --- รับ Location (origin) ---
    if (msg.type === "location") {
      await setSession(lineUserId, "WAITING_DESTINATION", msg.latitude!, msg.longitude!);
      await safeReply(replyToken, [
        {
          type: "text",
          text: "📍 รับตำแหน่งของคุณแล้ว!\n\nตอนนี้พิมพ์ชื่อปลายทาง หรือส่ง location ปลายทางเลยครับ",
        },
      ]);
      return;
    }

    // --- รอปลายทาง ---
    if (session?.step === "WAITING_DESTINATION") {
      const originLat = session.originLat!;
      const originLng = session.originLng!;
      let destLat: number | undefined;
      let destLng: number | undefined;
      let destLabel = "ปลายทาง";

      if (msg.type === "location") {
        destLat = msg.latitude!;
        destLng = msg.longitude!;
        destLabel = msg.address ?? msg.title ?? "ปลายทาง";
      } else if (msg.type === "text") {
        const text = (msg.text ?? "").trim();
        destLabel = text;
        const geocoded = await geocodePlace(text);
        if (!geocoded) {
          await safeReply(replyToken, [{ type: "text", text: `ไม่พบสถานที่ "${text}" ลองพิมพ์ใหม่หรือส่ง location ปลายทางแทนครับ` }]);
          return;
        }
        destLat = geocoded.lat;
        destLng = geocoded.lng;
      } else {
        return;
      }

      // หาเส้นทาง
      const routes = await getRoutes(originLat, originLng, destLat!, destLng!);
      if (routes.length === 0) {
        await clearSession(lineUserId);
        await safeReply(replyToken, [{ type: "text", text: "ขอโทษครับ ไม่พบเส้นทางขนส่งสาธารณะหรือทางเลือกสีเขียวในพื้นที่นี้" }]);
        return;
      }

      // บันทึก trip ของเส้นทางที่ดีที่สุด (CO2 ต่ำสุด)
      const bestRoute = [...routes].sort((a, b) => {
        const co2A = calcCo2Saved(a.distanceKm, a.mode);
        const co2B = calcCo2Saved(b.distanceKm, b.mode);
        return co2B - co2A; // เรียงจาก CO2 ประหยัดมากสุด
      })[0];

      const co2Saved = calcCo2Saved(bestRoute.distanceKm, bestRoute.mode);
      const points = calcPoints(co2Saved);

      await prisma.trip.create({
        data: {
          userId: user.id,
          originLat,
          originLng,
          destLat: destLat!,
          destLng: destLng!,
          destLabel,
          mode: bestRoute.mode,
          distanceKm: bestRoute.distanceKm,
          co2Saved,
          points,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: points },
          totalCo2Saved: { increment: co2Saved },
        },
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      await clearSession(lineUserId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flexMsg = buildRoutesFlexMessage(routes, updatedUser!.totalPoints - points, destLabel) as any;
      await safeReply(
        replyToken,
        [flexMsg],
        "ระบบส่งการ์ดเส้นทางไม่สำเร็จ ลองพิมพ์ปลายทางอีกครั้ง หรือส่ง location ปลายทางครับ"
      );
      return;
    }

    // --- IDLE: รอรับ location ต้นทาง ---
    if (msg.type === "text") {
      const text = (msg.text ?? "").trim().toLowerCase();
      if (text === "แต้ม" || text === "point" || text === "คะแนน") {
        const co2Kg = (user.totalCo2Saved / 1000).toFixed(2);
        await safeReply(replyToken, [{
          type: "text",
          text: `⭐ แต้มรักษ์โลกของคุณ\n\n${user.displayName}\nแต้มสะสม: ${user.totalPoints} แต้ม\nCO₂ ประหยัดรวม: ${co2Kg} kg\n\n🌍 ขอบคุณที่ช่วยรักษ์โลก!`,
        }]);
        return;
      }
    }

    // Default message
    await safeReply(replyToken, [{
      type: "text",
      text: "สวัสดีครับ! 🌿 Doodee Move\n\nส่งตำแหน่งปัจจุบันของคุณมาเพื่อเริ่มค้นหาเส้นทางสีเขียว\n\nพิมพ์ \"แต้ม\" เพื่อดูแต้มรักษ์โลกของคุณ",
    }]);
  } catch (error) {
    console.error("[webhook] Event processing failed", { lineUserId, error });
    await safeReply(replyToken, [{
      type: "text",
      text: "ขออภัย ระบบมีปัญหาชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่ครับ",
    }]);
  }
}

async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY!;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + " Bangkok Thailand")}&key=${key}&language=th`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.results?.[0]?.partial_match) {
    console.warn("[webhook] Geocode partial_match", { query, topResult: data.results[0].formatted_address });
  }
  if (data.status !== "OK" || !data.results[0]) return null;
  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

async function safeReply(
  replyToken: string,
  messages: messagingApi.Message[],
  fallbackText?: string
): Promise<void> {
  try {
    await lineClient.replyMessage({ replyToken, messages });
  } catch (error) {
    console.error("[webhook] LINE reply failed", error);
    if (!fallbackText) return;

    try {
      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: fallbackText }],
      });
    } catch (fallbackError) {
      console.error("[webhook] LINE fallback reply failed", fallbackError);
    }
  }
}
