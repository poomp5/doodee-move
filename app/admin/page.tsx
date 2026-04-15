import { Suspense } from "react";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Route, Leaf, Clock, ArrowUpRight, MapPin, Star, TrendingUp, MessageSquareQuote } from "lucide-react";

export const dynamic = "force-dynamic";

const modeLabel: Record<string, string> = {
  BTS: "BTS", MRT: "MRT", BUS: "รถเมล์", WALK: "เดิน",
  BICYCLE: "จักรยาน", ESCOOTER: "E-Scooter", CAR: "รถยนต์",
};

const modeColor: Record<string, string> = {
  BTS: "bg-blue-100 text-blue-700",
  MRT: "bg-purple-100 text-purple-700",
  BUS: "bg-orange-100 text-orange-700",
  WALK: "bg-green-100 text-green-700",
  BICYCLE: "bg-emerald-100 text-emerald-700",
  ESCOOTER: "bg-cyan-100 text-cyan-700",
  CAR: "bg-gray-100 text-gray-600",
};

async function StatsSection() {
  const prisma = getPrisma();
  const [userCount, tripCount, co2Agg, pendingCount] = await Promise.all([
    prisma.user.count(),
    prisma.trip.count(),
    prisma.trip.aggregate({ _sum: { co2Saved: true } }),
    prisma.transitSubmission.count({ where: { status: "pending" } }),
  ]);
  const co2Kg = ((co2Agg._sum.co2Saved ?? 0) / 1000).toFixed(1);

  const stats = [
    {
      label: "ผู้ใช้งานทั้งหมด",
      value: userCount.toLocaleString(),
      icon: Users,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: "การเดินทางทั้งหมด",
      value: tripCount.toLocaleString(),
      icon: Route,
      accent: "bg-violet-50 text-violet-600",
    },
    {
      label: "CO₂ ที่ลดได้",
      value: `${co2Kg} kg`,
      icon: Leaf,
      accent: "bg-green-50 text-[#2E9C63]",
    },
    {
      label: "รอตรวจสอบ",
      value: pendingCount.toLocaleString(),
      icon: Clock,
      accent: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.accent} mb-4`}>
            <s.icon className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          <p className="text-sm text-gray-500 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5">
          <Skeleton className="h-9 w-9 rounded-xl mb-4" />
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

async function RecentTrips() {
  const prisma = getPrisma();
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { user: { select: { displayName: true } } },
  });

  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900">การเดินทางล่าสุด</p>
        <Link href="/admin/trips" className="flex items-center gap-1 text-xs font-medium text-[#2E9C63] hover:underline">
          ดูทั้งหมด <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {trips.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">ยังไม่มีข้อมูล</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {trips.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                  {t.user.displayName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.user.displayName}</p>
                  <p className="text-xs text-gray-400">{t.distanceKm.toFixed(1)} km</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeColor[t.mode] ?? "bg-gray-100 text-gray-600"}`}>
                  {modeLabel[t.mode] ?? t.mode}
                </span>
                <p className="text-xs text-gray-400 w-14 text-right">
                  {new Date(t.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function PendingSubmissions() {
  const prisma = getPrisma();
  const submissions = await prisma.transitSubmission.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900">รอตรวจสอบ</p>
        <Link href="/admin/submissions" className="flex items-center gap-1 text-xs font-medium text-[#2E9C63] hover:underline">
          จัดการ <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
            <Leaf className="h-5 w-5 text-[#2E9C63]" />
          </div>
          <p className="text-sm font-medium text-gray-700">ไม่มีรายการรอ</p>
          <p className="text-xs text-gray-400 mt-1">ทุกรายการได้รับการตรวจสอบแล้ว</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {submissions.map((s) => (
            <div key={s.id} className="flex items-start gap-3 px-6 py-3.5">
              <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{s.displayName}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>
              </div>
              <p className="text-xs text-gray-400 shrink-0 mt-0.5">
                {new Date(s.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function FeedbackSummary() {
  const prisma = getPrisma();
  const [total, avg, withText] = await Promise.all([
    prisma.userRating.count({ where: { source: "line_route_selection" } }),
    prisma.userRating.aggregate({
      where: { source: "line_route_selection" },
      _avg: { rating: true },
    }),
    prisma.userRating.count({
      where: {
        source: "line_route_selection",
        feedbackText: { not: null },
      },
    }),
  ]);
  const avgRating = avg._avg.rating ?? 0;
  const distribution = await prisma.userRating.groupBy({
    by: ["rating"],
    where: { source: "line_route_selection" },
    _count: { rating: true },
    orderBy: { rating: "desc" },
  });

  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900">LINE Feedback</p>
        <Link href="/admin/ratings" className="flex items-center gap-1 text-xs font-medium text-[#2E9C63] hover:underline">
          ดูทั้งหมด <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="px-6 py-5">
        {total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีคะแนน</p>
        ) : (
          <div className="flex items-end gap-6">
            <div>
              <p className="text-4xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{total.toLocaleString()} รีวิว</p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#edf7f0] px-2.5 py-1 text-[11px] font-medium text-[#2E9C63]">
                <MessageSquareQuote className="h-3 w-3" />
                {withText.toLocaleString()} ข้อความ
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution.find((d) => d.rating === star)?._count.rating ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <p className="text-xs text-gray-400 w-4 text-right">{star}</p>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-[#2E9C63] px-6 py-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 opacity-80" />
          <p className="text-sm font-medium opacity-80">ภาพรวม</p>
        </div>
        <h2 className="text-2xl font-bold">สวัสดี, Admin</h2>
        <p className="text-sm mt-1 opacity-75">ดูสถิติและจัดการข้อมูลระบบได้จากที่นี่</p>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<TableSkeleton />}>
          <RecentTrips />
        </Suspense>
        <div className="space-y-4">
          <Suspense fallback={<TableSkeleton />}>
            <PendingSubmissions />
          </Suspense>
          <Suspense fallback={<TableSkeleton />}>
            <FeedbackSummary />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
