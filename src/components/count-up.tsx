"use client";

import { useEffect, useRef, useState } from "react";

type Kind = "number" | "currency" | "compact";

const formatters: Record<Kind, Intl.NumberFormat> = {
  number: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }),
  currency: new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }),
  compact: new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }),
};

/**
 * Counts a number up when it scrolls into view. Falls back to the final value
 * immediately when the visitor prefers reduced motion.
 */
export function CountUp({
  value,
  kind = "number",
  duration = 900,
  className,
}: {
  value: number;
  kind?: Kind;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    let frame = 0;
    let start = 0;

    const step = (now: number) => {
      if (start === 0) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setShown(0);
        frame = window.requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {formatters[kind].format(shown)}
    </span>
  );
}
