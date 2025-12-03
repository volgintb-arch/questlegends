import type { ReactNode } from "react"

interface DashboardGridProps {
  title: string
  description?: string
  children: ReactNode
}

export function DashboardGrid({ title, description, children }: DashboardGridProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  )
}
