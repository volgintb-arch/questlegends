"use client"

import { useAuth } from "@/contexts/auth-context"
import { SocialIntegrationsAdmin } from "@/components/social-integrations-admin"
import { SocialIntegrationsFranchisee } from "@/components/social-integrations-franchisee"

export default function SocialIntegrationsPage() {
  const { user } = useAuth()

  if (user?.role === "super_admin" || user?.role === "uk" || user?.role === "uk_employee") {
    return <SocialIntegrationsAdmin />
  }

  if (user?.role === "franchisee" || user?.role === "own_point") {
    return <SocialIntegrationsFranchisee />
  }

  return <div className="p-6 text-muted-foreground">Доступ к настройкам интеграций с соцсетями запрещен</div>
}
