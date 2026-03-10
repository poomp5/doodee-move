"use client";

import { useEffect, useState } from "react";

interface RatingStats {
  totalRatings: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default function RatingStats() {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/rating");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching rating stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No rating data available</p>
      </div>
    );
  }

  const getBarWidth = (count: number) => {
    if (stats.totalRatings === 0) return "0%";
    return `${(count / stats.totalRatings) * 100}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Usability Ratings
      </h3>

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-[#2E9C63]">
            {stats.averageRating.toFixed(1)}
          </span>
          <span className="text-gray-600">/ 5.0</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className="w-5 h-5"
              fill={star <= Math.round(stats.averageRating) ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          {stats.totalRatings} rating{stats.totalRatings !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-8">{rating} ⭐</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#2E9C63] h-full transition-all duration-500"
                style={{ width: getBarWidth(stats.distribution[rating as keyof typeof stats.distribution]) }}
              />
            </div>
            <span className="text-sm text-gray-600 w-8 text-right">
              {stats.distribution[rating as keyof typeof stats.distribution]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
