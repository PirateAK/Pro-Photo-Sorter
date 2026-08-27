import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value === n ? 0 : n);
            }}
            className={`p-0.5 rounded hover:bg-surface-hover transition-colors ${
              filled ? "text-primary-earth" : "text-dim hover:text-app"
            }`}
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            data-testid={`star-${n}`}
            title={`${n} star${n > 1 ? "s" : ""}${value === n ? " (click to clear)" : ""}`}
          >
            <Star
              size={size}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={filled ? 1.6 : 1.8}
            />
          </button>
        );
      })}
    </div>
  );
}
