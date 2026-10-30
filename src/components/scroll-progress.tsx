"use client";

import { useEffect, useState } from "react";

/**
 * Reading-progress bar pinned above the page. Driven by
 * requestAnimationFrame so it never blocks scrolling.
 */
export function ScrollProgress({
  className,
  height = 2,
}: {
  className?: string;
  height?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={className ?? "fixed inset-x-0 top-0 z-50"}
      style={{ height }}
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-primary via-chart-2 to-accent"
        style={{
          transform: `scaleX(${progress})`,
          transition: "transform 90ms linear",
        }}
      />
    </div>
  );
}
