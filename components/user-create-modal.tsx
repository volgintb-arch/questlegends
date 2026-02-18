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
import { User, Phone, FileText, MapPin } from "lucide-react"
import { RF_CITIES } from "@/lib/constants/rf-cities"

interface UserCreateModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UserCreateModal({ open, onClose, onSuccess }: UserCreateModalProps) {
  const { user: currentUser, getAccessibleFranchisees, getAuthHeaders } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "" as UserRole | "",
    description: "",
    franchisee_id: "",
    password: "",
    city: "",
  })

  const availableRoles: Array<{ value: string; label: string }> = []

  if (currentUser.role === "uk" || currentUser.role === "super_admin") {
    // UK Owner может создавать все подчинённые роли
    availableRoles.push(
      { value: "franchisee", label: "Франчайзи" },
      { value: "own_point", label: "Собственная Точка" },
      { value: "uk_employee", label: "Сотрудник УК" },
    )
  } else if (currentUser.role === "franchisee" || currentUser.role === "own_point") {
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

    console.log("[v0] User create form submitted")
    console.log("[v0] Form data:", formData)
    console.log("[v0] Current user:", currentUser)

    if (!formData.name || !formData.phone || !formData.role) {
      console.log("[v0] Validation failed: missing required fields")
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      })
      return
    }

    if ((formData.role === "franchisee" || formData.role === "own_point") && !formData.city) {
      console.log("[v0] Validation failed: missing city for franchisee/own_point")
      toast({
        title: "Ошибка",
        description: "Укажите город",
        variant: "destructive",
      })
      return
    }

    if (
      ["admin", "animator", "host", "dj"].includes(formData.role) &&
      !formData.franchisee_id &&
      !currentUser?.franchiseeId
    ) {
      console.log("[v0] Validation failed: missing franchisee for employee role")
      console.log("[v0] formData.franchisee_id:", formData.franchisee_id)
      console.log("[v0] currentUser.franchiseeId:", currentUser?.franchiseeId)
      toast({
        title: "Ошибка",
        description: "Укажите локацию для создания сотрудника",
        variant: "destructive",
      })
      return
    }

    const password = formData.password || generatePassword()
    console.log("[v0] Validation passed, sending request...")

    setIsLoading(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          description: formData.description,
          password: password,
          franchiseeId:
            formData.franchisee_id ||
            (["admin", "animator", "host", "dj"].includes(formData.role) ? currentUser?.franchiseeId : undefined),
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
      description: "",
      franchisee_id: "",
      password: "",
      city: "",
    })
  }

  const getModalTitle = () => {
    if (currentUser.role === "uk" || currentUser.role === "super_admin") {
      return "Создать франчайзи, собственную точку или сотрудника УК"
    }
    if (currentUser.role === "franchisee" || currentUser.role === "own_point") {
      return "Создать администратора или сотрудника"
    }
    if (currentUser.role === "admin") {
      return "Создать сотрудника"
    }
    return "Создать пользователя"
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{getModalTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">
              ФИО <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иван Иванов"
                className="pl-7 h-8 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs">
              Номер телефона <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="pl-7 h-8 text-xs"
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Будет использоваться как логин</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="role" className="text-xs">
              Роль <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value} className="text-xs">
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(currentUser.role === "uk" || currentUser.role === "super_admin") &&
            (formData.role === "franchisee" || formData.role === "own_point") && (
              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs">
                  Город <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
                  <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                    <SelectTrigger className="pl-7 h-8 text-xs">
                      <SelectValue placeholder="Выберите город" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {RF_CITIES.map((city) => (
                        <SelectItem key={city} value={city} className="text-xs">
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === "own_point" && (
                  <p className="text-[10px] text-blue-500">Собственная точка не платит роялти</p>
                )}
              </div>
            )}

          {(currentUser.role === "franchisee" || currentUser.role === "own_point") &&
            ["admin", "animator", "host", "dj"].includes(formData.role) &&
            franchisees.length > 1 && (
              <div className="space-y-1">
                <Label htmlFor="franchisee" className="text-xs">
                  Локация <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.franchisee_id}
                  onValueChange={(value) => setFormData({ ...formData, franchisee_id: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Выберите локацию" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchisees.map((franchisee) => (
                      <SelectItem key={franchisee.id} value={franchisee.id} className="text-xs">
                        {franchisee.name} - {franchisee.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">
              Описание
            </Label>
            <div className="relative">
              <FileText className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация..."
                className="pl-7 min-h-[60px] text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">
              Пароль
            </Label>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Автогенерация если пусто"
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-8 text-xs bg-transparent"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading} className="h-8 text-xs">
              {isLoading ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
