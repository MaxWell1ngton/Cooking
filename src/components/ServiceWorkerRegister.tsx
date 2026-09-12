"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // A service worker persists across reloads and serves whatever it
      // cached, so one registered here (e.g. from testing the production
      // build on localhost) can keep controlling the tab and silently serve
      // a stale bundle after code changes — the page looks "stuck" even
      // though the dev server is serving fresh code. Dev mode should never
      // run behind it, so proactively unregister and drop any old caches.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
