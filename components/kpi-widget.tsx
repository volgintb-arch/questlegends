"use client"

import { Target, TrendingUp, TrendingDown } from "lucide-react"

interface KPIWidgetProps {
  metric: string
  targetValue: number
  actualValue: number
  unit: string
  periodEnd: string
}

export function KPIWidget({ metric, targetValue, actualValue, unit, periodEnd }: KPIWidgetProps) {
  const percentage = (actualValue / targetValue) * 100
  const isOnTrack = percentage >= 80
  const isExceeded = percentage >= 100

  const getStatusColor = () => {
    if (isExceeded) return "text-green-500"
    if (isOnTrack) return "text-yellow-500"
    return "text-red-500"
  }

  const getBackgroundColor = () => {
    if (isExceeded) return "bg-green-500/10 border-green-500/20"
    if (isOnTrack) return "bg-yellow-500/10 border-yellow-500/20"
    return "bg-red-500/10 border-red-500/20"
  }

  return (
    <div className={`bg-card border rounded-lg p-4 ${getBackgroundColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={18} className={getStatusColor()} />
          <span className="text-sm font-medium text-foreground">{metric}</span>
        </div>
        {isExceeded ? (
          <TrendingUp size={16} className="text-green-500" />
        ) : (
          <TrendingDown size={16} className={getStatusColor()} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{actualValue.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Цель: {targetValue.toLocaleString()} {unit}
          </span>
          <span className={`font-semibold ${getStatusColor()}`}>{percentage.toFixed(0)}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isExceeded ? "bg-green-500" : isOnTrack ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">До: {new Date(periodEnd).toLocaleDateString("ru-RU")}</p>
      </div>
    </div>
  )
}
