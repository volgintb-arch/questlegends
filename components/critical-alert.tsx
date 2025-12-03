import { AlertTriangle } from "lucide-react"

interface CriticalAlertProps {
  location: string
  dealId: string
  message: string
}

export function CriticalAlert({ location, dealId, message }: CriticalAlertProps) {
  return (
    <div className="critical-pulse rounded-lg bg-destructive/10 border border-destructive/50 p-4 backdrop-blur-sm">
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-destructive text-sm">СБОЙ!</h3>
          <p className="text-sm text-destructive-foreground/90 mt-1">
            <span className="font-medium">[{location}]</span> {message}
          </p>
          <p className="text-xs text-destructive-foreground/70 mt-2">
            ID Сделки: <span className="font-mono">{dealId}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
