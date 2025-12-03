"use client"

import type React from "react"

import { useState } from "react"
import { X, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateIncident, useUpdateIncident } from "@/hooks/use-incidents"
import type { Incident, Personnel } from "@/lib/types"

interface IncidentModalProps {
  incident?: Incident
  locationId: string
  personnel: Personnel[]
  onClose: () => void
}

export function IncidentModal({ incident, locationId, personnel, onClose }: IncidentModalProps) {
  const [formData, setFormData] = useState({
    title: incident?.title || "",
    description: incident?.description || "",
    severity: incident?.severity || "medium",
    status: incident?.status || "open",
    responsible_personnel_id: incident?.responsible_personnel_id || "",
    client_name: incident?.client_name || "",
    photos: incident?.photos || [],
    resolution: incident?.resolution || "",
  })

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const createIncident = useCreateIncident()
  const updateIncident = useUpdateIncident()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      ...formData,
      location_id: locationId,
    }

    if (incident) {
      await updateIncident.mutateAsync({ id: incident.id, data })
    } else {
      await createIncident.mutateAsync(data)
    }

    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles([...uploadedFiles, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{incident ? "Редактировать инцидент" : "Новый инцидент"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Заголовок *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Краткое описание инцидента"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Описание *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание произошедшего"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Серьезность *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкая</SelectItem>
                  <SelectItem value="medium">Средняя</SelectItem>
                  <SelectItem value="high">Высокая</SelectItem>
                  <SelectItem value="critical">Критическая</SelectItem>
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
                  <SelectItem value="open">Открыт</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="resolved">Решен</SelectItem>
                  <SelectItem value="closed">Закрыт</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ответственный сотрудник</Label>
              <Select
                value={formData.responsible_personnel_id}
                onValueChange={(value) => setFormData({ ...formData, responsible_personnel_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не назначен" />
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
              <Label>Имя клиента</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Имя клиента (если применимо)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Фотографии</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input type="file" id="photos" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
              <label htmlFor="photos" className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Нажмите для загрузки фотографий</span>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(incident?.status === "resolved" || formData.status === "resolved") && (
            <div className="space-y-2">
              <Label>Решение</Label>
              <Textarea
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                placeholder="Опишите как был решен инцидент"
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">{incident ? "Сохранить" : "Создать"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
