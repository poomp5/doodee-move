import { getNearbyRestaurants } from "@/lib/maps";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const lat = 13.7563;
    const lng = 100.5018;
    console.log("Testing restaurant fetch for:", lat, lng);
    const restaurants = await getNearbyRestaurants(lat, lng);
    console.log("Restaurants found:", restaurants.length);
    return NextResponse.json({ restaurants, count: restaurants.length });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}