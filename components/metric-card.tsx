import type React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
}

export function MetricCard({ title, value, trend, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-card border border-border p-4 sm:p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-primary opacity-60">{icon}</div>}
      </div>

      <div className="space-y-1 sm:space-y-2">
        <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>

        {trend && (
          <div className="flex items-center gap-1 pt-1 sm:pt-2">
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
            )}
            <span className={`text-xs sm:text-sm font-medium ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
