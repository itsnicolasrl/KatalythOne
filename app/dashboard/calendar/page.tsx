import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { CalendarModule } from "@/src/ui/modules/calendar/CalendarModule";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto p-6">
      <CalendarModule />
    </div>
  );
}

