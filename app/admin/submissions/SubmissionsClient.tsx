"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Check, X, Maximize2, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    setSubmissions(initialSubmissions);
    setActiveTab(initialStatus);
    setCounts(statusCounts);
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

  const filtered =
    activeTab === "all" ? submissions : submissions.filter((s) => s.status === activeTab);

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-gray-100 rounded-xl p-1 h-auto gap-0.5">
          {STATUS_TABS.map((t) => {
            const count = counts[t.value] ?? 0;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t.label}
                <span className="ml-1.5 text-xs bg-gray-200 data-[state=active]:bg-green-100 data-[state=active]:text-[#2E9C63] rounded-full px-1.5 py-0.5 tabular-nums">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

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
        <div className="text-center py-24 text-gray-400 text-sm">No submissions found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100 group cursor-pointer" onClick={() => setZoomImg(s.imageUrl)}>
                <Image src={s.imageUrl} alt="Submission" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Content */}
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
