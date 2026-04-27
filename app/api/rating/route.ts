import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rating, lineUserId, displayName, category = "usability", feedbackText, routeMode, destLabel, source = "web" } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    // Get user agent if available
    const userAgent = req.headers.get("user-agent") || undefined;

    // Save rating to database
    const savedRating = await prisma.userRating.create({
      data: {
        rating,
        lineUserId: lineUserId || undefined,
        displayName: displayName || undefined,
        category,
        source,
        feedbackText: feedbackText || undefined,
        routeMode: routeMode || undefined,
        destLabel: destLabel || undefined,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      id: savedRating.id,
      message: "Rating saved successfully",
    });
  } catch (error) {
    console.error("[api/rating] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const source = searchParams.get("source");

    // Build where clause based on filters
    const where: any = {};
    if (category) where.category = category;
    if (source) where.source = source;

    // Fetch all ratings
    const ratings = await prisma.userRating.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Calculate statistics
    const stats = {
      total: ratings.length,
      average: ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2) : 0,
      distribution: {
        1: ratings.filter(r => r.rating === 1).length,
        2: ratings.filter(r => r.rating === 2).length,
        3: ratings.filter(r => r.rating === 3).length,
        4: ratings.filter(r => r.rating === 4).length,
        5: ratings.filter(r => r.rating === 5).length,
      },
      bySources: {} as Record<string, number>,
      byCategories: {} as Record<string, number>,
    };

    // Count by source
    ratings.forEach(r => {
      stats.bySources[r.source] = (stats.bySources[r.source] || 0) + 1;
      stats.byCategories[r.category] = (stats.byCategories[r.category] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats,
      ratings: ratings.slice(0, 50), // Return latest 50 ratings
    });
  } catch (error) {
    console.error("[api/rating] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
