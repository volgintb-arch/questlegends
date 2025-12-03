"use client"

import { useAuth } from "@/contexts/auth-context"
import { NotificationsSection } from "@/components/notifications-section"

export default function NotificationsPage() {
  const { user } = useAuth()

  return <NotificationsSection role={user.role} />
}
