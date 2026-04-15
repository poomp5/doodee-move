"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Check, X, Maximize2, ExternalLink, Search, Sparkles } from "lucide-react";
import type { TransitSubmission } from "@/app/generated/prisma/client";

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export function SubmissionsClient({
  initialSubmissions,
  initialStatus,
  statusCounts,
}: {
  initialSubmissions: TransitSubmission[];
  initialStatus: string;
  statusCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [counts, setCounts] = useState(statusCounts);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSubmissions(initialSubmissions);
    setActiveTab(initialStatus);
    setCounts(statusCounts);
    setSearch("");
  }, [initialSubmissions, initialStatus, statusCounts]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  function handleTabChange(val: string) {
    setActiveTab(val);
    startTransition(() => {
      router.push(`/admin/submissions?status=${val}`);
    });
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(id + action);
    const res = await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      const newStatus = action === "approve" ? "approved" : "rejected";
      setSubmissions((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: newStatus } : s)
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, (prev.pending ?? 0) - 1),
        [newStatus]: (prev[newStatus] ?? 0) + 1,
      }));
    }
    setActionLoading(null);
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((s) => {
      const matchStatus = activeTab === "all" || s.status === activeTab;
      const matchSearch =
        !query ||
        s.displayName.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });
  }, [activeTab, search, submissions]);

  const hasSearch = search.trim().length > 0;

  return (
    <>
      <Card className="overflow-visible border-[#d7eadf] bg-[linear-gradient(135deg,#ffffff_0%,#f2f8f4_100%)] shadow-[0_30px_80px_-60px_rgba(46,156,99,0.5)]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7eadf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2E9C63]">
                <Sparkles className="h-3.5 w-3.5" />
                Review queue
              </div>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">Search and review submissions clearly</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                ค้นหาจากชื่อสถานีหรือคำอธิบาย แล้วจัดการรายการตามสถานะได้ในหน้าเดียว
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dfe7df]">
                {counts.all ?? submissions.length} total submissions
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dfe7df]">
                {counts.pending ?? 0} pending now
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2E9C63]" />
              <Input
                placeholder="Search by display name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-2xl border-white bg-white pl-11 pr-11 text-sm shadow-sm ring-1 ring-[#dfe7df] placeholder:text-gray-400 focus-visible:ring-[#2E9C63]/30"
              />
              {hasSearch ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
                {counts.pending ?? 0} pending
              </Badge>
              <Badge className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700 hover:bg-green-50">
                {counts.approved ?? 0} approved
              </Badge>
              <Badge className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
                {counts.rejected ?? 0} rejected
              </Badge>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="h-auto flex-wrap gap-1 rounded-2xl bg-white/90 p-1.5 ring-1 ring-[#dfe7df]">
              {STATUS_TABS.map((t) => {
                const count = counts[t.value] ?? 0;
                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-[#2E9C63] data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    {t.label}
                    <span className="ml-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-xs tabular-nums data-[state=active]:bg-white/15">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span className="font-medium text-gray-700">Current view:</span>
        <Badge variant="outline" className="h-7 rounded-full border-[#d7dfd7] bg-white px-3 text-gray-600">
          Status: {STATUS_TABS.find((tab) => tab.value === activeTab)?.label ?? activeTab}
        </Badge>
        <Badge variant="outline" className="h-7 rounded-full border-[#d7dfd7] bg-white px-3 text-gray-600">
          Search: {hasSearch ? search : "none"}
        </Badge>
        <Badge variant="outline" className="h-7 rounded-full border-[#d7dfd7] bg-white px-3 text-gray-600">
          Results: {filtered.length}
        </Badge>
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <Skeleton className="w-full h-48" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f1f4ef] text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">No submissions found</p>
            <p className="mt-1 text-sm text-gray-400">ลองเปลี่ยนสถานะหรือคำค้นหาเพื่อดูรายการอื่น</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-48 bg-gray-100 group cursor-pointer" onClick={() => setZoomImg(s.imageUrl)}>
                <Image src={s.imageUrl} alt="Submission" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge[s.status] ?? ""}`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">{s.displayName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs text-[#2E9C63] hover:underline w-fit"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                  <ExternalLink className="w-3 h-3" />
                </a>

                {s.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#2E9C63] hover:bg-[#268a56] text-white h-9"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction(s.id, "approve")}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {actionLoading === s.id + "approve" ? "..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-500 border-red-200 hover:bg-red-50 h-9"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction(s.id, "reject")}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      {actionLoading === s.id + "reject" ? "..." : "Reject"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image zoom dialog */}
      <Dialog open={!!zoomImg} onOpenChange={() => setZoomImg(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black border-0">
          {zoomImg && (
            <div className="relative w-full h-[70vh]">
              <Image src={zoomImg} alt="Zoomed" fill className="object-contain" unoptimized />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
