"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  task?: any
  personnel: any[]
  onSave: () => void
}

export function TaskModal({ isOpen, onClose, dealId, task, personnel, onSave }: TaskModalProps) {
  const { getAuthHeaders } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedToUserId: "",
    startTime: "",
    dueTime: "",
    status: "NOT_STARTED",
    rescheduledTime: "",
    rescheduledReason: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        assignedToUserId: task.assignedToUserId || "",
        startTime: task.startTime ? new Date(task.startTime).toISOString().slice(0, 16) : "",
        dueTime: task.dueTime ? new Date(task.dueTime).toISOString().slice(0, 16) : "",
        status: task.status || "NOT_STARTED",
        rescheduledTime: task.rescheduledTime ? new Date(task.rescheduledTime).toISOString().slice(0, 16) : "",
        rescheduledReason: task.rescheduledReason || "",
      })
    } else {
      setFormData({
        title: "",
        description: "",
        assignedToUserId: "",
        startTime: "",
        dueTime: "",
        status: "NOT_STARTED",
        rescheduledTime: "",
        rescheduledReason: "",
      })
    }
  }, [task, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = task ? `/api/tasks/${task.id}` : "/api/tasks"
      const method = task ? "PATCH" : "POST"

      const body: any = {
        ...formData,
        dealId,
      }

      // Remove empty fields
      Object.keys(body).forEach((key) => {
        if (body[key] === "" || body[key] === null) {
          delete body[key]
        }
      })

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        onSave()
        onClose()
      }
    } catch (error) {
      console.error("Failed to save task:", error)
    } finally {
      setLoading(false)
    }
  }

  const statusLabels = {
    NOT_STARTED: "Не выполнена",
    IN_PROGRESS: "В реализации",
    RESCHEDULED: "Перенесена",
    COMPLETED: "Выполнена",
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Редактировать задачу" : "Создать задачу"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Название задачи *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="assigned">Назначить сотруднику</Label>
            <Select
              value={formData.assignedToUserId}
              onValueChange={(value) => setFormData({ ...formData, assignedToUserId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не назначено</SelectItem>
                {personnel.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name} ({person.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">
                <Calendar className="inline w-4 h-4 mr-1" />
                Начало
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="dueTime">
                <Calendar className="inline w-4 h-4 mr-1" />
                Дедлайн
              </Label>
              <Input
                id="dueTime"
                type="datetime-local"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              />
            </div>
          </div>

          {task && (
            <>
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.status === "RESCHEDULED" && (
                <>
                  <div>
                    <Label htmlFor="rescheduledTime">Новая дата/время</Label>
                    <Input
                      id="rescheduledTime"
                      type="datetime-local"
                      value={formData.rescheduledTime}
                      onChange={(e) => setFormData({ ...formData, rescheduledTime: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rescheduledReason">Причина переноса (опционально)</Label>
                    <Textarea
                      id="rescheduledReason"
                      value={formData.rescheduledReason}
                      onChange={(e) => setFormData({ ...formData, rescheduledReason: e.target.value })}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение..." : task ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
