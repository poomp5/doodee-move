import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// GET: Fetch submissions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const prisma = getPrisma();

    const where = status && status !== "all" ? { status } : {};

    const submissions = await prisma.transitSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("[admin/submissions] GET failed", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a submission
export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json();

    if (!id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    const status = action === "approve" ? "approved" : "rejected";

    const submission = await prisma.transitSubmission.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: "admin", // You can enhance this with actual admin user tracking
      },
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("[admin/submissions] PATCH failed", error);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}
