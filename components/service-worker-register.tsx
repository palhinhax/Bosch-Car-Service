"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegister
 * ---------------------
 * Client-only component that registers the PWA service worker (public/sw.js)
 * once the page has loaded. It renders nothing — it exists purely for the side
 * effect of registration.
 *
 * Why a component (and not inline in the layout)? The App Router root layout is
 * a Server Component, and `navigator.serviceWorker` is a browser-only API, so
 * registration must happen inside a Client Component effect.
 *
 * Registration only runs in production. In development the Next.js dev server
 * and a service worker can fight over caching, so we skip it locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => {
          // Registration failures should never break the app — just log them.
          console.error("Service worker registration failed:", error);
        });
    };

    // Register after `load` so the SW install doesn't compete with the initial
    // page render for bandwidth.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
