import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Fetch the photo key server-side (the session JWT doesn't carry it) so the
  // header avatar stays current after an upload.
  const me = session.user?.id
    ? await prisma.employee.findUnique({
        where: { id: session.user.id },
        select: { avatarKey: true },
      })
    : null;

  return (
    <DashboardShell session={session} avatarKey={me?.avatarKey ?? null}>
      {children}
    </DashboardShell>
  );
}
