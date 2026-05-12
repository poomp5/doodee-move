import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { lineUserId, displayName, imageBase64, latitude, longitude, description } =
      await req.json();

    if (!imageBase64 || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upload image to R2 via existing upload endpoint
    const uploadRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://dmove.site"}/api/upload-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          lineUserId: lineUserId ?? "liff-anonymous",
          messageId: `liff-${Date.now()}`,
        }),
      }
    );

    if (!uploadRes.ok) {
      throw new Error("Image upload failed");
    }

    const { imageUrl } = await uploadRes.json();

    const prisma = getPrisma();
    await prisma.transitSubmission.create({
      data: {
        lineUserId: lineUserId ?? "liff-anonymous",
        displayName: displayName ?? "ไม่ระบุชื่อ",
        imageUrl,
        latitude,
        longitude,
        description: description ?? "ส่งจาก LIFF",
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[liff/submit]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
