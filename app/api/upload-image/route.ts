import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, lineUserId, messageId } = await req.json();

    if (!imageBase64 || !lineUserId || !messageId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // R2 configuration from environment variables
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_ENDPOINT = process.env.R2_ENDPOINT;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://cdn.pranakorn.dev

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.error("[upload-image] R2 configuration missing");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `doodee/move/${lineUserId}/${timestamp}-${messageId}.jpg`;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Upload to R2 using S3-compatible API
    const AWS = require('@aws-sdk/client-s3');
    const s3Client = new AWS.S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const uploadCommand = new AWS.PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
    });

    await s3Client.send(uploadCommand);

    // Construct public URL
    const imageUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${filename}`
      : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${filename}`;

    console.log("[upload-image] Uploaded successfully", { filename, imageUrl });

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("[upload-image] Upload failed", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
