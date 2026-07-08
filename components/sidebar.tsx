"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Users,
  Wrench,
  Contact,
  Car,
  ListChecks,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Geral",
    items: [{ title: "Início", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Férias & Equipa",
    items: [
      {
        title: "Mapa de Férias",
        href: "/dashboard/ferias",
        icon: CalendarDays,
      },
      {
        title: "Pedidos de Férias",
        href: "/dashboard/pedidos",
        icon: CalendarClock,
      },
      { title: "Colaboradores", href: "/dashboard/colaboradores", icon: Users },
    ],
  },
  {
    label: "Oficina",
    items: [
      { title: "Oficina / Agenda", href: "/dashboard/oficina", icon: Wrench },
      { title: "Clientes", href: "/dashboard/clientes", icon: Contact },
      { title: "Veículos", href: "/dashboard/veiculos", icon: Car },
      { title: "Tarefas", href: "/dashboard/tarefas", icon: ListChecks },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
      { title: "Definições", href: "/dashboard/definicoes", icon: Settings },
    ],
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r bg-background transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <BrandMark subtitle={false} />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {navGroups.map((group) => {
            const items = group.items.filter(
              (item) => !item.adminOnly || isAdmin
            );
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground/80 hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
