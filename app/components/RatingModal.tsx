"use client";

import { useState } from "react";

interface RatingModalProps {
  onClose: () => void;
  onRate: (rating: number) => void;
}

export default function RatingModal({ onClose, onRate }: RatingModalProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRating = async (rating: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    await onRate(rating);
    setSubmitted(true);
    
    // Close modal after showing success message
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 animate-scaleIn">
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Thank you!
            </h3>
            <p className="text-gray-600">
              Your feedback helps us improve
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 animate-scaleIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-4xl mb-4">💭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            How easy was it to use?
          </h2>
          <p className="text-gray-600 mb-6">
            Rate your experience with one click
          </p>

          {/* Star rating - One click to rate */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(null)}
                disabled={isSubmitting}
                className="transition-all duration-200 hover:scale-125 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:scale-125"
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <svg
                  className="w-12 h-12 md:w-14 md:h-14"
                  fill={hoveredStar && star <= hoveredStar ? "#FBBF24" : "#E5E7EB"}
                  stroke="#FBBF24"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>

          {/* Labels */}
          <div className="flex justify-between text-xs text-gray-500 px-2">
            <span>😞 Hard</span>
            <span>😊 Easy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
