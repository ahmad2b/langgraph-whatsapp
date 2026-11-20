"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Smooth, eased page scrolling for wheel and trackpad. In-page links (#how, #faq…) glide too,
 * stopping below the sticky header. Touch keeps native scrolling, and reduced-motion users get
 * plain 1:1 scrolling (Lenis honours prefers-reduced-motion by default).
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      anchors: true, // stops below the sticky header via scroll-padding-top in globals.css
      stopInertiaOnNavigate: true,
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
