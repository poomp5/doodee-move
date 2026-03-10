"use client";

import { useEffect, useState } from "react";
import RatingModal from "./RatingModal";

const STORAGE_KEY = "doodee_rating_data";
const SHOW_AFTER_VISITS = 5; // Show after 5 page visits
const DAYS_BETWEEN_PROMPTS = 30; // Show again after 30 days if already rated

interface RatingData {
  hasRated: boolean;
  lastRatedDate: string | null;
  visitCount: number;
  dismissed: boolean;
  lastDismissedDate: string | null;
}

export default function RatingPrompt() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Don't show on first load immediately - wait a bit for better UX
    const timer = setTimeout(() => {
      checkAndShowRating();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkAndShowRating = () => {
    try {
      // Get stored data
      const storedData = localStorage.getItem(STORAGE_KEY);
      const data: RatingData = storedData
        ? JSON.parse(storedData)
        : {
            hasRated: false,
            lastRatedDate: null,
            visitCount: 0,
            dismissed: false,
            lastDismissedDate: null,
          };

      // Increment visit count
      data.visitCount += 1;

      // Check if enough time has passed since last rating or dismissal
      const now = new Date();
      const daysSinceRating = data.lastRatedDate
        ? (now.getTime() - new Date(data.lastRatedDate).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      
      const daysSinceDismissed = data.lastDismissedDate
        ? (now.getTime() - new Date(data.lastDismissedDate).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

      // Show modal if:
      // 1. User has visited enough times
      // 2. Either never rated, or enough time has passed since last rating
      // 3. Either never dismissed, or enough time has passed since last dismissal
      const shouldShow =
        data.visitCount >= SHOW_AFTER_VISITS &&
        (!data.hasRated || daysSinceRating >= DAYS_BETWEEN_PROMPTS) &&
        (!data.dismissed || daysSinceDismissed >= 7); // Show again after 7 days if dismissed

      if (shouldShow) {
        setShowModal(true);
        // Reset visit count
        data.visitCount = 0;
      }

      // Save updated data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error checking rating prompt:", error);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      // Get LINE user data if available (from your existing session)
      const lineUserId = localStorage.getItem("lineUserId") || undefined;
      const displayName = localStorage.getItem("displayName") || undefined;

      // Send rating to API
      const response = await fetch("/api/rating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          lineUserId,
          displayName,
          category: "usability",
        }),
      });

      if (response.ok) {
        // Update storage
        const storedData = localStorage.getItem(STORAGE_KEY);
        const data: RatingData = storedData
          ? JSON.parse(storedData)
          : {
              hasRated: false,
              lastRatedDate: null,
              visitCount: 0,
              dismissed: false,
              lastDismissedDate: null,
            };

        data.hasRated = true;
        data.lastRatedDate = new Date().toISOString();
        data.visitCount = 0;
        data.dismissed = false;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  const handleClose = () => {
    setShowModal(false);

    // Mark as dismissed
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      const data: RatingData = storedData
        ? JSON.parse(storedData)
        : {
            hasRated: false,
            lastRatedDate: null,
            visitCount: 0,
            dismissed: false,
            lastDismissedDate: null,
          };

      data.dismissed = true;
      data.lastDismissedDate = new Date().toISOString();
      data.visitCount = 0;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving dismissal:", error);
    }
  };

  if (!showModal) return null;

  return <RatingModal onClose={handleClose} onRate={handleRate} />;
}
