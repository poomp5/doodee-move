import { getPrisma } from "@/lib/prisma";
import { Users, Leaf, TrendingUp, Car, Calendar, Route } from "lucide-react";
import TransitApprovals from "./TransitApprovals";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const prisma = getPrisma();

  const [topUsers, totals, recentTrips, totalTrips, pendingSubmissions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { totalCo2Saved: "desc" },
      take: 5,
      select: {
        id: true,
        displayName: true,
        totalCo2Saved: true,
      },
    }),
    prisma.user.aggregate({
      _count: { id: true },
      _sum: { totalCo2Saved: true },
    }),
    prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { displayName: true } } },
    }),
    prisma.trip.count(),
    prisma.transitSubmission.count({ where: { status: "pending" } }).catch(() => 0),
  ]);

  const totalUsers = totals._count?.id ?? 0;
  const totalCo2Saved = totals._sum?.totalCo2Saved ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-8">
      {/* Header with Logo */}
      <div className="mb-8 flex items-center gap-4">
        <Image 
          src="/logo.png" 
          alt="Doodee Move Logo" 
          width={60} 
          height={60}
          className="rounded-xl shadow-lg"
        />
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Doodee Move Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Track eco-friendly commutes & manage transit data</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={<Users className="w-8 h-8" />}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          label="Total Trips"
          value={totalTrips}
          icon={<Route className="w-8 h-8" />}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          label="CO₂ Saved (kg)"
          value={(totalCo2Saved / 1000).toFixed(1)}
          icon={<Leaf className="w-8 h-8" />}
          color="from-green-500 to-green-600"
        />
        <StatCard
          label="Pending Approvals"
          value={pendingSubmissions}
          icon={<div className="text-2xl">🗺️</div>}
          color="from-orange-500 to-red-600"
          highlight={pendingSubmissions > 0}
        />
      </div>

      {/* Transit Approvals Section */}
      {pendingSubmissions > 0 && (
        <div className="mb-8">
          <TransitApprovals />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Top Users */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-slate-900">Top Eco Warriors</h2>
          </div>
          <div className="space-y-3">
            {topUsers.map((user, idx) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:shadow-md transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                    idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                    idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-gradient-to-br from-green-400 to-green-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{user.displayName}</p>
                    <p className="text-sm text-slate-500">
                      {(user.totalCo2Saved / 1000).toFixed(2)} kg CO₂ saved
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <p className="font-bold text-lg text-green-600">
                      {(user.totalCo2Saved / 1000).toFixed(2)} kg
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500 shadow-sm">
              <p className="text-sm text-slate-600 font-medium">Avg CO₂/User (kg)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {totalUsers > 0 ? (totalCo2Saved / totalUsers / 1000).toFixed(2) : 0}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500 shadow-sm">
              <p className="text-sm text-slate-600 font-medium">Avg Trips/User</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {totalUsers > 0 ? (totalTrips / totalUsers).toFixed(1) : 0}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500 shadow-sm">
              <p className="text-sm text-slate-600 font-medium">Total Trips</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totalTrips}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div className="flex items-center gap-2 mb-6">
          <Car className="w-6 h-6 text-slate-900" />
          <h2 className="text-2xl font-bold text-slate-900">Recent Trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">User</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Mode</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Destination</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Distance</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">CO₂ Saved</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.map((trip) => (
                <tr key={trip.id} className="border-b border-slate-100 hover:bg-green-50/50 transition">
                  <td className="py-3 px-4 font-medium text-slate-900">{trip.user.displayName}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-semibold shadow-sm">
                      {trip.mode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">
                    {trip.destLabel || "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{trip.distanceKm.toFixed(1)} km</td>
                  <td className="py-3 px-4">
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <Leaf className="w-4 h-4" />
                      {(trip.co2Saved / 1000).toFixed(2)} kg
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(trip.createdAt).toLocaleDateString("th-TH")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-xl p-6 text-white relative overflow-hidden transition-transform hover:scale-105 ${highlight ? 'animate-pulse' : ''}`}>
      {highlight && (
        <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
          Action Required
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-white/90 text-sm font-medium">{label}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white/60 w-3/4 rounded-full"></div>
      </div>
    </div>
  );
}
