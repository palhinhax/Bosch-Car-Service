import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// Next.js routes HEAD requests through the GET handler, but @auth/core only
// accepts GET/POST and throws `UnknownAction` on HEAD (browser prefetch /
// uptime probes hit /api/auth/session with HEAD). Answer HEAD directly so it
// doesn't spam the logs with 400s.
export function HEAD() {
  return new Response(null, { status: 200 });
}
