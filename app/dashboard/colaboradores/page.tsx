import { PageHeader } from "@/components/page-header";
import { EmployeesManager } from "@/features/colaboradores/employees-manager";
import { getCurrentUser, roleCanApprove } from "@/lib/auth/session";
import { getSettings, listEmployees, listVacations } from "@/lib/data";
import { eachDayInclusive, isWeekend, utcDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ColaboradoresPage() {
  const settings = await getSettings();
  const [user, employees, vacations] = await Promise.all([
    getCurrentUser(),
    listEmployees(),
    listVacations(settings.year),
  ]);
  const canManage = roleCanApprove(user?.role);
  const isAdmin = user?.role === "ADMIN";

  // Approved FÉRIAS working days used this year, per employee.
  const yearStart = utcDate(settings.year, 0, 1);
  const yearEnd = utcDate(settings.year, 11, 31);
  const used: Record<string, number> = {};
  for (const v of vacations) {
    if (v.status !== "APPROVED" || v.category !== "FERIAS") continue;
    const start =
      new Date(v.startDate) < yearStart ? yearStart : new Date(v.startDate);
    const end = new Date(v.endDate) > yearEnd ? yearEnd : new Date(v.endDate);
    const workingDays = eachDayInclusive(start, end).filter(
      (d) => !isWeekend(d)
    ).length;
    used[v.employeeId] = (used[v.employeeId] ?? 0) + workingDays;
  }

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description="Gestão da equipa da oficina, cores e dias de férias."
      />
      <EmployeesManager
        canManage={canManage}
        isAdmin={isAdmin}
        currentUserId={user?.id ?? ""}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          jobRole: e.jobRole,
          department: e.department,
          color: e.color,
          email: e.email,
          phone: e.phone,
          active: e.active,
          annualVacationDays: e.annualVacationDays,
          role: e.role,
          hasPassword: !!e.passwordHash,
          vacationDaysUsed: used[e.id] ?? 0,
        }))}
      />
    </div>
  );
}
