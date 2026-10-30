"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Locomotive-style smooth scrolling for the marketing site.
 *
 * Lenis takes over the wheel and eases the page towards the target position,
 * which is what gives the scroll its weight. It is deliberately mounted only on
 * the marketing routes: inside the app, smooth scrolling fights with data
 * tables and the counter, where the user wants the page to follow the scrollbar
 * exactly.
 *
 * Every bit of this is skipped when the visitor has asked for reduced motion,
 * and anchor links are handed back to the browser so in-page navigation still
 * jumps to the right section.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      wheelMultiplier: 0.9,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };
    frame = window.requestAnimationFrame(raf);

    // Anchor links: let Lenis glide to the section instead of the browser's
    // instant jump, but keep the URL hash behaviour intact.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href*="#"]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== window.location.pathname || !url.hash) return;
      const target = document.querySelector(url.hash);
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
      window.history.replaceState(null, "", url.hash);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
