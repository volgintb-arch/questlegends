"use client"

import { useState } from "react"
import { X, Save } from "lucide-react"

interface KPISetting {
  id: string
  name: string
  visible: boolean
}

interface KPISettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (kpis: KPISetting[]) => void
  currentKPIs: KPISetting[]
}

export function KPISettingsModal({ isOpen, onClose, onSave, currentKPIs }: KPISettingsModalProps) {
  const [kpis, setKpis] = useState<KPISetting[]>(currentKPIs)

  useState(() => {
    setKpis(currentKPIs)
  })

  const handleToggle = (id: string) => {
    setKpis(kpis.map((kpi) => (kpi.id === id ? { ...kpi, visible: !kpi.visible } : kpi)))
  }

  const handleSave = () => {
    onSave(kpis)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Выбор Ключевых Показателей</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {kpis.map((kpi) => (
            <label
              key={kpi.id}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={kpi.visible}
                onChange={() => handleToggle(kpi.id)}
                className="w-4 h-4 rounded border border-border bg-muted cursor-pointer accent-primary"
              />
              <span className="text-sm font-medium text-foreground">{kpi.name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
