"use client"

import type React from "react"
import { User, Phone, Link, MapPin, Edit3 } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { DealData, PipelineStage } from "./types"

interface ClientInfoProps {
  dealData: DealData
  setDealData: (data: DealData) => void
  stages: PipelineStage[]
  editingField: string | null
  setEditingField: (field: string | null) => void
  saveDeal: (updates: Partial<DealData>) => void
  handleStageChange: (stageId: string) => void
}

function EditableField({
  fieldKey,
  label,
  icon,
  type = "text",
  dealData,
  setDealData,
  editingField,
  setEditingField,
  saveDeal,
}: {
  fieldKey: keyof DealData
  label: string
  icon: React.ReactNode
  type?: "text" | "number" | "tel" | "url"
  dealData: DealData
  setDealData: (data: DealData) => void
  editingField: string | null
  setEditingField: (field: string | null) => void
  saveDeal: (updates: Partial<DealData>) => void
}) {
  const value = dealData[fieldKey]
  const isEditing = editingField === fieldKey

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      {isEditing ? (
        <Input
          type={type}
          className="h-7 text-xs"
          value={value || ""}
          onChange={(e) =>
            setDealData({ ...dealData, [fieldKey]: type === "number" ? Number(e.target.value) : e.target.value })
          }
          onBlur={() => {
            setEditingField(null)
            saveDeal({ [fieldKey]: dealData[fieldKey] })
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditingField(null)
              saveDeal({ [fieldKey]: dealData[fieldKey] })
            }
          }}
          autoFocus
        />
      ) : (
        <div
          className="flex items-center gap-2 p-1.5 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors text-xs"
          onClick={() => setEditingField(fieldKey)}
        >
          {icon}
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {type === "number" && value ? `${Number(value).toLocaleString()} ₽` : value || "Не указано"}
          </span>
          <Edit3 size={10} className="ml-auto text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export function ClientInfo({
  dealData,
  setDealData,
  stages,
  editingField,
  setEditingField,
  saveDeal,
  handleStageChange,
}: ClientInfoProps) {
  const fieldProps = { dealData, setDealData, editingField, setEditingField, saveDeal }

  return (
    <>
      {/* Pipeline Stages */}
      {stages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Этап воронки</p>
          <div className="flex flex-wrap gap-1">
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                  dealData.stageId === stage.id || dealData.stage === stage.name
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={{
                  backgroundColor:
                    dealData.stageId === stage.id || dealData.stage === stage.name ? stage.color : undefined,
                }}
              >
                {stage.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact Fields */}
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
        <h3 className="text-xs font-semibold flex items-center gap-1 text-primary">
          <User size={12} />
          Контактные данные
        </h3>
        <div className="space-y-2">
          <EditableField fieldKey="contactName" label="ФИО" icon={<User size={12} className="text-muted-foreground" />} {...fieldProps} />
          <EditableField fieldKey="contactPhone" label="Номер телефона" icon={<Phone size={12} className="text-muted-foreground" />} type="tel" {...fieldProps} />
          <EditableField fieldKey="messengerLink" label="Ссылка на мессенджер" icon={<Link size={12} className="text-muted-foreground" />} type="url" {...fieldProps} />
          <EditableField fieldKey="city" label="Город" icon={<MapPin size={12} className="text-muted-foreground" />} {...fieldProps} />
        </div>
      </div>
    </>
  )
}
