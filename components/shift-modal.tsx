"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateShift, useUpdateShift } from "@/hooks/use-shifts"
import type { Shift, Personnel } from "@/lib/types"
import { format } from "date-fns"

interface ShiftModalProps {
  shift?: Shift
  personnel: Personnel[]
  locationId: string
  onClose: () => void
  defaultDate?: Date
}

export function ShiftModal({ shift, personnel, locationId, onClose, defaultDate }: ShiftModalProps) {
  const [formData, setFormData] = useState({
    personnel_id: shift?.personnel_id || "",
    date: shift?.date
      ? format(new Date(shift.date), "yyyy-MM-dd")
      : defaultDate
        ? format(defaultDate, "yyyy-MM-dd")
        : "",
    start_time: shift?.start_time || "09:00",
    end_time: shift?.end_time || "18:00",
    role: shift?.role || "",
    status: shift?.status || "scheduled",
    break_duration_minutes: shift?.break_duration_minutes || 60,
    overtime_hours: shift?.overtime_hours || 0,
    notes: shift?.notes || "",
  })

  const createShift = useCreateShift()
  const updateShift = useUpdateShift()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      ...formData,
      location_id: locationId,
      date: new Date(formData.date),
    }

    if (shift) {
      await updateShift.mutateAsync({ id: shift.id, data })
    } else {
      await createShift.mutateAsync(data)
    }

    onClose()
  }

  const roles = ["Аниматор", "Ведущий", "DJ", "Администратор", "Менеджер"]
  const statuses = [
    { value: "scheduled", label: "Запланировано" },
    { value: "confirmed", label: "Подтверждено" },
    { value: "completed", label: "Завершено" },
    { value: "cancelled", label: "Отменено" },
    { value: "no_show", label: "Не явился" },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{shift ? "Редактировать смену" : "Новая смена"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Сотрудник *</Label>
              <Select
                value={formData.personnel_id}
                onValueChange={(value) => setFormData({ ...formData, personnel_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {personnel.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {p.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Дата *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Начало *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Окончание *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Роль *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Перерыв (минуты)</Label>
              <Input
                type="number"
                value={formData.break_duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    break_duration_minutes: Number.parseInt(e.target.value),
                  })
                }
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Переработка (часы)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.overtime_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    overtime_hours: Number.parseFloat(e.target.value),
                  })
                }
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Заметки</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">{shift ? "Сохранить" : "Создать"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
