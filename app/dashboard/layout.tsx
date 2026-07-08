import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
