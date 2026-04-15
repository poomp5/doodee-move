"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";

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
  const hasFilters = search.trim().length > 0 || modeFilter !== "all";

  return (
    <div className="space-y-5">
      <Card className="overflow-visible border-[#d7eadf] bg-[linear-gradient(135deg,#ffffff_0%,#f2f8f4_100%)] shadow-[0_30px_80px_-60px_rgba(46,156,99,0.5)]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7eadf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2E9C63]">
                <Sparkles className="h-3.5 w-3.5" />
                Smart search
              </div>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">Search and filter trips clearly</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                ค้นหาด้วยชื่อผู้ใช้หรือโหมดการเดินทาง แล้วค่อยกรองต่อเพื่อดูรายการที่ต้องการได้ทันที
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dfe7df]">
                {trips.length.toLocaleString()} total trips
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dfe7df]">
                {MODES.length - 1} transport modes
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2E9C63]" />
              <Input
                placeholder="Search by user name or travel mode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-2xl border-white bg-white pl-11 pr-4 text-sm shadow-sm ring-1 ring-[#dfe7df] placeholder:text-gray-400 focus-visible:ring-[#2E9C63]/30"
              />
            </div>

            <Select value={modeFilter} onValueChange={(v) => setModeFilter(v ?? "all")}>
              <SelectTrigger className="h-12 rounded-2xl border-white bg-white shadow-sm ring-1 ring-[#dfe7df]">
                <div className="flex items-center gap-2 text-gray-600">
                  <SlidersHorizontal className="h-4 w-4 text-[#2E9C63]" />
                  <SelectValue placeholder="All modes" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === "all" ? "All modes" : (modeLabel[m] ?? m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setSearch("");
                setModeFilter("all");
              }}
              disabled={!hasFilters}
              className="h-12 rounded-2xl border-[#d7dfd7] bg-white px-4 text-gray-700 hover:border-[#c9d9ce] hover:bg-white"
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => {
              const isActive = modeFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setModeFilter(mode)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-[#2E9C63] text-white"
                      : "bg-white text-gray-600 ring-1 ring-[#dfe7df] hover:text-gray-900"
                  )}
                >
                  {mode === "all" ? "All modes" : (modeLabel[mode] ?? mode)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Visible trips</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{filtered.length}</p>
          <p className="mt-1 text-sm text-gray-500">รายการที่ตรงกับการค้นหาและฟิลเตอร์ปัจจุบัน</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">CO2 saved</p>
          <p className="mt-2 text-3xl font-bold text-[#2E9C63]">{(totalCo2 / 1000).toFixed(2)} kg</p>
          <p className="mt-1 text-sm text-gray-500">ผลรวมเฉพาะข้อมูลที่กำลังแสดงอยู่</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reward points</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{totalPts.toLocaleString()}</p>
          <p className="mt-1 text-sm text-gray-500">คะแนนรวมจากผลลัพธ์ที่ค้นพบ</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span className="font-medium text-gray-700">Active filters:</span>
        <Badge variant="outline" className="h-7 rounded-full border-[#d7dfd7] bg-white px-3 text-gray-600">
          Query: {search.trim() ? search : "none"}
        </Badge>
        <Badge variant="outline" className="h-7 rounded-full border-[#d7dfd7] bg-white px-3 text-gray-600">
          Mode: {modeFilter === "all" ? "All modes" : (modeLabel[modeFilter] ?? modeFilter)}
        </Badge>
      </div>

      <Card className="overflow-hidden border-gray-200 bg-white shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-gray-100 bg-[#f7f8f5] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#fafbf8]"
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
                    <div className="flex w-24 justify-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${modeBadgeColor[t.mode] ?? "bg-gray-100 text-gray-600"}`}>
                        {modeLabel[t.mode] ?? t.mode}
                      </span>
                    </div>
                    <p className="w-20 text-right text-sm text-gray-700">{t.distanceKm.toFixed(1)} km</p>
                    <p className="w-24 text-right text-sm font-medium text-[#2E9C63]">
                      {(t.co2Saved / 1000).toFixed(3)} kg
                    </p>
                    <p className="w-16 text-right text-sm font-semibold text-gray-900">{t.points}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
