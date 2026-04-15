import { Suspense } from "react";
import { getPrisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TripsClient } from "./TripsClient";

export const dynamic = "force-dynamic";

async function getTrips() {
  const prisma = getPrisma();
  return prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { displayName: true } } },
  });
}

function TripsSkeleton() {
  return (
    <Card className="border-gray-100 shadow-none">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function TripsPage() {
  const trips = await getTrips();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recent Trips</h1>
        <p className="text-sm text-gray-500 mt-1">All recorded transit journeys</p>
      </div>

      <Suspense fallback={<TripsSkeleton />}>
        <TripsClient trips={trips} />
      </Suspense>
    </div>
  );
}
