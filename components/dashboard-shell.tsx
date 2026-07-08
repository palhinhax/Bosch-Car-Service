"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export function DashboardShell({
  children,
  session,
  avatarKey,
}: {
  children: React.ReactNode;
  session: Session;
  avatarKey?: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            showMenuButton
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            user={session.user}
            avatarKey={avatarKey}
          />
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
