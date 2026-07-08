import Link from "next/link";
import {
  Users,
  Plane,
  CalendarClock,
  Wrench,
  UserCheck,
  AlertTriangle,
  Plus,
  CalendarDays,
  Contact,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getSettings,
  listAppointments,
  listEmployees,
  listPendingVacations,
  listVacations,
} from "@/lib/data";
import {
  buildOccupancy,
  detectStaffConflicts,
  type VacationLike,
} from "@/lib/holidays";
import {
  addDays,
  dateKey,
  formatDatePT,
  formatLongPT,
  toUtcMidnight,
} from "@/lib/dates";
import {
  SERVICE_TYPE_LABELS,
  VACATION_CATEGORY_LABELS,
  type ServiceType,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const settings = await getSettings();
  const [user, employees, vacationsRaw, pending, appointments] =
    await Promise.all([
      getCurrentUser(),
      listEmployees({ onlyActive: true }),
      listVacations(settings.year),
      listPendingVacations(),
      listAppointments(),
    ]);

  const vacations = vacationsRaw as unknown as VacationLike[];
  const today = toUtcMidnight(new Date());
  const todayKey = dateKey(today);

  const occ = buildOccupancy(
    vacations.filter((v) => v.status === "APPROVED"),
    { includePending: false }
  );
  const offToday = occ.get(todayKey) ?? [];
  const offIds = new Set(offToday.map((s) => s.employeeId));
  const workingToday = employees.filter((e) => !offIds.has(e.id));

  const conflicts = detectStaffConflicts(
    vacations,
    employees.length,
    settings.minStaffPerDay
  );
  const conflictToday = conflicts.find((c) => c.dateKey === todayKey);

  // Upcoming approved vacations (start date within window)
  const in30 = addDays(today, 30);
  const upcoming = vacations
    .filter((v) => v.status === "APPROVED")
    .map((v) => ({ ...v, start: toUtcMidnight(new Date(v.startDate)) }))
    .filter((v) => v.start >= today && v.start <= in30)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 8);

  const appointmentsToday = appointments.filter(
    (a) => dateKey(toUtcMidnight(new Date(a.date))) === todayKey
  );

  const firstName = user?.name?.split(" ")[0] ?? "Bem-vindo";

  return (
    <div>
      <PageHeader
        title={`Olá, ${firstName}`}
        description={formatLongPT(today)}
        actions={
          <>
            <Link href="/dashboard/pedidos">
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Férias
              </Button>
            </Link>
            <Link href="/dashboard/oficina">
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Marcação
              </Button>
            </Link>
            <Link href="/dashboard/colaboradores">
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Colaborador
              </Button>
            </Link>
            <Link href="/dashboard/clientes">
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Cliente
              </Button>
            </Link>
          </>
        }
      />

      {/* Alert */}
      {conflictToday && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Equipa reduzida hoje</p>
            <p className="text-sm text-amber-800">
              Apenas {conflictToday.presentCount} colaborador(es) presente(s) —
              abaixo do mínimo de {settings.minStaffPerDay}.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="A trabalhar hoje"
          value={workingToday.length}
          hint={`de ${employees.length} ativos`}
          icon={<UserCheck className="h-5 w-5" />}
          tone={conflictToday ? "warning" : "success"}
        />
        <StatCard
          label="De férias hoje"
          value={offToday.length}
          icon={<Plane className="h-5 w-5" />}
          href="/dashboard/ferias"
        />
        <StatCard
          label="Pedidos pendentes"
          value={pending.length}
          icon={<CalendarClock className="h-5 w-5" />}
          href="/dashboard/pedidos"
          tone={pending.length > 0 ? "primary" : "default"}
        />
        <StatCard
          label="Marcações hoje"
          value={appointmentsToday.length}
          icon={<Wrench className="h-5 w-5" />}
          href="/dashboard/oficina"
        />
        <StatCard
          label="Colaboradores"
          value={employees.length}
          icon={<Users className="h-5 w-5" />}
          href="/dashboard/colaboradores"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Availability today */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Disponibilidade de hoje</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Presentes ({workingToday.length})
                </p>
                <div className="space-y-1.5">
                  {workingToday.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-sm border"
                        style={{ backgroundColor: e.color }}
                      />
                      {e.name}
                    </div>
                  ))}
                  {workingToday.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ninguém disponível.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  Ausentes ({offToday.length})
                </p>
                <div className="space-y-1.5">
                  {offToday.map((s) => (
                    <div
                      key={s.vacationId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="h-3 w-3 rounded-sm border"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{s.name}</span>
                      <Badge variant="neutral" className="ml-auto">
                        {VACATION_CATEGORY_LABELS[s.category]}
                      </Badge>
                    </div>
                  ))}
                  {offToday.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ninguém de férias.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming vacations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-base">
              Próximas férias (30 dias)
            </CardTitle>
            <Link
              href="/dashboard/ferias"
              className="text-xs text-primary hover:underline"
            >
              Ver mapa
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-2">
              {upcoming.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span
                    className="h-3 w-3 rounded-sm border"
                    style={{ backgroundColor: v.employee.color }}
                  />
                  <span className="font-medium">{v.employee.name}</span>
                  <span className="ml-auto text-muted-foreground">
                    {formatDatePT(new Date(v.startDate))} –{" "}
                    {formatDatePT(new Date(v.endDate))}
                  </span>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem férias marcadas nos próximos 30 dias.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-base">Marcações de hoje</CardTitle>
            <Link
              href="/dashboard/oficina"
              className="text-xs text-primary hover:underline"
            >
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {appointmentsToday.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Contact className="h-4 w-4" /> Sem marcações para hoje.
              </p>
            ) : (
              <div className="divide-y">
                {appointmentsToday.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                  >
                    <span className="font-mono text-muted-foreground">
                      {a.startTime}–{a.endTime}
                    </span>
                    <span className="font-medium">{a.customer.name}</span>
                    <span className="text-muted-foreground">
                      {a.vehicle.brand} {a.vehicle.model} ·{" "}
                      {a.vehicle.plateNumber}
                    </span>
                    <Badge variant="secondary">
                      {SERVICE_TYPE_LABELS[a.serviceType as ServiceType]}
                    </Badge>
                    {a.assignedEmployee && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-sm border"
                          style={{ backgroundColor: a.assignedEmployee.color }}
                        />
                        {a.assignedEmployee.name}
                      </span>
                    )}
                    <span className="ml-auto">
                      <AppointmentStatusBadge status={a.status} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
