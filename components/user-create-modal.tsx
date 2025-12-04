"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { User, Phone, AtSign, MessageSquare, FileText, MapPin } from "lucide-react"
import { RF_CITIES } from "@/lib/constants/rf-cities"

interface UserCreateModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UserCreateModal({ open, onClose, onSuccess }: UserCreateModalProps) {
  const { user: currentUser, canCreateRole, getAccessibleFranchisees } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "" as UserRole | "",
    telegram_id: "",
    whatsapp: "",
    description: "",
    franchisee_id: "",
    password: "",
    city: "",
  })

  const availableRoles: Array<{ value: string; label: string }> = []

  if (currentUser.role === "uk") {
    availableRoles.push({ value: "franchisee", label: "Франчайзи" }, { value: "uk_employee", label: "Сотрудник УК" })
  } else if (currentUser.role === "franchisee") {
    availableRoles.push(
      { value: "admin", label: "Администратор" },
      { value: "animator", label: "Аниматор" },
      { value: "host", label: "Ведущий" },
      { value: "dj", label: "DJ" },
    )
  } else if (currentUser.role === "admin") {
    availableRoles.push(
      { value: "animator", label: "Аниматор" },
      { value: "host", label: "Ведущий" },
      { value: "dj", label: "DJ" },
    )
  }

  const franchisees = getAccessibleFranchisees()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone || !formData.role) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      })
      return
    }

    if (formData.role === "franchisee" && !formData.city) {
      toast({
        title: "Ошибка",
        description: "Укажите город для франчайзи",
        variant: "destructive",
      })
      return
    }

    if (
      ["admin", "animator", "host", "dj"].includes(formData.role) &&
      !formData.franchisee_id &&
      !currentUser.franchiseeId
    ) {
      toast({
        title: "Ошибка",
        description: "Укажите локацию для создания сотрудника",
        variant: "destructive",
      })
      return
    }

    const password = formData.password || generatePassword()

    setIsLoading(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          telegram: formData.telegram_id,
          whatsapp: formData.whatsapp,
          description: formData.description,
          password: password,
          franchiseeId:
            formData.franchisee_id ||
            (["admin", "animator", "host", "dj"].includes(formData.role) ? currentUser.franchiseeId : undefined),
          city: formData.city || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ошибка создания пользователя")
      }

      toast({
        title: "Пользователь создан",
        description: `Логин: ${formData.phone}\nПароль: ${data.tempPassword || password}`,
      })

      onSuccess?.()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error("[v0] Error creating user:", error)
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать пользователя",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      role: "",
      telegram_id: "",
      whatsapp: "",
      description: "",
      franchisee_id: "",
      password: "",
      city: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentUser.role === "uk" && "Создать франчайзи или сотрудника УК"}
            {currentUser.role === "franchisee" && "Создать администратора или сотрудника"}
            {currentUser.role === "admin" && "Создать сотрудника"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              ФИО <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иван Иванов"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Номер телефона <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Будет использоваться как логин для входа в систему</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Роль <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.role === "admin" && (
              <p className="text-xs text-muted-foreground">Администратор с настраиваемыми правами доступа к модулям</p>
            )}
            {["animator", "host", "dj"].includes(formData.role) && (
              <p className="text-xs text-muted-foreground">Персонал с доступом только к своим сменам и базе знаний</p>
            )}
            {formData.role === "uk_employee" && (
              <p className="text-xs text-muted-foreground">Сотрудник УК с доступом к B2B CRM и своим задачам</p>
            )}
          </div>

          {currentUser.role === "uk" && formData.role === "franchisee" && (
            <div className="space-y-2">
              <Label htmlFor="city">
                Город <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
                <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {RF_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Города РФ с населением более 200 тысяч человек</p>
            </div>
          )}

          {currentUser.role === "franchisee" &&
            ["admin", "animator", "host", "dj"].includes(formData.role) &&
            franchisees.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="franchisee">
                  Локация <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.franchisee_id}
                  onValueChange={(value) => setFormData({ ...formData, franchisee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите локацию" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchisees.map((franchisee) => (
                      <SelectItem key={franchisee.id} value={franchisee.id}>
                        {franchisee.name} - {franchisee.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {franchisees.length === 1
                    ? "Будет создан в вашей локации автоматически"
                    : "Выберите локацию для сотрудника"}
                </p>
              </div>
            )}

          <div className="space-y-2">
            <Label htmlFor="telegram">Телеграм</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="telegram"
                value={formData.telegram_id}
                onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                placeholder="@username"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Краткое описание</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опыт работы, навыки, дополнительная информация..."
                className="pl-10 min-h-[80px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль (опционально)</Label>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Оставьте пустым для автогенерации"
            />
            <p className="text-xs text-muted-foreground">Если не указан, будет сгенерирован автоматически</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Создание..." : "Создать пользователя"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
