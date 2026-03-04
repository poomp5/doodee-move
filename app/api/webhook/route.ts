import { NextRequest, NextResponse } from "next/server";
import { validateSignature, messagingApi } from "@line/bot-sdk";
import { lineClient } from "@/lib/line";

const BOT_VERSION = "1.3.4";

// The LINE SDK doesn't expose webhook event types through its public API,
// and deep imports aren't resolving correctly during the Next build. We
// can fall back to a loose `any` alias which keeps the rest of our code typed
// while avoiding compilation errors.
type WebhookEvent = any;
import { getPrisma } from "@/lib/prisma";
import { getSession, setSession, clearSession } from "@/lib/session";
import { getRoutes, getNearestTrainStation, getNearestTrainStationFromPlace, parseThaiDirectionText, parseTrainStationQuery, geocodePlace } from "@/lib/maps";
import { calcCo2Saved, calcPoints } from "@/lib/carbon";
import { buildRoutesFlexMessage, buildRouteDetailFlex, buildTrainStationDetailFlex } from "@/lib/flex";

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

    // --- Check for train station command ---
    if (msg.type === "text") {
      const text = (msg.text ?? "").trim();
      
      // Check for map pin request FIRST (exact match)
      if (text === "สถานีรถไฟใกล้ฉัน") {
        await setSession({
          lineUserId,
          step: "FINDING_NEAREST_TRAIN_STATION",
        });
        await safeReply(
          replyToken,
          [
            {
              type: "text",
              text: "📍 ส่งตำแหน่งปัจจุบันของคุณมาเพื่อหาสถานีรถไฟใกล้ที่สุดครับ",
            },
          ],
          "ไม่สามารถส่งข้อความตอบกลับได้"
        );
        return;
      }

      // Check for text-based train station query like "สถานีรถไฟใกล้เดอะมอล"
      const trainStationQuery = parseTrainStationQuery(text);
      if (trainStationQuery) {
        try {
          const trainStation = await getNearestTrainStationFromPlace(trainStationQuery.location);
          if (!trainStation) {
            await safeReply(
              replyToken,
              [{ type: "text", text: `ขอโทษครับ ไม่พบสถานีรถไฟใกล้กับ "${trainStationQuery.location}"` }],
              "ไม่สามารถส่งข้อความตอบกลับได้"
            );
            return;
          }

          // Geocode station name to get precise coordinates for route finding
          const stationCoords = await geocodePlace(trainStation.name);
          const stationLat = stationCoords?.lat ?? undefined;
          const stationLng = stationCoords?.lng ?? undefined;

          if (stationLat && stationLng) {
            // Set session with train station as origin and ask for destination
            await setSession({
              lineUserId,
              step: "WAITING_DESTINATION_FROM_STATION",
              originLat: stationLat,
              originLng: stationLng,
              destLabel: "",
            });
          }

          // Show train station details in flex card
          const stationFlex = buildTrainStationDetailFlex(
            trainStation.name,
            trainStation.distanceKm,
            trainStation.walkingTimeMin
          ) as any;

          // Reply with station card and prompt for destination
          await safeReply(
            replyToken,
            [
              stationFlex,
              {
                type: "text",
                text: `✅ พบสถานี!\n\nตอนนี้พิมพ์ชื่อปลายทาง หรือส่ง location ปลายทางครับ`,
              },
            ],
            "ไม่สามารถส่งข้อความตอบกลับได้"
          );
          return;
        } catch (err) {
          console.error("[webhook] text-based train station query failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานี ลองใหม่อีกครั้ง" }]);
          return;
        }
      }
    }

    // --- Check for text-based direction (e.g., "ไปสยามจากเดอะมอล") ---
    if (msg.type === "text") {
      const text = (msg.text ?? "").trim();
      const parsed = parseThaiDirectionText(text);
      
      if (parsed) {
        // User wants to find a route using text-based input
        const originText = parsed.origin;
        const destText = parsed.destination;
        
        try {
          // Geocode both origin and destination
          const originGeocode = await geocodePlace(originText);
          if (!originGeocode) {
            await safeReply(
              replyToken,
              [{ type: "text", text: `ไม่พบสถานที่ต้นทาง "${originText}" ลองพิมพ์ใหม่หรือส่ง location ต้นทางแทนครับ` }],
              "ไม่สามารถส่งข้อความตอบกลับได้"
            );
            return;
          }

          const destGeocode = await geocodePlace(destText);
          if (!destGeocode) {
            await safeReply(
              replyToken,
              [{ type: "text", text: `ไม่พบสถานที่ปลายทาง "${destText}" ลองพิมพ์ใหม่หรือส่ง location ปลายทางแทนครับ` }],
              "ไม่สามารถส่งข้อความตอบกลับได้"
            );
            return;
          }

          // หาเส้นทาง
          const routes = await getRoutes(originGeocode.lat, originGeocode.lng, destGeocode.lat, destGeocode.lng);
          if (routes.length === 0) {
            await safeReply(replyToken, [{ type: "text", text: "ขอโทษครับ ไม่พบเส้นทางขนส่งสาธารณะหรือทางเลือกสีเขียวในพื้นที่นี้" }]);
            return;
          }

          // store session state
          await setSession({
            lineUserId,
            step: "AWAITING_ROUTE",
            originLat: originGeocode.lat,
            originLng: originGeocode.lng,
            destLat: destGeocode.lat,
            destLng: destGeocode.lng,
            destLabel: destText,
            pendingRoutes: routes,
          });

          // send the flex carousel
          const flexMsg = buildRoutesFlexMessage(routes, destText) as any;
          await safeReply(
            replyToken,
            [flexMsg],
            "ระบบส่งการ์ดเส้นทางไม่สำเร็จ ลองพิมพ์ปลายทางอีกครั้ง หรือส่ง location ปลายทางครับ"
          );
          return;
        } catch (err) {
          console.error("[webhook] text-based direction failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาเส้นทาง ลองใหม่อีกครั้ง" }]);
          return;
        }
      }
    }

    // --- รับ Location สำหรับการหาสถานีรถไฟที่ใกล้ที่สุด ---
    if (session?.step === "FINDING_NEAREST_TRAIN_STATION") {
      if (msg.type === "location") {
        const userLat = msg.latitude!;
        const userLng = msg.longitude!;

        const trainStation = await getNearestTrainStation(userLat, userLng);
        if (!trainStation) {
          await safeReply(
            replyToken,
            [{ type: "text", text: "ขอโทษครับ ไม่พบสถานีรถไฟใกล้กับตำแหน่งของคุณ" }],
            "ไม่สามารถส่งข้อความตอบกลับได้"
          );
          await clearSession(lineUserId);
          return;
        }

        // Geocode station name to get precise coordinates
        const stationCoords = await geocodePlace(trainStation.name);
        const stationLat = stationCoords?.lat ?? userLat;
        const stationLng = stationCoords?.lng ?? userLng;

        // Set session with train station as origin and ask for destination
        await setSession({
          lineUserId,
          step: "WAITING_DESTINATION_FROM_STATION",
          originLat: stationLat,
          originLng: stationLng,
          destLabel: "",
        });

        // Show train station details in flex card
        const stationFlex = buildTrainStationDetailFlex(
          trainStation.name,
          trainStation.distanceKm,
          trainStation.walkingTimeMin
        ) as any;

        // Reply with station card and prompt for destination
        await safeReply(
          replyToken,
          [
            stationFlex,
            {
              type: "text",
              text: `✅ พบสถานี!\n\nตอนนี้พิมพ์ชื่อปลายทาง หรือส่ง location ปลายทางครับ`,
            },
          ],
          "ไม่สามารถส่งข้อความตอบกลับได้"
        );
        return;
      } else {
        await safeReply(
          replyToken,
          [{ type: "text", text: "กรุณาส่งตำแหน่งของคุณแทนครับ" }],
          "ไม่สามารถส่งข้อความตอบกลับได้"
        );
        return;
      }
    }

    // --- รับ Location (origin) ---
    if (msg.type === "location") {
      await setSession({
        lineUserId,
        step: "WAITING_DESTINATION",
        originLat: msg.latitude!,
        originLng: msg.longitude!,
      });
      await safeReply(
        replyToken,
        [
          {
            type: "text",
            text: `📍 รับตำแหน่งของคุณแล้ว!\n\nตอนนี้พิมพ์ชื่อปลายทาง หรือส่ง location ปลายทางเลยครับ\n\n💡 เคล็ดลับ: คุณสามารถพิมพ์ "ต้นทางไปปลายทาง" เช่น "เดอะมอลไปสยาม" ได้เลยครับ\n\n(Bot v${BOT_VERSION})`,
          },
        ],
        "ไม่สามารถส่งข้อความตอบกลับได้ กรุณาลองส่งตำแหน่งอีกครั้ง"
      );
      return;
    }

    // --- รอปลายทาง (origin อาจเป็นสถานีรถไฟหรือตำแหน่งปกติ) ---
    if (session?.step === "WAITING_DESTINATION" || session?.step === "WAITING_DESTINATION_FROM_STATION") {
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
        let geocoded;
        try {
          geocoded = await geocodePlace(text);
        } catch (err) {
          console.error("[webhook] geocodePlace failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานที่ กรุณาลองใหม่อีกครั้ง" }]);
          return;
        }
        if (!geocoded) {
          await safeReply(
            replyToken,
            [{ type: "text", text: `ไม่พบสถานที่ "${text}" ลองพิมพ์ใหม่หรือส่ง location ปลายทางแทนครับ` }],
            "ไม่สามารถส่งข้อความตอบกลับได้ กรุณาลองพิมพ์ปลายทางใหม่"
          );
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
      text: `สวัสดีครับ! 🌿 Doodee Move\n\n📍 วิธีค้นหาเส้นทาง:\n\n1️⃣ ส่งตำแหน่งปัจจุบันของคุณแล้วพิมพ์/ส่งปลายทาง\n\n2️⃣ หรือพิมพ์โดยตรง เช่น "เดอะมอลไปสยาม" หรือ "ไปสยามจากเดอะมอล"\n\n🚆 สถานีรถไฟ:\n- "สถานีรถไฟใกล้เดอะมอล" (ค้นหาแบบ Text)\n- หรือส่งตำแหน่งและพิมพ์ "สถานีรถไฟใกล้ฉัน" (ตำแหน่งปัจจุบัน)\n\n(Bot v${BOT_VERSION})`,
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
    // reject postbacks unless we're actively awaiting a route; this also
    // guards against a stale carousel clicking after the session has been
    // cleared (old tokens/images) which was causing missing coordinates.
    if (!session || session.step !== "AWAITING_ROUTE" || !session.pendingRoutes) {
      return;
    }
    const routes: any[] = session.pendingRoutes as any[];
    const chosen = routes[idx];
    if (!chosen) return;

    const co2Saved = calcCo2Saved(chosen.distanceKm, chosen.mode);

    // respond first, before touching the database so we don’t run out of
    // time on the reply token. log, too, so we know the handler reached this
    // point during debugging.
    const detailFlex = buildRouteDetailFlex(chosen, session.destLabel ?? "");
    console.log("[webhook] sending detail flex", { user: lineUserId, route: chosen.mode });
    await safeReply(event.replyToken, [detailFlex]);

    // perform database work after reply; failure here is not fatal to the
    // user experience but should still be logged.
    (async () => {
      try {
        const prisma = getPrisma();
        // ensure user exists (should be, but just in case)
        let user = await prisma.user.findUnique({ where: { lineUserId } });
        if (!user) {
          user = await prisma.user.create({ data: { lineUserId, displayName: "ผู้ใช้" } });
        }

        if (
          session.originLat == null ||
          session.originLng == null ||
          session.destLat == null ||
          session.destLng == null
        ) {
          console.warn("[webhook] missing coordinates in session", session);
        } else {
          await prisma.trip.create({
            data: {
              user: { connect: { id: user.id } },
              originLat: session.originLat,
              originLng: session.originLng,
              destLat: session.destLat,
              destLng: session.destLng,
              destLabel: session.destLabel ?? "",
              mode: chosen.mode,
              distanceKm: chosen.distanceKm,
              co2Saved,
              points: 0,
            },
          });
        }

        await clearSession(lineUserId);
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { totalCo2Saved: { increment: co2Saved } },
          });
        }
      } catch (dbErr) {
        console.error("[webhook] postback DB error", dbErr);
      }
    })();
  }
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
