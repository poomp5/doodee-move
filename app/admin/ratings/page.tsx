import { Suspense } from "react";
import { getPrisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

async function RatingsOverview() {
  const prisma = getPrisma();
  const [agg, groups, recent] = await Promise.all([
    prisma.userRating.aggregate({
      where: { category: "usability" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.userRating.groupBy({
      by: ["rating"],
      where: { category: "usability" },
      _count: { rating: true },
      orderBy: { rating: "desc" },
    }),
    prisma.userRating.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { rating: true, displayName: true, createdAt: true },
    }),
  ]);

  const total = agg._count.rating;
  const avg = agg._avg.rating ?? 0;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of groups) dist[g.rating] = g._count.rating;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-gray-900">{avg.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-0.5 mt-2">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Average Rating</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-gray-900">{total}</p>
            <p className="text-sm text-gray-500 mt-3">Total Ratings</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-[#2E9C63]">{dist[5] + dist[4]}</p>
            <p className="text-sm text-gray-500 mt-3">Positive (4-5 stars)</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      <Card className="border-gray-100 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[5,4,3,2,1].map((star) => {
            const count = dist[star] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 text-sm text-gray-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {star}
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent ratings */}
      <Card className="border-gray-100 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Recent Ratings</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-50">
          {recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{r.displayName ?? "Anonymous"}</p>
                <p className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("th-TH", {
                    day: "numeric", month: "short", year: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RatingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map((i) => (
          <Card key={i} className="border-gray-100 shadow-none">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-gray-100 shadow-none">
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          {[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RatingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ratings</h1>
        <p className="text-sm text-gray-500 mt-1">User satisfaction scores</p>
      </div>
      <Suspense fallback={<RatingsSkeleton />}>
        <RatingsOverview />
      </Suspense>
    </div>
  );
}
