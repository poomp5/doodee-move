import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

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
    
    // Get user agent for analytics
    const userAgent = req.headers.get("user-agent") || undefined;

    // Save rating to database
    const userRating = await prisma.userRating.create({
      data: {
        rating: parseInt(rating),
        lineUserId: lineUserId || null,
        displayName: displayName || null,
        category,
        userAgent,
      },
    });

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

// Optional: GET endpoint to retrieve rating statistics
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();
    
    // Get rating statistics
    const ratings = await prisma.userRating.findMany({
      where: { category: "usability" },
      select: { rating: true },
    });

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Count by star rating
    const distribution = {
      1: ratings.filter(r => r.rating === 1).length,
      2: ratings.filter(r => r.rating === 2).length,
      3: ratings.filter(r => r.rating === 3).length,
      4: ratings.filter(r => r.rating === 4).length,
      5: ratings.filter(r => r.rating === 5).length,
    };

    return NextResponse.json({
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
