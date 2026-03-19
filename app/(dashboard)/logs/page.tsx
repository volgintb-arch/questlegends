"use client"

import { useAuth } from "@/contexts/auth-context"
import { AppLogsViewer } from "@/components/app-logs-viewer"

export default function LogsPage() {
  const { user } = useAuth()

  if (user?.role !== "super_admin" && user?.role !== "uk") {
    return <div className="p-6 text-muted-foreground">Доступ запрещён. Только для управляющей компании.</div>
  }

  return <AppLogsViewer />
}
