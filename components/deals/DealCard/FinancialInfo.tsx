"use client"

import type React from "react"
import { DollarSign, Briefcase, Users, Edit3 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { DealData, Employee } from "./types"

interface FinancialInfoProps {
  dealData: DealData
  setDealData: (data: DealData) => void
  editingField: string | null
  setEditingField: (field: string | null) => void
  saveDeal: (updates: Partial<DealData>) => void
  employees: Employee[]
  responsibleUsers: string[]
  toggleResponsibleUser: (userId: string) => void
}

function EditableNumberField({
  fieldKey,
  label,
  icon,
  dealData,
  setDealData,
  editingField,
  setEditingField,
  saveDeal,
}: {
  fieldKey: keyof DealData
  label: string
  icon: React.ReactNode
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
          type="number"
          className="h-7 text-xs"
          value={value || ""}
          onChange={(e) => setDealData({ ...dealData, [fieldKey]: Number(e.target.value) })}
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
            {value ? `${Number(value).toLocaleString()} ₽` : "Не указано"}
          </span>
          <Edit3 size={10} className="ml-auto text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export function FinancialInfo({
  dealData,
  setDealData,
  editingField,
  setEditingField,
  saveDeal,
  employees,
  responsibleUsers,
  toggleResponsibleUser,
}: FinancialInfoProps) {
  const numFieldProps = { dealData, setDealData, editingField, setEditingField, saveDeal }

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
      <h3 className="text-xs font-semibold flex items-center gap-1 text-primary">
        <Briefcase size={12} />
        Данные сделки
      </h3>
      <div className="space-y-2">
        <EditableNumberField fieldKey="paushalnyyVznos" label="Паушальный взнос" icon={<DollarSign size={12} className="text-green-500" />} {...numFieldProps} />
        <EditableNumberField fieldKey="investmentAmount" label="Сумма инвестиций" icon={<DollarSign size={12} className="text-blue-500" />} {...numFieldProps} />

        {/* Lead Source */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Источник лида</label>
          <Select
            value={dealData.leadSource || dealData.source || ""}
            onValueChange={(value) => saveDeal({ leadSource: value })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Выбрать источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Сайт">Сайт</SelectItem>
              <SelectItem value="Звонок">Звонок</SelectItem>
              <SelectItem value="Рекомендация">Рекомендация</SelectItem>
              <SelectItem value="Реклама">Реклама</SelectItem>
              <SelectItem value="Соцсети">Соцсети</SelectItem>
              <SelectItem value="Выставка">Выставка</SelectItem>
              <SelectItem value="Холодный звонок">Холодный звонок</SelectItem>
              <SelectItem value="Партнер">Партнер</SelectItem>
              <SelectItem value="Другое">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Responsible Users */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Users size={10} />
            Ответственные (сотрудники УК)
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto p-2 bg-muted/20 rounded">
            {employees.map((emp) => (
              <label
                key={emp.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1 rounded text-xs"
              >
                <Checkbox
                  checked={responsibleUsers.includes(emp.id)}
                  onCheckedChange={() => toggleResponsibleUser(emp.id)}
                  className="h-3 w-3"
                />
                <span>{emp.name}</span>
              </label>
            ))}
          </div>
          {responsibleUsers.length > 0 && (
            <p className="text-[10px] text-muted-foreground">Выбрано: {responsibleUsers.length}</p>
          )}
        </div>

        {/* Additional Comment */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Дополнительный комментарий</label>
          {editingField === "additionalComment" ? (
            <Textarea
              className="text-xs min-h-[60px]"
              value={dealData.additionalComment || ""}
              onChange={(e) => setDealData({ ...dealData, additionalComment: e.target.value })}
              onBlur={() => {
                setEditingField(null)
                saveDeal({ additionalComment: dealData.additionalComment })
              }}
              autoFocus
            />
          ) : (
            <div
              className="p-1.5 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors text-xs min-h-[40px]"
              onClick={() => setEditingField("additionalComment")}
            >
              <span className={dealData.additionalComment ? "text-foreground" : "text-muted-foreground"}>
                {dealData.additionalComment || "Нажмите, чтобы добавить комментарий..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
