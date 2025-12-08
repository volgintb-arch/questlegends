"use client"

import { MessagingSection } from "@/components/messaging-section"
import { useAuth } from "@/contexts/auth-context"

export default function MessagesPage() {
  const { user } = useAuth()

  // Only UK and franchisees can access messaging
  if (!user || !["uk", "uk_employee", "super_admin", "franchisee"].includes(user.role)) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">У вас нет доступа к сообщениям</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-medium mb-4">Сообщения</h1>
      <MessagingSection />
    </div>
  )
}
