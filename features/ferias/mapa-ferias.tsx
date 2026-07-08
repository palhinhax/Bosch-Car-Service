"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  Download,
  AlertTriangle,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { VacationStatusBadge } from "@/components/status-badge";
import { VacationFormDialog, type VacationFormValues } from "./vacation-form";
import {
  MONTHS_PT,
  VACATION_CATEGORY_LABELS,
  WEEKDAY_INITIALS_PT,
  type VacationCategory,
} from "@/lib/constants";
import {
  buildOccupancy,
  detectStaffConflicts,
  type VacationLike,
} from "@/lib/holidays";
import {
  daysInMonth,
  dateKey,
  utcDate,
  weekdayIndex,
  isWeekend,
  formatLongPT,
  formatDatePT,
} from "@/lib/dates";
import { setVacationStatus, deleteVacation } from "@/lib/actions";

interface EmployeeLite {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export function MapaFerias({
  year,
  employees,
  vacations,
  minStaffPerDay,
  canApprove,
  companyName,
}: {
  year: number;
  employees: EmployeeLite[];
  vacations: VacationLike[];
  minStaffPerDay: number;
  canApprove: boolean;
  companyName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>(""); // "" = all
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<
    VacationFormValues | undefined
  >();

  const activeEmployees = employees.filter((e) => e.active);

  // Apply the employee filter to the data feeding the grid.
  const filteredVacations = useMemo(
    () =>
      employeeFilter
        ? vacations.filter((v) => v.employeeId === employeeFilter)
        : vacations,
    [vacations, employeeFilter]
  );

  const occupancy = useMemo(
    () =>
      // Vacations are not shown on weekends — those cells stay "fim-de-semana".
      buildOccupancy(filteredVacations, {
        includePending: true,
        includeWeekends: false,
      }),
    [filteredVacations]
  );

  const conflicts = useMemo(
    () =>
      detectStaffConflicts(vacations, activeEmployees.length, minStaffPerDay),
    [vacations, activeEmployees.length, minStaffPerDay]
  );
  const conflictKeys = useMemo(
    () => new Set(conflicts.map((c) => c.dateKey)),
    [conflicts]
  );
  const todayKey = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const monthsToRender =
    monthFilter === "" ? MONTHS_PT.map((_, i) => i) : [Number(monthFilter)];

  const goYear = (delta: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("year", String(year + delta));
    router.push(`?${params.toString()}`);
  };

  const openAdd = (prefillDate?: string) => {
    setFormInitial(
      prefillDate ? { startDate: prefillDate, endDate: prefillDate } : undefined
    );
    setFormOpen(true);
  };

  const exportCsv = () => {
    const header = [
      "Colaborador",
      "Início",
      "Fim",
      "Tipo",
      "Estado",
      "Observações",
    ];
    const lines = [...vacations]
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
      .map((v) =>
        [
          v.employee.name,
          formatDatePT(new Date(v.startDate)),
          formatDatePT(new Date(v.endDate)),
          VACATION_CATEGORY_LABELS[v.category as VacationCategory] ??
            v.category,
          v.status,
          (v as { notes?: string }).notes ?? "",
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";")
      );
    const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapa-ferias-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // For the day dialog show ALL employees (ignore filter) so managers see the
  // full picture even while filtering the grid.
  const daySegmentsFull = selectedDay
    ? (buildOccupancy(vacations, {
        includePending: true,
        includeWeekends: false,
      }).get(selectedDay) ?? [])
    : [];

  const approve = (id: string, status: "APPROVED" | "REJECTED") =>
    startTransition(async () => {
      const res = await setVacationStatus(id, status);
      if (!res.ok)
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      else
        toast({
          title:
            status === "APPROVED" ? "Férias aprovadas" : "Pedido rejeitado",
        });
    });

  const removeVacation = (id: string) =>
    startTransition(async () => {
      const res = await deleteVacation(id);
      if (!res.ok)
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      else toast({ title: "Registo eliminado" });
    });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goYear(-1)}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-lg font-bold tabular-nums">
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goYear(1)}
            aria-label="Ano seguinte"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select
          className="w-auto min-w-[10rem]"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
        >
          <option value="">Todos os colaboradores</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>

        <Select
          className="w-auto min-w-[8rem]"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">Ano completo</option>
          {MONTHS_PT.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canApprove && (
            <Button onClick={() => openAdd()}>
              <Plus className="mr-1.5 h-4 w-4" /> Registar férias
            </Button>
          )}
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <div className="no-print flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">
              {conflicts.length} dia(s) abaixo do mínimo de {minStaffPerDay}{" "}
              colaborador(es) presente(s).
            </p>
            <p className="mt-0.5 text-amber-800">
              {conflicts
                .slice(0, 6)
                .map((c) => formatDatePT(c.date))
                .join(", ")}
              {conflicts.length > 6 && ` … (+${conflicts.length - 6})`}
            </p>
          </div>
        </div>
      )}

      {/* Print-only document header */}
      <div className="hidden print:mb-3 print:block">
        <div className="flex items-baseline justify-between border-b-2 border-black pb-1">
          <h2 className="text-lg font-bold">Mapa de Férias — {year}</h2>
          <span className="text-sm font-semibold">{companyName}</span>
        </div>
      </div>

      {/* The map */}
      <div className="print-full overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[820px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-24" />
            {Array.from({ length: 31 }, (_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="sticky left-0 z-10 border-b border-r bg-muted/60 px-2 py-2 text-left font-semibold">
                Mês
              </th>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <th
                  key={d}
                  className="border-b border-l px-0 py-1 text-center font-semibold tabular-nums text-muted-foreground"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthsToRender.map((m) => {
              const dim = daysInMonth(year, m);
              return (
                <tr key={m} className="print-break-avoid">
                  <th className="sticky left-0 z-10 whitespace-nowrap border-b border-r bg-card px-2 py-1.5 text-left font-semibold">
                    {MONTHS_PT[m]}
                  </th>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    if (d > dim) {
                      // This day does not exist in this month (e.g. 30 Fev).
                      return (
                        <td
                          key={d}
                          className="nonday-cell border-b border-l"
                          aria-hidden
                        />
                      );
                    }
                    const date = utcDate(year, m, d);
                    const key = dateKey(date);
                    const segs = occupancy.get(key) ?? [];
                    const weekend = isWeekend(date);
                    const conflict = conflictKeys.has(key);
                    const today = key === todayKey;
                    const names = segs
                      .map(
                        (s) =>
                          `${s.name}${s.status === "PENDING" ? " (pendente)" : ""}`
                      )
                      .join(", ");
                    const wd = WEEKDAY_INITIALS_PT[weekdayIndex(date)];
                    const weekendCellClass = weekend ? "weekend-map-cell" : "";
                    const weekendButtonClass = weekend
                      ? "weekend-map-button"
                      : "";
                    const todayCellClass = today ? "today-map-cell" : "";
                    const todayButtonClass = today ? "today-map-button" : "";
                    return (
                      <td
                        key={d}
                        className={`h-7 border-b border-l p-0 ${weekendCellClass} ${todayCellClass}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDay(key)}
                          title={
                            names
                              ? `${formatDatePT(date)} — ${names}`
                              : `${formatDatePT(date)} (${wd})`
                          }
                          className={`relative flex h-7 w-full flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring ${weekendButtonClass} ${todayButtonClass}`}
                        >
                          {segs.length === 0 ? (
                            <span className="sr-only">
                              {formatDatePT(date)}
                            </span>
                          ) : (
                            segs.map((s, idx) => (
                              <span
                                key={s.vacationId + idx}
                                className={`block w-full flex-1 ${
                                  s.status === "PENDING" ? "hatch-pending" : ""
                                }`}
                                style={{ backgroundColor: s.color }}
                              />
                            ))
                          )}
                          {conflict && (
                            <span className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[6px] border-t-[6px] border-l-transparent border-t-red-600" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-3 text-sm">
        <span className="font-semibold text-muted-foreground">Legenda:</span>
        {employees.map((e) => (
          <span key={e.id} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3.5 w-3.5 rounded-sm border"
              style={{ backgroundColor: e.color }}
            />
            {e.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="hatch-pending inline-block h-3.5 w-3.5 rounded-sm border bg-slate-300" />
          Pendente
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="weekend-map-cell weekend-map-button relative inline-block h-3.5 w-3.5 overflow-hidden rounded-sm border border-slate-500" />
          Fim-de-semana
        </span>
        <span className="no-print inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="today-map-button relative inline-block h-3.5 w-3.5 overflow-hidden rounded-sm border bg-background" />
          Hoje
        </span>
      </div>

      {/* Day details dialog */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(o) => !o && setSelectedDay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? formatLongPT(new Date(selectedDay)) : ""}
            </DialogTitle>
            <DialogDescription>
              {daySegmentsFull.length === 0
                ? "Ninguém de férias neste dia."
                : `${daySegmentsFull.length} colaborador(es) ausente(s).`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {daySegmentsFull.map((s) => (
              <div
                key={s.vacationId}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-sm border"
                  style={{ backgroundColor: s.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {VACATION_CATEGORY_LABELS[s.category]}
                  </p>
                </div>
                <VacationStatusBadge status={s.status} />
                {canApprove && (
                  <div className="flex items-center gap-1">
                    {s.status !== "APPROVED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-600"
                        disabled={pending}
                        onClick={() => approve(s.vacationId, "APPROVED")}
                        title="Aprovar"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {s.status !== "REJECTED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-amber-600"
                        disabled={pending}
                        onClick={() => approve(s.vacationId, "REJECTED")}
                        title="Rejeitar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={pending}
                      onClick={() => removeVacation(s.vacationId)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {canApprove && selectedDay && (
            <Button
              variant="outline"
              onClick={() => {
                const d = selectedDay;
                setSelectedDay(null);
                openAdd(d);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar férias neste dia
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / edit vacation dialog */}
      {formOpen && (
        <VacationFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          initial={formInitial}
          canApprove={canApprove}
        />
      )}
    </div>
  );
}
