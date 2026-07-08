import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const YEAR = 2026;
// Month is 0-based: 0 = Janeiro ... 11 = Dezembro
const d = (month: number, day: number) =>
  new Date(Date.UTC(YEAR, month - 1, day));

async function main() {
  console.log("🌱 A semear a base de dados — Bosch Car Service Lousa...");

  // ---- Reset (dev-friendly, idempotent) ----
  await prisma.task.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();

  // ---- Workshop settings ----
  await prisma.workshopSettings.upsert({
    where: { id: "default" },
    update: { minStaffPerDay: 2, year: YEAR },
    create: {
      id: "default",
      name: "Bosch Car Service Lousa",
      minStaffPerDay: 2,
      year: YEAR,
    },
  });

  // ---- Colaboradores (colours mirror the paper Mapa de Férias) ----
  const employeesData = [
    { name: "Rodrigo Bras", color: "#00e5ff", jobRole: "Chefe de Oficina" },
    { name: "David Simoes", color: "#ff8ad8", jobRole: "Mecânico" },
    { name: "Carlos Tome", color: "#8de06a", jobRole: "Mecânico" },
    {
      name: "Sandro Gandarez",
      color: "#ffe500",
      jobRole: "Técnico de Diagnóstico",
    },
    { name: "Mauro Carvalho", color: "#9b6ede", jobRole: "Mecânico" },
  ];

  const employees: Record<string, { id: string }> = {};
  for (const e of employeesData) {
    const created = await prisma.employee.create({
      data: {
        name: e.name,
        color: e.color,
        jobRole: e.jobRole,
        department: "Oficina",
        active: true,
        annualVacationDays: 22,
        email: `${e.name.toLowerCase().replace(/\s+/g, ".")}@bosch-lousa.pt`,
      },
    });
    employees[e.name] = created;
  }

  // ---- Users / access ----
  const managerHash = await bcrypt.hash("bosch2026", 12);
  await prisma.user.create({
    data: {
      name: "Gestor da Oficina",
      email: "gestor@bosch-lousa.pt",
      passwordHash: managerHash,
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      name: "Receção",
      email: "rececao@bosch-lousa.pt",
      passwordHash: await bcrypt.hash("bosch2026", 12),
      role: "RECEPTION",
    },
  });
  // Employee self-service login linked to Rodrigo
  await prisma.user.create({
    data: {
      name: "Rodrigo Bras",
      email: "rodrigo@bosch-lousa.pt",
      passwordHash: await bcrypt.hash("bosch2026", 12),
      role: "EMPLOYEE",
      employeeId: employees["Rodrigo Bras"].id,
    },
  });

  const manager = await prisma.user.findUnique({
    where: { email: "gestor@bosch-lousa.pt" },
  });

  // ---- Férias (example data from the brief) ----
  const approved = {
    status: "APPROVED",
    category: "FERIAS",
    type: "FULL",
    approvedById: manager!.id,
  } as const;

  const vac = (
    name: string,
    start: Date,
    end: Date,
    extra: Partial<{
      status: string;
      category: string;
      type: string;
      approvedById: string;
    }> = {}
  ) =>
    prisma.vacation.create({
      data: {
        employeeId: employees[name].id,
        startDate: start,
        endDate: end,
        ...approved,
        ...extra,
      },
    });

  // Rodrigo Bras: 3 Ago – 21 Ago
  await vac("Rodrigo Bras", d(8, 3), d(8, 21));

  // David Simoes: 24 Ago – 4 Set  (left PENDING to showcase the approval flow)
  await vac("David Simoes", d(8, 24), d(9, 4), {
    status: "PENDING",
    approvedById: undefined,
  });

  // Carlos Tome: 6 Jul – 31 Jul
  await vac("Carlos Tome", d(7, 6), d(7, 31));

  // Sandro Gandarez: several periods
  await vac("Sandro Gandarez", d(4, 6), d(4, 7));
  await vac("Sandro Gandarez", d(7, 14), d(7, 14));
  await vac("Sandro Gandarez", d(8, 3), d(8, 21));
  await vac("Sandro Gandarez", d(11, 16), d(11, 16));
  await vac("Sandro Gandarez", d(12, 24), d(12, 24));

  // Mauro Carvalho: several periods
  await vac("Mauro Carvalho", d(2, 20), d(2, 20));
  await vac("Mauro Carvalho", d(6, 8), d(6, 9));
  await vac("Mauro Carvalho", d(8, 3), d(8, 14));
  await vac("Mauro Carvalho", d(9, 4), d(9, 8));
  await vac("Mauro Carvalho", d(11, 11), d(11, 11));
  await vac("Mauro Carvalho", d(12, 7), d(12, 7));
  await vac("Mauro Carvalho", d(12, 10), d(12, 10));

  // ---- CRM demo (clientes / veículos) ----
  const cliente = await prisma.customer.create({
    data: {
      name: "António Ferreira",
      phone: "912 345 678",
      email: "antonio.ferreira@email.pt",
      address: "Rua das Oliveiras 12, Lousa",
      vehicles: {
        create: [
          {
            plateNumber: "AA-12-BB",
            brand: "Volkswagen",
            model: "Golf",
            year: 2019,
            mileage: 84000,
            vin: "WVWZZZ1KZAW000001",
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const cliente2 = await prisma.customer.create({
    data: {
      name: "Maria Santos",
      phone: "934 111 222",
      email: "maria.santos@email.pt",
      address: "Av. Coimbra 45, Lousa",
      vehicles: {
        create: [
          {
            plateNumber: "12-CD-34",
            brand: "Renault",
            model: "Clio",
            year: 2021,
            mileage: 41000,
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  // ---- Marcações (appointments) ----
  await prisma.appointment.create({
    data: {
      customerId: cliente.id,
      vehicleId: cliente.vehicles[0].id,
      assignedEmployeeId: employees["Carlos Tome"].id,
      date: d(7, 9),
      startTime: "09:00",
      endTime: "10:30",
      serviceType: "OIL_CHANGE",
      status: "BOOKED",
      notes: "Mudança de óleo + filtros.",
    },
  });
  await prisma.appointment.create({
    data: {
      customerId: cliente2.id,
      vehicleId: cliente2.vehicles[0].id,
      assignedEmployeeId: employees["Mauro Carvalho"].id,
      date: d(7, 9),
      startTime: "11:00",
      endTime: "12:00",
      serviceType: "BRAKES",
      status: "IN_PROGRESS",
      notes: "Substituição de pastilhas dianteiras.",
    },
  });

  // ---- Tarefas ----
  await prisma.task.create({
    data: {
      title: "Encomendar pastilhas de travão (Clio)",
      description: "Confirmar referência com fornecedor.",
      assignedEmployeeId: employees["Mauro Carvalho"].id,
      relatedVehicleId: cliente2.vehicles[0].id,
      status: "TODO",
      priority: "HIGH",
      dueDate: d(7, 9),
    },
  });
  await prisma.task.create({
    data: {
      title: "Rever inventário de óleo 5W30",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
    },
  });

  console.log("✅ Concluído.");
  console.log("\n🔐 Credenciais de acesso:");
  console.log(
    "   Gestor:  gestor@bosch-lousa.pt   / bosch2026  (Administrador)"
  );
  console.log("   Receção: rececao@bosch-lousa.pt  / bosch2026  (Receção)");
  console.log("   Colab.:  rodrigo@bosch-lousa.pt  / bosch2026  (Colaborador)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
