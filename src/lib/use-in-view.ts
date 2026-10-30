"use client";

import { useEffect, useRef, useState } from "react";

/** Detects whether an element is visible within its container using IntersectionObserver. */
export function useInView({
  threshold = 0.1,
  root = null,
  rootMargin = "0px 0px 0px 0px",
}: {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold, root, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, root, rootMargin]);

  return { ref, visible };
}