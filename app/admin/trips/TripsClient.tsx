"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

type Trip = {
  id: string;
  mode: string;
  distanceKm: number;
  co2Saved: number;
  points: number;
  createdAt: Date;
  user: { displayName: string };
};

const modeLabel: Record<string, string> = {
  BTS: "BTS",
  MRT: "MRT",
  BUS: "Bus",
  WALK: "Walk",
  BICYCLE: "Bicycle",
  ESCOOTER: "E-Scooter",
  CAR: "Car",
};

const modeBadgeColor: Record<string, string> = {
  BTS: "bg-blue-100 text-blue-700",
  MRT: "bg-purple-100 text-purple-700",
  BUS: "bg-orange-100 text-orange-700",
  WALK: "bg-green-100 text-green-700",
  BICYCLE: "bg-teal-100 text-teal-700",
  ESCOOTER: "bg-sky-100 text-sky-700",
  CAR: "bg-gray-100 text-gray-600",
};

const MODES = ["all", "BTS", "MRT", "BUS", "WALK", "BICYCLE", "ESCOOTER", "CAR"];

export function TripsClient({ trips }: { trips: Trip[] }) {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        !search ||
        t.user.displayName.toLowerCase().includes(search.toLowerCase()) ||
        modeLabel[t.mode]?.toLowerCase().includes(search.toLowerCase());
      const matchMode = modeFilter === "all" || t.mode === modeFilter;
      return matchSearch && matchMode;
    });
  }, [trips, search, modeFilter]);

  const totalCo2 = filtered.reduce((s, t) => s + t.co2Saved, 0);
  const totalPts = filtered.reduce((s, t) => s + t.points, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by user or mode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-200"
          />
        </div>
        <Select value={modeFilter} onValueChange={(v) => setModeFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-white border-gray-200">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {m === "all" ? "All modes" : (modeLabel[m] ?? m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span><span className="font-semibold text-gray-900">{filtered.length}</span> trips</span>
        <span><span className="font-semibold text-[#2E9C63]">{(totalCo2 / 1000).toFixed(2)} kg</span> CO2 saved</span>
        <span><span className="font-semibold text-purple-600">{totalPts.toLocaleString()}</span> total pts</span>
      </div>

      {/* Table */}
      <Card className="border-gray-100 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>User</span>
            <span className="w-24 text-center">Mode</span>
            <span className="w-20 text-right">Distance</span>
            <span className="w-24 text-right">CO2 Saved</span>
            <span className="w-16 text-right">Points</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No trips found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3.5 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.user.displayName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="w-24 flex justify-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${modeBadgeColor[t.mode] ?? "bg-gray-100 text-gray-600"}`}>
                      {modeLabel[t.mode] ?? t.mode}
                    </span>
                  </div>
                  <p className="w-20 text-sm text-right text-gray-700">{t.distanceKm.toFixed(1)} km</p>
                  <p className="w-24 text-sm text-right font-medium text-[#2E9C63]">
                    {(t.co2Saved / 1000).toFixed(3)} kg
                  </p>
                  <p className="w-16 text-sm text-right font-semibold text-gray-900">{t.points}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
