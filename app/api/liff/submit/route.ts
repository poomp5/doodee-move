import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const maxDuration = 30;

async function uploadToR2(imageBase64: string, lineUserId: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const filename = `doodee/move/${lineUserId}/liff-${Date.now()}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: Buffer.from(imageBase64, "base64"),
      ContentType: "image/jpeg",
    })
  );

  const base = process.env.R2_PUBLIC_URL ?? `https://pub-${accountId}.r2.dev`;
  return `${base}/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const { lineUserId, displayName, imageBase64, latitude, longitude, description } =
      await req.json();

    if (!imageBase64 || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const imageUrl = await uploadToR2(imageBase64, lineUserId ?? "liff-anonymous");

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
