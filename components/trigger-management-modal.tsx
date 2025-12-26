"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash2, Pencil } from "lucide-react"

interface Trigger {
  id: string
  configId: string
  keyword: string
  isActive: boolean
  autoCreateLead: boolean
  autoReplyMessage: string | null
  priority: number
  createdAt: string
}

interface TriggerManagementModalProps {
  open: boolean
  onClose: () => void
  configId: string
}

export function TriggerManagementModal({ open, onClose, configId }: TriggerManagementModalProps) {
  const { getAuthHeaders } = useAuth()
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null)
  const [formData, setFormData] = useState({
    keyword: "",
    isActive: true,
    autoCreateLead: true,
    autoReplyMessage: "",
    priority: 0,
  })

  useEffect(() => {
    if (open) {
      fetchTriggers()
    }
  }, [open, configId])

  const fetchTriggers = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/social-integrations/${configId}/triggers`, {
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        const data = await res.json()
        setTriggers(data.data || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching triggers:", error)
      toast({ title: "Ошибка загрузки триггеров", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingTrigger
        ? `/api/social-integrations/triggers/${editingTrigger.id}`
        : `/api/social-integrations/${configId}/triggers`
      const method = editingTrigger ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast({ title: editingTrigger ? "Триггер обновлен" : "Триггер создан" })
        setFormData({ keyword: "", isActive: true, autoCreateLead: true, autoReplyMessage: "", priority: 0 })
        setShowAddForm(false)
        setEditingTrigger(null)
        fetchTriggers()
      } else {
        const error = await res.json()
        toast({ title: "Ошибка", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("[v0] Error saving trigger:", error)
      toast({ title: "Ошибка сохранения", variant: "destructive" })
    }
  }

  const handleDelete = async (triggerId: string) => {
    if (!confirm("Удалить этот триггер?")) return

    try {
      const res = await fetch(`/api/social-integrations/triggers/${triggerId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        toast({ title: "Триггер удален" })
        fetchTriggers()
      }
    } catch (error) {
      console.error("[v0] Error deleting trigger:", error)
      toast({ title: "Ошибка удаления", variant: "destructive" })
    }
  }

  const handleEdit = (trigger: Trigger) => {
    setEditingTrigger(trigger)
    setFormData({
      keyword: trigger.keyword,
      isActive: trigger.isActive,
      autoCreateLead: trigger.autoCreateLead,
      autoReplyMessage: trigger.autoReplyMessage || "",
      priority: trigger.priority,
    })
    setShowAddForm(true)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление триггерами</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm" className="w-full">
              <Plus className="w-3 h-3 mr-1" />
              Добавить триггер
            </Button>
          )}

          {showAddForm && (
            <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-md">
              <div className="space-y-2">
                <Label htmlFor="keyword">Ключевое слово</Label>
                <Input
                  id="keyword"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  placeholder="квест, день рождения..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Приоритет (0-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Активен</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoCreateLead">Автосоздание лида</Label>
                <Switch
                  id="autoCreateLead"
                  checked={formData.autoCreateLead}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoCreateLead: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoReplyMessage">Автоответ</Label>
                <Textarea
                  id="autoReplyMessage"
                  value={formData.autoReplyMessage}
                  onChange={(e) => setFormData({ ...formData, autoReplyMessage: e.target.value })}
                  placeholder="Спасибо за интерес! Скоро с вами свяжется наш менеджер."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingTrigger(null)
                    setFormData({
                      keyword: "",
                      isActive: true,
                      autoCreateLead: true,
                      autoReplyMessage: "",
                      priority: 0,
                    })
                  }}
                >
                  Отмена
                </Button>
                <Button type="submit" size="sm">
                  {editingTrigger ? "Обновить" : "Создать"}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Список триггеров</h3>
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Загрузка...</p>
            ) : triggers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Нет триггеров</p>
            ) : (
              <div className="space-y-2">
                {triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge variant={trigger.isActive ? "default" : "secondary"} className="text-[9px]">
                        {trigger.keyword}
                      </Badge>
                      {trigger.autoCreateLead && (
                        <Badge variant="outline" className="text-[9px]">
                          Автолид
                        </Badge>
                      )}
                      {trigger.priority > 0 && (
                        <Badge variant="secondary" className="text-[9px]">
                          P{trigger.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(trigger)}>
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDelete(trigger.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
