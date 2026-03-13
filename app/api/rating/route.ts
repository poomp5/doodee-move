import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rating, lineUserId, displayName, category = "usability" } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const userAgent = req.headers.get("user-agent") || undefined;

    const userRating = await withRetry(() => prisma.userRating.create({
      data: {
        rating: parseInt(rating),
        lineUserId: lineUserId || null,
        displayName: displayName || null,
        category,
        userAgent,
      },
    }));

    return NextResponse.json({
      success: true,
      message: "Thank you for your feedback!",
      rating: userRating,
    });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();

    const [agg, groups] = await withRetry(() =>
      Promise.all([
        prisma.userRating.aggregate({
          where: { category: "usability" },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        prisma.userRating.groupBy({
          by: ["rating"],
          where: { category: "usability" },
          _count: { rating: true },
        }),
      ])
    );

    const totalRatings = agg._count.rating;
    const averageRating = Math.round((agg._avg.rating ?? 0) * 10) / 10;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const g of groups) {
      distribution[g.rating] = g._count.rating;
    }

    return NextResponse.json(
      { totalRatings, averageRating, distribution },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
