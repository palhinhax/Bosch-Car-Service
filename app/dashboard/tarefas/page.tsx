import { PageHeader } from "@/components/page-header";
import { TarefasBoard } from "@/features/tarefas/tarefas-board";
import { listEmployees, listTasks, listVehicles } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const [tasks, employees, vehicles] = await Promise.all([
    listTasks(),
    listEmployees({ onlyActive: true }),
    listVehicles(),
  ]);

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Tarefas internas da equipa da oficina."
      />
      <TarefasBoard
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
          assignedEmployee: t.assignedEmployee,
          relatedVehicle: t.relatedVehicle,
        }))}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          plateNumber: v.plateNumber,
        }))}
      />
    </div>
  );
}
