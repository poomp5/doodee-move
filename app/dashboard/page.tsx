import { getPrisma } from "@/lib/prisma";
import { Users, Leaf, TrendingUp, Car, Calendar, Route, CheckCircle } from "lucide-react";
import TransitApprovals from "./TransitApprovals";
import DashboardSidebar from "./DashboardSidebar";

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar pendingSubmissions={pendingSubmissions} totalCo2Saved={totalCo2Saved} />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Scroll anchor for overview */}
          <div id="overview" className="h-0" />
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="text-sm text-gray-600 mt-1">Track eco-friendly commutes and manage transit data</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Users"
              value={totalUsers}
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              label="Total Trips"
              value={totalTrips}
              icon={<Route className="w-5 h-5" />}
            />
            <StatCard
              label="CO₂ Saved (kg)"
              value={(totalCo2Saved / 1000).toFixed(1)}
              icon={<Leaf className="w-5 h-5" />}
            />
            <StatCard
              label="Pending Approvals"
              value={pendingSubmissions}
              icon={<CheckCircle className="w-5 h-5" />}
              highlight={pendingSubmissions > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Users */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Top Contributors</h3>
              </div>
              <div className="space-y-3">
                {topUsers.map((user, idx) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {(user.totalCo2Saved / 1000).toFixed(2)} kg CO₂ saved
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <Leaf className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {(user.totalCo2Saved / 1000).toFixed(2)} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Statistics</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs text-gray-600 font-medium">Avg CO₂/User</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {totalUsers > 0 ? (totalCo2Saved / totalUsers / 1000).toFixed(2) : 0} kg
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-600 font-medium">Avg Trips/User</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {totalUsers > 0 ? (totalTrips / totalUsers).toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-600 font-medium">Total Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trips */}
          <div id="trips" className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Car className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Trips</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Mode</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Destination</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Distance</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">CO₂ Saved</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.map((trip) => (
                    <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{trip.user.displayName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          {trip.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-[160px] truncate">
                        {trip.destLabel || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{trip.distanceKm.toFixed(1)} km</td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          {(trip.co2Saved / 1000).toFixed(2)} kg
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(trip.createdAt).toLocaleDateString("th-TH")}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transit Approvals Section */}
          <div id="approvals" className="mt-8">
            <TransitApprovals />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition hover:shadow-md ${highlight ? 'ring-2 ring-green-500' : ''}`}>
      {highlight && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
            Action Required
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="text-green-600">{icon}</div>
      </div>
    </div>
  );
}
