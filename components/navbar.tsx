"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, LogOut, User } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/constants";

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  // Provided by the server (DashboardShell) so the header never depends on the
  // client session hydrating — it always shows the user + logout in production.
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export function Navbar({ onMenuClick, showMenuButton, user }: NavbarProps) {
  const role = (user?.role as Role) ?? "EMPLOYEE";

  // next-auth v5 beta's client signOut redirect can fail silently (if the
  // signout fetch/JSON parsing throws, the internal window.location redirect
  // never runs and nothing happens). Clear the session, then navigate
  // explicitly so logout always lands on the login page.
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.href = "/auth/login";
    }
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center px-4 md:px-6">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="hidden sm:block">
          <span className="bosch-brand text-sm">Bosch Car Service Lousa</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {user.name || user.email}
                </span>
                <Badge variant="neutral">{ROLE_LABELS[role] ?? role}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
