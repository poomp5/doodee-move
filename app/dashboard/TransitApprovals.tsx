"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MapPin, Clock, CheckCircle, XCircle, Maximize2 } from "lucide-react";

type TransitSubmission = {
  id: string;
  lineUserId: string;
  displayName: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  description: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export default function TransitApprovals() {
  const [submissions, setSubmissions] = useState<TransitSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  async function fetchSubmissions() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/submissions?status=${filter}`);
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(id);
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      if (response.ok) {
        await fetchSubmissions();
      } else {
        alert("Action failed");
      }
    } catch (error) {
      console.error("Action failed", error);
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🗺️</div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Transit Map Submissions</h2>
            <p className="text-sm text-slate-600">Review and approve community contributions</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? "bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg scale-105"
                  : "bg-white/50 text-slate-700 hover:bg-white hover:shadow-md"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-slate-600 mt-4">Loading submissions...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && submissions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-slate-600 text-lg">No {filter !== "all" ? filter : ""} submissions found</p>
        </div>
      )}

      {/* Submissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-2xl transition-all hover:scale-[1.02]"
          >
            {/* Image */}
            <div
              className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 cursor-pointer group"
              onClick={() => setZoomedImage(submission.imageUrl)}
            >
              <Image
                src={submission.imageUrl}
                alt="Transit vehicle"
                fill
                className="object-cover transition-transform group-hover:scale-110"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute top-2 right-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                    submission.status === "approved"
                      ? "bg-green-500 text-white"
                      : submission.status === "rejected"
                      ? "bg-red-500 text-white"
                      : "bg-yellow-500 text-white animate-pulse"
                  }`}
                >
                  {submission.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {submission.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {submission.displayName}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-700 mb-3 line-clamp-3 bg-slate-50 p-3 rounded-lg">
                {submission.description}
              </p>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="font-mono">{submission.latitude.toFixed(6)}, {submission.longitude.toFixed(6)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{new Date(submission.createdAt).toLocaleString("th-TH")}</span>
                </div>
              </div>

              {/* Map Link */}
              <a
                href={`https://www.google.com/maps?q=${submission.latitude},${submission.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
              >
                🗺️ View on Google Maps
              </a>

              {/* Action Buttons */}
              {submission.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(submission.id, "approve")}
                    disabled={actionLoading === submission.id}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading === submission.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleAction(submission.id, "reject")}
                    disabled={actionLoading === submission.id}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading === submission.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              )}

              {submission.status !== "pending" && submission.reviewedAt && (
                <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded-lg text-center">
                  Reviewed: {new Date(submission.reviewedAt).toLocaleString("th-TH")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full">
            <Image
              src={zoomedImage}
              alt="Zoomed transit vehicle"
              fill
              className="object-contain"
              unoptimized
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-black px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
