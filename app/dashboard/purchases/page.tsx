import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { PurchasesModule } from "@/src/ui/modules/purchases/PurchasesModule";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PurchasesModule />
    </div>
  );
}

