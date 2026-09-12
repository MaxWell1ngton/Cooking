import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export: this app is client-rendered and stores data in the
  // browser (see src/lib/repository), so it doesn't need a Node server to
  // run. That also makes offline caching by the service worker (public/sw.js)
  // reliable — every route is a known, finite static file.
  output: "export",
  trailingSlash: true,
  // Lets the dev server (HMR, RSC requests, etc.) accept requests from this
  // origin too, so the app can be opened from a phone on the same LAN during
  // development. Dev-only — has no effect on the static export.
  allowedDevOrigins: ["192.168.178.28"],
};

export default nextConfig;
