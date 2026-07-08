import { PageHeader } from "@/components/page-header";
import { VeiculosManager } from "@/features/veiculos/veiculos-manager";
import { getCurrentUser, roleCanManageFrontDesk } from "@/lib/auth/session";
import { listCustomers, listVehicles } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function VeiculosPage() {
  const [user, vehicles, customers] = await Promise.all([
    getCurrentUser(),
    listVehicles(),
    listCustomers(),
  ]);
  const canManage = roleCanManageFrontDesk(user?.role);

  return (
    <div>
      <PageHeader
        title="Veículos"
        description="Frota de veículos dos clientes."
      />
      <VeiculosManager
        canManage={canManage}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          plateNumber: v.plateNumber,
          brand: v.brand,
          model: v.model,
          year: v.year,
          mileage: v.mileage,
          vin: v.vin,
          notes: v.notes,
          customer: v.customer,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
