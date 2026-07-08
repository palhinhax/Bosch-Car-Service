import { redirect } from "next/navigation";

// Internal tool — the marketing landing page is not needed. Send everyone to
// the dashboard; middleware bounces unauthenticated users to /auth/login.
export default function Home() {
  redirect("/dashboard");
}
