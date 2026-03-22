import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { CustomerDetailModule } from "@/src/ui/modules/customers/CustomerDetailModule";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: { customerId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto p-6">
      <CustomerDetailModule customerId={params.customerId} />
    </div>
  );
}

