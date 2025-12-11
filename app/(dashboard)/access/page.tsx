"use client"

import { useAuth } from "@/contexts/auth-context"
import { AccessManagementUK } from "@/components/access-management-uk"
import { AccessManagementFranchisee } from "@/components/access-management-franchisee"
import { AccessManagementAdmin } from "@/components/access-management-admin"

export default function AccessPage() {
  const { user } = useAuth()

  if (user?.role === "super_admin" || user?.role === "uk" || user?.role === "uk_employee") {
    return <AccessManagementUK />
  }

  if (user?.role === "franchisee" || user?.role === "own_point") {
    return <AccessManagementFranchisee />
  }

  if (user?.role === "admin") {
    return <AccessManagementAdmin />
  }

  return <div className="p-6 text-muted-foreground">Доступ запрещен</div>
}
