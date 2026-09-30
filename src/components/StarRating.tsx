"use client";

import { Star } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export function StarRating({
  value,
  onChange,
  size = 22,
  readOnly = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="star-row" role={readOnly ? "img" : "radiogroup"} aria-label={t("star")}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const half = !on && n - 0.5 <= value;
        return (
          <button
            key={n}
            type="button"
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : n === Math.round(value)}
            disabled={readOnly}
            className={`star-btn ${on || half ? "star-on" : ""} ${readOnly ? "star-static" : ""}`}
            onClick={() => onChange?.(n)}
            aria-label={t("star.n", { n })}
          >
            <Star
              style={{ width: size, height: size }}
              className={on ? "fill-current" : half ? "fill-current opacity-50" : ""}
            />
          </button>
        );
      })}
    </div>
  );
}
