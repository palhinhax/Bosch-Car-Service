import { PageHeader } from "@/components/page-header";
import { ReportExport } from "@/features/relatorios/report-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSettings,
  listAppointments,
  listEmployees,
  listVacations,
} from "@/lib/data";
import { detectStaffConflicts, type VacationLike } from "@/lib/holidays";
import {
  eachDayInclusive,
  isWeekend,
  utcDate,
  formatDatePT,
} from "@/lib/dates";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  MONTHS_PT,
  type AppointmentStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const settings = await getSettings();
  const year = settings.year;
  const [employees, vacationsRaw, appointments] = await Promise.all([
    listEmployees(),
    listVacations(year),
    listAppointments(),
  ]);
  const vacations = vacationsRaw as unknown as VacationLike[];

  const yearStart = utcDate(year, 0, 1);
  const yearEnd = utcDate(year, 11, 31);

  // 1) Annual holiday report by employee
  const usedByEmp: Record<string, number> = {};
  const monthlyAbsence: number[] = Array(12).fill(0);
  for (const v of vacations) {
    if (v.status !== "APPROVED") continue;
    const start =
      new Date(v.startDate) < yearStart ? yearStart : new Date(v.startDate);
    const end = new Date(v.endDate) > yearEnd ? yearEnd : new Date(v.endDate);
    for (const day of eachDayInclusive(start, end)) {
      if (isWeekend(day)) continue;
      if (v.category === "FERIAS")
        usedByEmp[v.employeeId] = (usedByEmp[v.employeeId] ?? 0) + 1;
      monthlyAbsence[day.getUTCMonth()] += 1;
    }
  }

  const annualRows = employees.map((e) => {
    const used = usedByEmp[e.id] ?? 0;
    return {
      name: e.name,
      used,
      total: e.annualVacationDays,
      remaining: e.annualVacationDays - used,
      color: e.color,
    };
  });

  // 2) Conflicts (below minimum staff)
  const conflicts = detectStaffConflicts(
    vacations,
    employees.filter((e) => e.active).length,
    settings.minStaffPerDay
  );

  // 3) Workshop capacity — appointments by status
  const byStatus: Record<string, number> = {};
  for (const a of appointments)
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Resumo anual · ${year}`}
        actions={
          <ReportExport
            filename={`relatorio-ferias-${year}.csv`}
            header={[
              "Colaborador",
              "Dias usados",
              "Dias/ano",
              "Dias restantes",
            ]}
            rows={annualRows.map((r) => [r.name, r.used, r.total, r.remaining])}
          />
        }
      />

      {/* Annual holiday report */}
      <Card className="print-break-avoid">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
            Férias por colaborador — {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center">Dias usados</TableHead>
                <TableHead className="text-center">Dias / ano</TableHead>
                <TableHead className="text-center">Restantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annualRows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-sm border"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.used}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.total}
                  </TableCell>
                  <TableCell className="text-center font-medium tabular-nums">
                    {r.remaining}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly absence */}
        <Card className="print-break-avoid">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">
              Ausências por mês (dias úteis)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-1.5">
              {MONTHS_PT.map((m, i) => {
                const max = Math.max(1, ...monthlyAbsence);
                return (
                  <div key={m} className="flex items-center gap-2 text-sm">
                    <span className="w-20 shrink-0 text-muted-foreground">
                      {m}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${(monthlyAbsence[i] / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right tabular-nums">
                      {monthlyAbsence[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card className="print-break-avoid">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Marcações por estado</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <Table>
              <TableBody>
                {APPOINTMENT_STATUS.map((s) => (
                  <TableRow key={s}>
                    <TableCell>
                      {APPOINTMENT_STATUS_LABELS[s as AppointmentStatus]}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {byStatus[s] ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {appointments.length}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts */}
      <Card className="print-break-avoid">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
            Conflitos de equipa (abaixo de {settings.minStaffPerDay} presentes)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem conflitos — o mínimo de equipa é sempre cumprido.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {conflicts.map((c) => (
                <span
                  key={c.dateKey}
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900"
                  title={c.names.join(", ")}
                >
                  {formatDatePT(c.date)} · {c.presentCount} presente(s)
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
