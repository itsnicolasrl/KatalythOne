import { MembershipsModule } from "@/src/ui/modules/memberships/MembershipsModule";
import { RolePermissionsModule } from "@/src/ui/modules/permissions/RolePermissionsModule";

export const dynamic = "force-dynamic";

export default function CompanyMembershipsPage({
  params,
}: {
  params: { companyId: string };
}) {
  return (
    <div className="space-y-6">
      <MembershipsModule companyId={params.companyId} />
      <RolePermissionsModule />
    </div>
  );
}

