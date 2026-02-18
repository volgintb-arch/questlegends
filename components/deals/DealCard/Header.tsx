"use client"

import { X, Edit3, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DealData } from "./types"

interface HeaderProps {
  dealData: DealData
  setDealData: (data: DealData) => void
  isEditingTitle: boolean
  setIsEditingTitle: (editing: boolean) => void
  isSaving: boolean
  canDelete: boolean
  onDelete: () => void
  onClose: () => void
  saveDeal: (updates: Partial<DealData>) => void
}

export function Header({
  dealData,
  setDealData,
  isEditingTitle,
  setIsEditingTitle,
  isSaving,
  canDelete,
  onDelete,
  onClose,
  saveDeal,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div className="flex items-center gap-3">
        {isEditingTitle ? (
          <Input
            className="text-base font-semibold h-8"
            value={dealData.contactName || dealData.clientName}
            onChange={(e) =>
              setDealData({ ...dealData, contactName: e.target.value, clientName: e.target.value })
            }
            onBlur={() => {
              setIsEditingTitle(false)
              saveDeal({ contactName: dealData.contactName, clientName: dealData.contactName })
            }}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
            autoFocus
          />
        ) : (
          <h2
            className="text-base font-semibold cursor-pointer hover:text-primary flex items-center gap-1"
            onClick={() => setIsEditingTitle(true)}
          >
            {dealData.contactName || dealData.clientName || "Без названия"}
            <Edit3 size={12} className="text-muted-foreground" />
          </h2>
        )}
        {isSaving && <span className="text-[10px] text-muted-foreground">Сохранение...</span>}
      </div>
      <div className="flex items-center gap-2">
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={onDelete}
          >
            <Trash2 size={18} />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>
    </div>
  )
}
