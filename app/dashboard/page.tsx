import { getPrisma } from "@/lib/prisma";
import { Users, Leaf, TrendingUp, Car, Calendar, Route } from "lucide-react";

export default async function Dashboard() {
  const prisma = getPrisma();

  const [topUsers, totals, recentTrips, totalTrips] = await Promise.all([
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
  ]);

  const totalUsers = totals._count?.id ?? 0;
  const totalCo2Saved = totals._sum?.totalCo2Saved ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900">Doodee Analytics</h1>
        <p className="text-slate-600 mt-2">Track eco-friendly commutes & carbon savings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Users */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-slate-900" />
            <h2 className="text-2xl font-bold text-slate-900">Top Eco Warriors</h2>
          </div>
          <div className="space-y-4">
            {topUsers.map((user, idx) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
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
                  <p className="font-bold text-lg text-green-600">
                    {(user.totalCo2Saved / 1000).toFixed(2)} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
              <p className="text-sm text-slate-600">Avg CO₂/User (kg)</p>
              <p className="text-2xl font-bold text-green-600">
                {totalUsers > 0 ? (totalCo2Saved / totalUsers / 1000).toFixed(2) : 0}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <p className="text-sm text-slate-600">Avg Trips/User</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalUsers > 0 ? (totalTrips / totalUsers).toFixed(1) : 0}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border-l-4 border-purple-500">
              <p className="text-sm text-slate-600">Total Trips</p>
              <p className="text-2xl font-bold text-purple-600">{totalTrips}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Car className="w-6 h-6 text-slate-900" />
          <h2 className="text-2xl font-bold text-slate-900">Recent Trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">User</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Mode</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Destination</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Distance</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">CO₂ Saved</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.map((trip) => (
                <tr key={trip.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-medium text-slate-900">{trip.user.displayName}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {trip.mode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">
                    {trip.destLabel || "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{trip.distanceKm.toFixed(1)} km</td>
                  <td className="py-3 px-4 text-green-600 font-semibold">
                    {(trip.co2Saved / 1000).toFixed(2)} kg
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(trip.createdAt).toLocaleDateString("th-TH")}
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
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-6 text-white`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-white/80 text-sm font-medium">{label}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
        </div>
        {icon}
      </div>
      <div className="h-1 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full bg-white/60 w-3/4"></div>
      </div>
    </div>
  );
}
