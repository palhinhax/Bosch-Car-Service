/** @type {import('next').NextConfig} */
const nextConfig = {
  // HTTP headers for the PWA files. These run on Vercel too, which serves the
  // app over HTTPS — a hard requirement for service workers and installability.
  async headers() {
    return [
      {
        // Never let a stale service worker get pinned in the HTTP cache, so new
        // deployments roll out immediately. `Service-Worker-Allowed: /` grants
        // the worker root scope regardless of where it is fetched from.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // The manifest can change between releases, so avoid long-term caching.
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
