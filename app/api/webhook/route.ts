import { NextRequest, NextResponse } from "next/server";
import { validateSignature, messagingApi } from "@line/bot-sdk";
import { lineClient, lineBlobClient } from "@/lib/line";

const BOT_VERSION = "1.4.3";
const SHOW_BOT_VERSION = false; // Toggle to show/hide bot version in messages

// The LINE SDK doesn't expose webhook event types through its public API,
// and deep imports aren't resolving correctly during the Next build. We
// can fall back to a loose `any` alias which keeps the rest of our code typed
// while avoiding compilation errors.
type WebhookEvent = any;
import { getPrisma } from "@/lib/prisma";
import { getSession, setSession, clearSession } from "@/lib/session";
import { getRoutes, parseThaiDirectionText, geocodePlace, getNearestTrainStationByKeyword } from "@/lib/maps";
import { calcCo2Saved, calcPoints } from "@/lib/carbon";
import { buildRoutesFlexMessage, buildRouteDetailFlex, buildTrainStationDetailFlex, buildPDPAConsentFlex, buildRatingFlex } from "@/lib/flex";

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
  // Handle follow event (when user adds bot)
  if (event.type === "follow") {
    const lineUserId = event.source.userId;
    if (!lineUserId) return;

    try {
      const prisma = getPrisma();
      
      // Get user profile
      let displayName = "ผู้ใช้";
      try {
        const profile = await lineClient.getProfile(lineUserId);
        displayName = profile.displayName;
      } catch {
        // ignore profile read error
      }

      // Create user with consent = false
      await prisma.user.upsert({
        where: { lineUserId },
        create: { lineUserId, displayName, pdpaConsent: false },
        update: { displayName }, // Don't reset consent if they re-add
      });

      // Send PDPA consent message
      const pdpaFlex = buildPDPAConsentFlex();
      await safeReply(event.replyToken, [pdpaFlex]);
    } catch (error) {
      console.error("[webhook] Follow event error", error);
    }
    return;
  }

  // postback events are used for the user choosing a route from the flex card
  if (event.type === "postback") {
    return handlePostback(event);
  }

  if (event.type !== "message") return;
  if (!event.source.userId) return;

  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = (event as any).message as { type: string; id?: string; latitude?: number; longitude?: number; address?: string; title?: string; text?: string };

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
      user = await prisma.user.create({ data: { lineUserId, displayName, pdpaConsent: false } });
    }

    // Check PDPA consent
    if (!user.pdpaConsent) {
      const pdpaFlex = buildPDPAConsentFlex();
      await safeReply(replyToken, [pdpaFlex]);
      return;
    }

    // --- Check for score command anytime ---
    // Removed: point system no longer supported

    const session = await getSession(lineUserId);

    // --- Handle image messages (for map building) ---
    if (msg.type === "image") {
      if (session?.step === "MAP_BUILDING_WAITING_IMAGE") {
        const messageId = msg.id;
        if (!messageId) {
          await safeReply(replyToken, [{
            type: "text",
            text: "ขออภัย ไม่สามารถรับรูปภาพได้ ลองใหม่อีกครั้งนะ",
          }]);
          return;
        }

        try {
          // Get image content from LINE
          const imageStream = await lineBlobClient.getMessageContent(messageId);
          const chunks: Buffer[] = [];
          
          for await (const chunk of imageStream) {
            chunks.push(Buffer.from(chunk));
          }
          
          const imageBuffer = Buffer.concat(chunks);
          
          // Upload to R2 via API endpoint
          const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: imageBuffer.toString('base64'),
              lineUserId,
              messageId,
            }),
          });

          if (!uploadResponse.ok) {
            throw new Error('Image upload failed');
          }

          const { imageUrl } = await uploadResponse.json();

          // Save image URL to session
          await setSession({
            lineUserId,
            step: "MAP_BUILDING_WAITING_LOCATION",
            transitImageUrl: imageUrl,
          });

          await safeReply(replyToken, [{
            type: "text",
            text: `✅ รับรูปภาพแล้ว\n\nขั้นตอนที่ 2/3: ส่งตำแหน่งยานพาหนะ\n\nส่งตำแหน่งของจุดที่ยานพาหนะจอดอยู่ หรือที่คุณถ่ายรูป\n\nเคล็ดลับ: กด + ในช่องพิมพ์ข้อความ → เลือก Location → ส่ง${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
          }]);
        } catch (err) {
          console.error("[webhook] Image handling failed", err);
          await safeReply(replyToken, [{
            type: "text",
            text: "ขออภัย เกิดข้อผิดพลาดในการรับรูปภาพ ลองใหม่อีกครั้งนะ",
          }]);
          await clearSession(lineUserId);
        }
        return;
      }
    }

    // --- Check for text-based direction (e.g., "ไปสยามจากเดอะมอล") ---
    if (msg.type === "text") {
      const text = (msg.text ?? "").trim();

      // --- Check for "ยกเลิก" (Cancel) to restart ---
      if (text === "ยกเลิก" || text === "cancel" || text === "เริ่มใหม่") {
        await clearSession(lineUserId);
        await safeReply(replyToken, [{
          type: "text",
          text: `✅ ยกเลิกและเริ่มใหม่แล้ว\n\nส่งตำแหน่งของคุณเพื่อเริ่มค้นหาเส้นทาง หรือกดเมนูด้านล่างเพื่อเลือกฟีเจอร์อื่นๆ${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
        }]);
        return;
      }

      // --- Check for "วิธีการเดินทาง" (How to Travel) request ---
      if (text === "วิธีการเดินทาง") {
        await safeReply(replyToken, [{
          type: "text",
          text: `📍 วิธีการเดินทางใน Doodee Move\n\nขั้นตอนง่ายๆ:\n\n1. ส่งตำแหน่งปัจจุบันของคุณ\n2. พิมพ์ชื่อปลายทาง หรือส่งตำแหน่งปลายทาง\n3. เลือกวิธีการเดินทาง (BTS, MRT, รถเมล์, เดิน, จักรยาน, E-Scooter, แท็กซี่)\n\nทางลัด: พิมพ์ "ต้นทางไปปลายทาง" เช่น "เดอะมอลไปสยาม" ได้เลย\n\nต้องการเริ่มใหม่? พิมพ์ "ยกเลิก" ได้ทุกเมื่อ\n\nทุกครั้งที่เดินทางด้วยขนส่งสาธารณะ ระบบจะบันทึก CO2 ที่ลดลงให้คุณ${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
        }]);
        return;
      }

      // --- Check for "ให้คะแนน" (Rate Us) request ---
      if (text === "ให้คะแนน" || text === "ให้คะแนนแอป" || text === "rate" || text === "rating") {
        const ratingFlex = buildRatingFlex();
        await safeReply(replyToken, [ratingFlex]);
        return;
      }

      // --- Check for "สถานีรถไฟใกล้ฉัน" (Nearest Train Station) request ---
      if (text === "สถานีรถไฟใกล้ฉัน") {
        await setSession({
          lineUserId,
          step: "WAITING_FOR_LOCATION_FOR_STATION",
        });
        await safeReply(replyToken, [{
          type: "text",
          text: `🚂 ค้นหาสถานีรถไฟที่ใกล้ที่สุด\n\nส่งตำแหน่งปัจจุบันของคุณมาได้เลย\n\nระบบจะหาสถานีรถไฟฟ้า (MRT, BTS) ที่ใกล้ที่สุด และแสดงวิธีเดินทางไปสถานีให้${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
        }]);
        return;
      }

      // --- Check for "สร้างแผนที่" (Build Map) request ---
      if (text === "สร้างแผนที่") {
        await setSession({
          lineUserId,
          step: "MAP_BUILDING_WAITING_IMAGE",
        });
        await safeReply(replyToken, [{
          type: "text",
          text: `🗺️ สร้างแผนที่ขนส่งสาธารณะ\n\nขั้นตอนที่ 1/3: ถ่ายรูปยานพาหนะ\n\nถ่ายรูปยานพาหนะขนส่งสาธารณะ (รถสองแถว, รถเมล์, รถตู้) แล้วส่งมาให้เรา\n\nเคล็ดลับ: ถ่ายให้เห็นเลขหมายรถหรือป้ายหน้ารถชัดเจนนะ${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
        }]);
        return;
      }

      // --- Handle map building data input (step 3) ---
      if (session?.step === "MAP_BUILDING_WAITING_DATA") {
        const description = text;
        const imageUrl = session.transitImageUrl;
        const latitude = session.originLat;
        const longitude = session.originLng;

        if (!imageUrl || !latitude || !longitude) {
          await safeReply(replyToken, [{
            type: "text",
            text: "ขออภัย เกิดข้อผิดพลาดในการบันทึกข้อมูล ลองเริ่มใหม่อีกครั้งนะ",
          }]);
          await clearSession(lineUserId);
          return;
        }

        try {
          // Save submission to database
          await prisma.transitSubmission.create({
            data: {
              lineUserId,
              displayName: user.displayName,
              imageUrl,
              latitude,
              longitude,
              description,
              status: "pending",
            },
          });

          await safeReply(replyToken, [{
            type: "text",
            text: `✅ บันทึกข้อมูลเรียบร้อยแล้ว\n\nข้อมูลของคุณ:\n${description}\n\nข้อมูลจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบและอนุมัติ\n\nขอบคุณที่ช่วยสร้างแผนที่ขนส่งสาธารณะให้สมบูรณ์ขึ้น${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
          }]);
          await clearSession(lineUserId);
        } catch (err) {
          console.error("[webhook] Transit submission failed", err);
          await safeReply(replyToken, [{
            type: "text",
            text: "ขออภัย เกิดข้อผิดพลาดในการบันทึกข้อมูล ลองใหม่อีกครั้งนะ",
          }]);
          await clearSession(lineUserId);
        }
        return;
      }

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
              [{ type: "text", text: `ไม่พบสถานที่ต้นทาง "${originText}" ลองพิมพ์ใหม่หรือส่งตำแหน่งต้นทางแทนนะ` }]
            );
            return;
          }

          const destGeocode = await geocodePlace(destText);
          if (!destGeocode) {
            await safeReply(
              replyToken,
              [{ type: "text", text: `ไม่พบสถานที่ปลายทาง "${destText}" ลองพิมพ์ใหม่หรือส่งตำแหน่งปลายทางแทนนะ` }]
            );
            return;
          }

          // หาเส้นทาง
          const routes = await getRoutes(originGeocode.lat, originGeocode.lng, destGeocode.lat, destGeocode.lng);
          if (routes.length === 0) {
            await safeReply(replyToken, [{ type: "text", text: "ขออภัย ไม่พบเส้นทางขนส่งสาธารณะหรือทางเลือกสีเขียวในพื้นที่นี้" }]);
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
            [flexMsg]
          );
          return;
        } catch (err) {
          console.error("[webhook] text-based direction failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาเส้นทาง ลองใหม่อีกครั้งนะ" }]);
          return;
        }
      }

      // --- Check for train station request with place name (e.g., "สถานีรถไฟใกล้เดอะมอลบางแค") ---
      if (text.includes("สถานีรถไฟใกล้")) {
        // Extract place name if provided, otherwise ask for location
        const placeMatch = text.match(/สถานีรถไฟใกล้(.+)/);
        let searchOriginLat = session?.originLat;
        let searchOriginLng = session?.originLng;

        if (placeMatch && placeMatch[1].trim() && placeMatch[1].trim() !== "ฉัน") {
          // Place name provided (e.g., "สถานีรถไฟใกล้เดอะมอล")
          const placeName = placeMatch[1].trim();
          try {
            const placeGeocode = await geocodePlace(placeName);
            if (!placeGeocode) {
              await safeReply(
                replyToken,
                [{ type: "text", text: `ไม่พบสถานที่ "${placeName}" ลองพิมพ์ใหม่หรือส่งตำแหน่งแทนนะ` }]
              );
              return;
            }
            searchOriginLat = placeGeocode.lat;
            searchOriginLng = placeGeocode.lng;
            console.log(`[webhook] Train station search for place "${placeName}" geocoded to (${searchOriginLat}, ${searchOriginLng})`);
          } catch (err) {
            console.error("[webhook] Train station place geocoding failed", err);
            await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานที่ ลองใหม่อีกครั้งนะ" }]);
            return;
          }
        } else if (!searchOriginLat || !searchOriginLng) {
          // No place name and no saved origin - ask for location
          await setSession({
            lineUserId,
            step: "WAITING_FOR_LOCATION_FOR_STATION",
          });
          await safeReply(
            replyToken,
            [{ type: "text", text: "📍 ส่งตำแหน่งปัจจุบันของคุณมา เพื่อหาสถานีรถไฟใกล้ที่สุด" }]
          );
          return;
        }

        // Find nearest train station
        try {
          const station = await getNearestTrainStationByKeyword(searchOriginLat!, searchOriginLng!);
          if (!station) {
            await safeReply(replyToken, [{ type: "text", text: "ขออภัย ไม่พบสถานีรถไฟใกล้เคียง" }]);
            return;
          }

          // Save session with station info and show confirmation card (NOT routes yet)
          await setSession({
            lineUserId,
            step: "FOUND_TRAIN_STATION",
            originLat: searchOriginLat,
            originLng: searchOriginLng,
            destLat: station.lat,
            destLng: station.lng,
            destLabel: station.name,
          });

          const flexMsg = buildTrainStationDetailFlex(station.name, station.distanceKm) as any;
          await safeReply(
            replyToken,
            [flexMsg]
          );
          return;
        } catch (err) {
          console.error("[webhook] Train station lookup failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานีรถไฟ ลองใหม่อีกครั้ง" }]);
          return;
        }
      }
    }

    // --- รับ Location (first check if waiting for station location) ---
    if (msg.type === "location") {
      // Handle WAITING_FOR_LOCATION_FOR_STATION
      if (session?.step === "WAITING_FOR_LOCATION_FOR_STATION") {
        const originLat = msg.latitude!;
        const originLng = msg.longitude!;

        try {
          const station = await getNearestTrainStationByKeyword(originLat, originLng);
          if (!station) {
            await safeReply(replyToken, [{ type: "text", text: "ขออภัย ไม่พบสถานีรถไฟใกล้เคียง" }]);
            await clearSession(lineUserId);
            return;
          }

          // Save session with station info and show confirmation card (NOT routes yet)
          await setSession({
            lineUserId,
            step: "FOUND_TRAIN_STATION",
            originLat,
            originLng,
            destLat: station.lat,
            destLng: station.lng,
            destLabel: station.name,
          });

          const flexMsg = buildTrainStationDetailFlex(station.name, station.distanceKm) as any;
          await safeReply(
            replyToken,
            [flexMsg]
          );
          return;
        } catch (err) {
          console.error("[webhook] Train station location lookup failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานีรถไฟ ลองใหม่อีกครั้ง" }]);
          await clearSession(lineUserId);
          return;
        }
      }

      // Handle MAP_BUILDING_WAITING_LOCATION
      if (session?.step === "MAP_BUILDING_WAITING_LOCATION") {
        const latitude = msg.latitude!;
        const longitude = msg.longitude!;

        await setSession({
          lineUserId,
          step: "MAP_BUILDING_WAITING_DATA",
          originLat: latitude,
          originLng: longitude,
          transitImageUrl: session.transitImageUrl || undefined,
        });

        await safeReply(replyToken, [{
          type: "text",
          text: `✅ รับตำแหน่งแล้ว\n\nขั้นตอนที่ 3/3: ระบุข้อมูลเส้นทาง\n\nพิมพ์ข้อมูลการเดินทาง เช่น:\n"หน้าโรงเรียนอัสสัมชัญธนบุรี มีรถสองแถวไปเดอะมอลบางแค ราคา 8 บาท"\n\nระบุให้ชัดเจน:\n- จุดต้นทาง\n- จุดปลายทาง\n- ราคา${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
        }]);
        return;
      }

      // Handle WAITING_DESTINATION - user is sending destination location
      if (session?.step === "WAITING_DESTINATION") {
        const originLat = session.originLat!;
        const originLng = session.originLng!;
        const destLat = msg.latitude!;
        const destLng = msg.longitude!;
        const destLabel = msg.address ?? msg.title ?? "ปลายทาง";

        // หาเส้นทาง
        const routes = await getRoutes(originLat, originLng, destLat, destLng);
        if (routes.length === 0) {
          await clearSession(lineUserId);
          await safeReply(replyToken, [{ type: "text", text: "ขออภัย ไม่พบเส้นทางขนส่งสาธารณะหรือทางเลือกสีเขียวในพื้นที่นี้" }]);
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
          [flexMsg]
        );
        return;
      }

      // Default location handling (setting origin)
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
            text: `📍 รับตำแหน่งของคุณแล้ว\n\nตอนนี้พิมพ์ชื่อปลายทาง หรือส่งตำแหน่งปลายทางได้เลย\n\nทางลัด: พิมพ์ "ต้นทางไปปลายทาง" เช่น "เดอะมอลไปสยาม" ได้เลย\n\nต้องการเริ่มใหม่? พิมพ์ "ยกเลิก"${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
          },
        ]
      );
      return;
    }

    // --- รอปลายทาง (text input only, location is handled above) ---
    if (session?.step === "WAITING_DESTINATION" && msg.type === "text") {
      const originLat = session.originLat!;
      const originLng = session.originLng!;
      const text = (msg.text ?? "").trim();

      // Check if user wants to find a train station from their origin
      if (text === "สถานีรถไฟใกล้ฉัน" || text.includes("สถานีรถไฟใกล้")) {
        try {
          const station = await getNearestTrainStationByKeyword(originLat, originLng);
          if (!station) {
            await safeReply(replyToken, [{ type: "text", text: "ขออภัย ไม่พบสถานีรถไฟใกล้เคียง" }]);
            return;
          }

          // Save session with station info and show confirmation card (NOT routes yet)
          await setSession({
            lineUserId,
            step: "FOUND_TRAIN_STATION",
            originLat,
            originLng,
            destLat: station.lat,
            destLng: station.lng,
            destLabel: station.name,
          });

          const flexMsg = buildTrainStationDetailFlex(station.name, station.distanceKm) as any;
          await safeReply(
            replyToken,
            [flexMsg]
          );
          return;
        } catch (err) {
          console.error("[webhook] Train station lookup from WAITING_DESTINATION failed", err);
          await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานีรถไฟ ลองใหม่อีกครั้ง" }]);
          return;
        }
      }

      // Normal text destination handling (geocode the place name)
      const destLabel = text;
      let geocoded;
      try {
        geocoded = await geocodePlace(text);
      } catch (err) {
        console.error("[webhook] geocodePlace failed", err);
        await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาสถานที่ ลองใหม่อีกครั้งนะ" }]);
        return;
      }
      if (!geocoded) {
        await safeReply(
          replyToken,
          [{ type: "text", text: `ไม่พบสถานที่ "${text}" ลองพิมพ์ใหม่หรือส่งตำแหน่งปลายทางแทนนะ` }]
        );
        return;
      }

      const destLat = geocoded.lat;
      const destLng = geocoded.lng;

      // หาเส้นทาง
      const routes = await getRoutes(originLat, originLng, destLat, destLng);
      if (routes.length === 0) {
        await clearSession(lineUserId);
        await safeReply(replyToken, [{ type: "text", text: "ขออภัย ไม่พบเส้นทางขนส่งสาธารณะหรือทางเลือกสีเขียวในพื้นที่นี้" }]);
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
        [flexMsg]
      );
      return;
    }

    // --- IDLE: รอรับ location ต้นทาง ---
    // Removed: point system commands no longer respond

    // Default message
    await safeReply(replyToken, [{
      type: "text",
      text: `สวัสดีครับ! 🌿 Doodee Move\n\nยินดีต้อนรับสู่แอปจัดการการเดินทาง\n\nกดเมนูด้านล่างเพื่อเลือกฟีเจอร์:\n\n🚌 วิธีการเดินทาง - คำแนะนำการใช้งาน\n🚇 สถานีรถไฟใกล้ฉัน - ค้นหาสถานีใกล้ๆ คุณ\n🗺️ สร้างแผนที่ - ช่วยเพิ่มข้อมูลขนส่งสาธารณะ\n\nต้องการเริ่มใหม่? พิมพ์ "ยกเลิก"\n\nทุกการเดินทางของคุณช่วยลด CO2 ให้โลก${SHOW_BOT_VERSION ? `\n\n(Bot v${BOT_VERSION})` : ''}`,
    }]);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[webhook] Event processing failed", { lineUserId, errMsg, errStack });
    await safeReply(replyToken, [{
      type: "text",
      text: "ขออภัย ระบบมีปัญหาชั่วคราว ลองใหม่อีกสักครู่นะ",
    }]);
  }
}

async function handlePostback(event: WebhookEvent) {
  if (!event.source.userId) return;
  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;
  const data = event.postback?.data ?? "";

  // Handle PDPA consent acceptance
  if (data === "action=accept_pdpa") {
    try {
      const prisma = getPrisma();
      await prisma.user.update({
        where: { lineUserId },
        data: { pdpaConsent: true },
      });

      await safeReply(replyToken, [
        {
          type: "text",
          text: "ขอบคุณที่ยอมรับนโยบายความเป็นส่วนตัว\n\nคุณสามารถใช้งาน Doodee Move ได้แล้ว\n\nส่งตำแหน่งปัจจุบันของคุณ หรือกดปุ่มเมนูด้านล่างเพื่อเริ่มใช้งาน",
        },
      ]);
    } catch (error) {
      console.error("[webhook] PDPA consent update error", error);
      await safeReply(replyToken, [
        {
          type: "text",
          text: "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ",
        },
      ]);
    }
    return;
  }

  // Handle rating submission
  if (data.startsWith("action=rate")) {
    try {
      // Parse rating from postback data: "action=rate&rating=5"
      const params = new URLSearchParams(data);
      const rating = parseInt(params.get("rating") || "0");

      if (rating < 1 || rating > 5) {
        return;
      }

      const prisma = getPrisma();
      
      // Check if user has already rated in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const recentRating = await prisma.userRating.findFirst({
        where: {
          lineUserId,
          createdAt: {
            gte: oneDayAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (recentRating) {
        // User has already rated recently
        await safeReply(replyToken, [
          {
            type: "text",
            text: `ขอบคุณที่ให้คะแนน! 🙏\n\nคุณได้ให้คะแนนไปแล้วเมื่อ ${recentRating.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\nสามารถให้คะแนนใหม่ได้อีกครั้งในอีก 24 ชั่วโมง`,
          },
        ]);
        return;
      }
      
      // Get user info
      let displayName = "ผู้ใช้";
      try {
        const profile = await lineClient.getProfile(lineUserId);
        displayName = profile.displayName;
      } catch {
        // ignore profile read error
      }

      // Save rating to database
      await prisma.userRating.create({
        data: {
          rating,
          lineUserId,
          displayName,
          category: "usability",
        },
      });

      // Thank you message with different responses based on rating
      let responseText = "";
      if (rating >= 4) {
        responseText = `🎉 ขอบคุณมากสำหรับคะแนน ${rating} ดาว!\n\nดีใจที่คุณชอบ Doodee Move เราจะพัฒนาให้ดียิ่งขึ้นไปเรื่อยๆ`;
      } else if (rating === 3) {
        responseText = `🙏 ขอบคุณสำหรับคะแนน ${rating} ดาว\n\nเราจะพัฒนาปรับปรุงให้ดีขึ้นต่อไป`;
      } else {
        responseText = `🙏 ขอบคุณสำหรับคะแนน ${rating} ดาว\n\nเราจะนำความคิดเห็นของคุณไปปรับปรุงให้ดีขึ้น หากมีข้อเสนอแนะเพิ่มเติม สามารถแจ้งทีมงานได้นะคะ`;
      }

      await safeReply(replyToken, [
        {
          type: "text",
          text: responseText,
        },
      ]);
    } catch (error) {
      console.error("[webhook] Rating submission error", error);
      await safeReply(replyToken, [
        {
          type: "text",
          text: "เกิดข้อผิดพลาดในการบันทึกคะแนน ลองใหม่อีกครั้งนะ",
        },
      ]);
    }
    return;
  }

  // Handle train station confirmation
  if (data === "action=confirm_station") {
    const session = await getSession(lineUserId);
    if (!session || session.step !== "FOUND_TRAIN_STATION" || !session.destLat || !session.destLng) {
      return;
    }

    try {
      // Now fetch the routes from origin to the confirmed station
      const routes = await getRoutes(
        session.originLat!,
        session.originLng!,
        session.destLat,
        session.destLng
      );

      if (routes.length === 0) {
        await safeReply(replyToken, [
          { type: "text", text: `ไม่พบเส้นทางขนส่งสาธารณะจากตำแหน่งปัจจุบันไปยัง ${session.destLabel}` }
        ]);
        await clearSession(lineUserId);
        return;
      }

      // Update session to AWAITING_ROUTE with the routes
      await setSession({
        lineUserId,
        step: "AWAITING_ROUTE",
        originLat: session.originLat!,
        originLng: session.originLng!,
        destLat: session.destLat!,
        destLng: session.destLng!,
        destLabel: session.destLabel!,
        pendingRoutes: routes,
      });

      // Show the routes carousel
      const flexMsg = buildRoutesFlexMessage(routes, session.destLabel!) as any;
      await safeReply(
        replyToken,
        [flexMsg]
      );
      return;
    } catch (err) {
      console.error("[webhook] Train station confirmation route lookup failed", err);
      await safeReply(replyToken, [{ type: "text", text: "เกิดข้อผิดพลาดในการค้นหาเส้นทาง ลองใหม่อีกครั้ง" }]);
      await clearSession(lineUserId);
      return;
    }
  }

  if (data.startsWith("route=")) {
    const mode = data.slice("route=".length);
    const session = await getSession(lineUserId);
    // reject postbacks unless we're actively awaiting a route; this also
    // guards against a stale carousel clicking after the session has been
    // cleared (old tokens/images) which was causing missing coordinates.
    if (!session || session.step !== "AWAITING_ROUTE" || !session.pendingRoutes) {
      return;
    }
    const routes: any[] = session.pendingRoutes as any[];
    const chosen = routes.find((r: any) => r.mode === mode);
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
  messages: any[]
): Promise<void> {
  try {
    await lineClient.replyMessage({ replyToken, messages });
  } catch (error) {
    console.error("[webhook] LINE reply failed", error);
    // Don't attempt fallback - reply token expires quickly and can't be reused
  }
}
