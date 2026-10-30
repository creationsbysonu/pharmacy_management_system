"use client";

import { useEffect, useRef, useState } from "react";
import { Lottie } from "lottie-react";
import { useInView } from "@/lib/use-in-view";

/** Enhanced pharmacy animation with improved Lottie configuration and view tracking. */
export function PharmacyLottie({ className }: { className?: string }) {
  const { ref, visible } = useInView({ threshold: 0.15 });
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setReduceMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      role="img"
      aria-label="Pharmacy animation"
    >
      {visible && !reduceMotion ? (
        <Lottie
          loop
          autoplay
          speed={1}
          src="/pharmacy-animation.json"
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
        />
      ) : null}
    </div>
  );
}

/** CSS-based marquee for hero sections - only renders when element is in view */
export function Marquee({ children }: { children: React.ReactNode }) {
  const { ref, visible } = useInView({ threshold: 0.5 });

  return (
    <div ref={ref} className="relative overflow-hidden">
      {visible ? (
        <div
          className="marquee flex w-max items-center gap-10 whitespace-nowrap"
          style={{ animation: "marquee 38s linear infinite" }}
        >
          <div className="flex items-center gap-10">{children}</div>
          <div className="flex items-center gap-10" aria-hidden>
            {children}
          </div>
        </div>
      ) : (
        <span className="sr-only">Pharmacy management system</span>
      )}
    </div>
  );
}

/** Pulse badge for call-to-action */
export function PulseBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-primary">
      <span className="size-3 animate-pulse rounded-full bg-primary/20" />
      {children}
    </span>
  );
}

/** Reveal with IntersectionObserver */
export function Reveal({
  children,
  className,
  delay = 0,
  motion = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  motion?: "up" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setShown(true);
      return;
    }

    // Hide only after the observer is in place: no-JS visitors keep the content.
    setArmed(true);
    document.documentElement.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-motion={motion}
      data-armed={armed ? "true" : "false"}
      data-visible={shown ? "true" : "false"}
      className={`reveal ${className ?? ""}`}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-ready": shown ? 1 : 0,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

const PARTICLE_POSITIONS = [
  { x: 12, y: 18, size: 4 },
  { x: 28, y: 72, size: 3 },
  { x: 44, y: 34, size: 5 },
  { x: 58, y: 84, size: 3 },
  { x: 71, y: 24, size: 4 },
  { x: 83, y: 62, size: 6 },
  { x: 92, y: 12, size: 3 },
  { x: 6, y: 54, size: 5 },
];

/** Floating particles background */
export function FloatingParticles({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden opacity-20"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, var(--primary) 0%, transparent 50%), " +
          "radial-gradient(circle at 80% 80%, var(--secondary) 0%, transparent 50%)",
      }}
    >
      {PARTICLE_POSITIONS.slice(0, count).map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `float ${2 + (i % 4)}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
