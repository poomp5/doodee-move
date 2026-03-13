import { Suspense } from "react";
import { getPrisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Route, Leaf, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

async function StatsCards() {
  const prisma = getPrisma();

  const [userCount, tripCount, co2Agg, pendingCount] = await Promise.all([
    prisma.user.count(),
    prisma.trip.count(),
    prisma.trip.aggregate({ _sum: { co2Saved: true } }),
    prisma.transitSubmission.count({ where: { status: "pending" } }),
  ]);

  const co2Kg = ((co2Agg._sum.co2Saved ?? 0) / 1000).toFixed(1);

  const cards = [
    { title: "Total Users", value: userCount.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Total Trips", value: tripCount.toLocaleString(), icon: Route, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "CO2 Saved", value: `${co2Kg} kg`, icon: Leaf, color: "text-[#2E9C63]", bg: "bg-green-50" },
    { title: "Pending Reviews", value: pendingCount.toLocaleString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.title} className="border-gray-100 shadow-none">
          <CardContent className="p-6 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{c.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-gray-100 shadow-none">
          <CardContent className="p-6 flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function TopContributors() {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    orderBy: { totalPoints: "desc" },
    take: 5,
    select: { displayName: true, totalPoints: true, totalCo2Saved: true },
  });

  return (
    <Card className="border-gray-100 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">Top Contributors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>}
        {users.map((u, i) => (
          <div key={u.displayName} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-[#2E9C63]">
                {u.displayName[0]?.toUpperCase()}
              </div>
              <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{u.displayName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{u.totalPoints.toLocaleString()} pts</p>
              <p className="text-xs text-gray-400">{(u.totalCo2Saved / 1000).toFixed(2)} kg CO2</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function RecentActivity() {
  const prisma = getPrisma();
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { displayName: true } } },
  });

  const modeLabel: Record<string, string> = {
    BTS: "BTS", MRT: "MRT", BUS: "Bus", WALK: "Walk",
    BICYCLE: "Bicycle", ESCOOTER: "E-Scooter", CAR: "Car",
  };

  return (
    <Card className="border-gray-100 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trips.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No trips yet</p>}
        {trips.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-900">{t.user.displayName}</p>
              <p className="text-xs text-gray-400">
                {modeLabel[t.mode] ?? t.mode} - {t.distanceKm.toFixed(1)} km
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#2E9C63]">{t.points} pts</p>
              <p className="text-xs text-gray-400">
                {new Date(t.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TwoColSkeleton() {
  return (
    <Card className="border-gray-100 shadow-none">
      <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide statistics and recent activity</p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<TwoColSkeleton />}>
          <TopContributors />
        </Suspense>
        <Suspense fallback={<TwoColSkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}
