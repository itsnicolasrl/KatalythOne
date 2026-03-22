import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { WorkflowBoardModule } from "@/src/ui/modules/tasks/WorkflowBoardModule";
import { ProjectExecutionModule } from "@/src/ui/modules/projects/ProjectExecutionModule";

export const dynamic = "force-dynamic";

export default async function ProjectWorkflowPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <WorkflowBoardModule fixedProjectId={params.projectId} />
      <ProjectExecutionModule projectId={params.projectId} />
    </div>
  );
}

