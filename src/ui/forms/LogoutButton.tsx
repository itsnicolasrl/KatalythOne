"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/ui/components/Button";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={onLogout} disabled={loading}>
      {loading ? "Saliendo..." : "Logout"}
    </Button>
  );
}

