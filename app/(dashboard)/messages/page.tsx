"use client"

import { MessagingSection } from "@/components/messaging-section"
import { useAuth } from "@/contexts/auth-context"

export default function MessagesPage() {
  const { user } = useAuth()

  if (!user || !["uk", "uk_employee", "super_admin", "franchisee", "own_point", "admin"].includes(user.role)) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">У вас нет доступа к сообщениям</p>
      </div>
    )
  }

  return <MessagingSection />
}
