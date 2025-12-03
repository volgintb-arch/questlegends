"use client"

import { useAuth } from "@/contexts/auth-context"
import { KnowledgeBaseSection } from "@/components/knowledge-base-section"

export default function KnowledgePage() {
  const { user } = useAuth()

  return <KnowledgeBaseSection role={user.role} />
}
