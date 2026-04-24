"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle } from "lucide-react"

const COMMON_REASONS = [
  "Не ответил",
  "Дорого",
  "Перенёс в другое место",
  "Не подошло время",
  "Нашёл конкурента",
  "Передумал",
  "Неактуально",
  "Дубль",
]

interface CancellationReasonModalProps {
  open: boolean
  clientName?: string
  initialReason?: string
  onConfirm: (reason: string) => void | Promise<void>
  onCancel: () => void
}

export function CancellationReasonModal({
  open,
  clientName,
  initialReason = "",
  onConfirm,
  onCancel,
}: CancellationReasonModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [customReason, setCustomReason] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialReason && COMMON_REASONS.includes(initialReason)) {
        setSelectedPreset(initialReason)
        setCustomReason("")
      } else if (initialReason) {
        setSelectedPreset("__other__")
        setCustomReason(initialReason)
      } else {
        setSelectedPreset("")
        setCustomReason("")
      }
    }
  }, [open, initialReason])

  if (!open) return null

  const finalReason = selectedPreset === "__other__" ? customReason.trim() : selectedPreset

  const handleConfirm = async () => {
    if (!finalReason) return
    setSaving(true)
    try {
      await onConfirm(finalReason)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md rounded-2xl border border-border p-5 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Причина отказа</h3>
              {clientName && (
                <p className="text-xs text-muted-foreground mt-0.5">Лид: {clientName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Укажите причину отказа — она попадёт в отчёты по рекламным источникам.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {COMMON_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedPreset(reason)}
              disabled={saving}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors text-left ${
                selectedPreset === reason
                  ? "bg-primary text-white border-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              }`}
            >
              {reason}
            </button>
          ))}
          <button
            onClick={() => setSelectedPreset("__other__")}
            disabled={saving}
            className={`col-span-2 px-3 py-2 text-xs rounded-lg border transition-colors text-left ${
              selectedPreset === "__other__"
                ? "bg-primary text-white border-primary"
                : "bg-muted/50 border-border hover:bg-muted"
            }`}
          >
            Другое (указать свою причину)
          </button>
        </div>

        {selectedPreset === "__other__" && (
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Опишите причину отказа..."
            rows={3}
            disabled={saving}
            autoFocus
            className="w-full mb-3 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg border border-border bg-transparent hover:bg-muted transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !finalReason}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Сохранение..." : "Подтвердить отказ"}
          </button>
        </div>
      </div>
    </div>
  )
}
