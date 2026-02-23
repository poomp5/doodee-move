import { NextRequest, NextResponse } from "next/server";
import { validateSignature, messagingApi } from "@line/bot-sdk";
import { lineClient } from "@/lib/line";

const BOT_VERSION = "1.0.";

// The LINE SDK doesn't expose webhook event types through its public API,
// and deep imports aren't resolving correctly during the Next build. We
// can fall back to a loose `any` alias which keeps the rest of our code typed
// while avoiding compilation errors.
type WebhookEvent = any;
import { getPrisma } from "@/lib/prisma";
import { getSession, setSession, clearSession } from "@/lib/session";
import { getRoutes } from "@/lib/maps";
import { calcCo2Saved, calcPoints } from "@/lib/carbon";
import { buildRoutesFlexMessage, buildRouteDetailFlex } from "@/lib/flex";

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
  // postback events are used for the user choosing a route from the flex card
  if (event.type === "postback") {
    return handlePostback(event);
  }

  if (event.type !== "message") return;
  if (!event.source.userId) return;

  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = (event as any).message as { type: string; latitude?: number; longitude?: number; address?: string; title?: string; text?: string };

  try {
    const prisma = getPrisma();

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

    // --- Check for score command anytime ---
    // Removed: point system no longer supported

    const session = await getSession(lineUserId);

    // --- รับ Location (origin) ---
    if (msg.type === "location") {
      await setSession({
        lineUserId,
        step: "WAITING_DESTINATION",
        originLat: msg.latitude!,
        originLng: msg.longitude!,
      });
      await safeReply(replyToken, [
        {
          type: "text",
          text: `📍 รับตำแหน่งของคุณแล้ว!\n\nตอนนี้พิมพ์ชื่อปลายทาง หรือส่ง location ปลายทางเลยครับ (Bot v${BOT_VERSION})`,
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

      // store session state so we can record the trip when the user picks one
      await setSession({
        lineUserId,
        step: "AWAITING_ROUTE",
        originLat,
        originLng,
        destLat,
        destLng,
        destLabel,
        pendingRoutes: routes,
      });

      // send the flex carousel with actions; user will choose explicitly
      const flexMsg = buildRoutesFlexMessage(routes, destLabel) as any;
      await safeReply(
        replyToken,
        [flexMsg],
        "ระบบส่งการ์ดเส้นทางไม่สำเร็จ ลองพิมพ์ปลายทางอีกครั้ง หรือส่ง location ปลายทางครับ"
      );
      return;
    }

    // --- IDLE: รอรับ location ต้นทาง ---
    // Removed: point system commands no longer respond

    // Default message
    await safeReply(replyToken, [{
      type: "text",
      text: "สวัสดีครับ! 🌿 Doodee Move\n\nส่งตำแหน่งปัจจุบันของคุณมาเพื่อเริ่มค้นหาเส้นทางสีเขียว",
    }]);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[webhook] Event processing failed", { lineUserId, errMsg, errStack });
    await safeReply(replyToken, [{
      type: "text",
      text: "ขออภัย ระบบมีปัญหาชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่ครับ",
    }]);
  }
}

async function handlePostback(event: WebhookEvent) {
  if (!event.source.userId) return;
  const lineUserId = event.source.userId;
  const data = event.postback?.data ?? "";

  if (data.startsWith("route=")) {
    const idx = parseInt(data.slice("route=".length), 10);
    const session = await getSession(lineUserId);
    if (!session || !session.pendingRoutes) return;
    const routes: any[] = session.pendingRoutes as any[];
    const chosen = routes[idx];
    if (!chosen) return;

    const co2Saved = calcCo2Saved(chosen.distanceKm, chosen.mode);

    const prisma = getPrisma();
    // ensure user exists (should be, but just in case)
    let user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
      // create minimal user record
      user = await prisma.user.create({ data: { lineUserId, displayName: "ผู้ใช้" } });
    }

    await prisma.trip.create({
      data: {
        userId: user.id,
        originLat: session.originLat!,
        originLng: session.originLng!,
        destLat: session.destLat!,
        destLng: session.destLng!,
        destLabel: session.destLabel ?? "",
        mode: chosen.mode,
        distanceKm: chosen.distanceKm,
        co2Saved,
        points: 0,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalCo2Saved: { increment: co2Saved },
      },
    });

    await clearSession(lineUserId);

    // reply with the detailed flex card including full step-by-step
    // instructions (map image added if available).
    const detailFlex = buildRouteDetailFlex(chosen, session.destLabel ?? "");
    await safeReply(event.replyToken, [detailFlex]);
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
  messages: any[],
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
