"use client"

import { useAuth } from "@/contexts/auth-context"
import { AccessManagementUK } from "@/components/access-management-uk"
import { AccessManagementFranchisee } from "@/components/access-management-franchisee"
import { AccessManagementAdmin } from "@/components/access-management-admin"

export default function AccessPage() {
  const { user } = useAuth()

  if (user.role === "uk") {
    return <AccessManagementUK />
  }

  if (user.role === "franchisee") {
    return <AccessManagementFranchisee />
  }

  if (user.role === "admin") {
    return <AccessManagementAdmin />
  }

  return <div>Access denied</div>
}
