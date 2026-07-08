import { PageHeader } from "@/components/page-header";
import { OficinaAgenda } from "@/features/oficina/oficina-agenda";
import { getCurrentUser, roleCanManageFrontDesk } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listAppointments, listCustomers, listEmployees } from "@/lib/data";
import { dateKey, toUtcMidnight } from "@/lib/dates";
import type { VacationLike } from "@/lib/holidays";

export const dynamic = "force-dynamic";

export default async function OficinaPage() {
  const [user, appointments, customers, employees, approved] =
    await Promise.all([
      getCurrentUser(),
      listAppointments(),
      listCustomers(),
      listEmployees({ onlyActive: true }),
      prisma.vacation.findMany({
        where: { status: "APPROVED" },
        include: {
          employee: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);
  const canManage = roleCanManageFrontDesk(user?.role);

  const approvedVacations: VacationLike[] = approved.map((v) => ({
    id: v.id,
    employeeId: v.employeeId,
    startDate: new Date(v.startDate).toISOString(),
    endDate: new Date(v.endDate).toISOString(),
    type: v.type,
    category: v.category,
    status: v.status,
    employee: v.employee,
  }));

  return (
    <div>
      <PageHeader
        title="Oficina / Agenda"
        description="Marcações de serviço da oficina, por dia."
      />
      <OficinaAgenda
        canManage={canManage}
        initialDate={dateKey(toUtcMidnight(new Date()))}
        appointments={appointments.map((a) => ({
          id: a.id,
          date: new Date(a.date).toISOString(),
          startTime: a.startTime,
          endTime: a.endTime,
          serviceType: a.serviceType,
          status: a.status,
          notes: a.notes,
          customer: a.customer,
          vehicle: a.vehicle,
          assignedEmployee: a.assignedEmployee,
        }))}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          vehicles: c.vehicles.map((v) => ({
            id: v.id,
            plateNumber: v.plateNumber,
            brand: v.brand,
            model: v.model,
          })),
        }))}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          color: e.color,
        }))}
        approvedVacations={approvedVacations}
      />
    </div>
  );
}
