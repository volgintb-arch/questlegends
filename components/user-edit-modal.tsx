"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Eye, EyeOff } from "lucide-react"

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onUpdated: () => void
}

export function UserEditModal({ isOpen, onClose, user, onUpdated }: UserEditModalProps) {
  const { user: currentUser, getAuthHeaders } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "",
    isActive: true,
    password: "",
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        role: user.role || "",
        isActive: user.isActive ?? true,
        password: "", // Reset password on user change
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        isActive: formData.isActive,
      }

      if (formData.password.trim()) {
        payload.password = formData.password
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onUpdated()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || "Ошибка при обновлении")
      }
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      alert("Ошибка при обновлении пользователя")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleOptions = () => {
    if (currentUser?.role === "super_admin") {
      return [
        { value: "uk", label: "Директор УК" },
        { value: "uk_employee", label: "Сотрудник УК" },
        { value: "franchisee", label: "Франчайзи" },
        { value: "admin", label: "Администратор" },
        { value: "employee", label: "Сотрудник" },
        { value: "animator", label: "Аниматор" },
        { value: "host", label: "Ведущий" },
        { value: "dj", label: "DJ" },
      ]
    } else if (currentUser?.role === "uk") {
      return [
        { value: "uk_employee", label: "Сотрудник УК" },
        { value: "franchisee", label: "Франчайзи" },
      ]
    } else if (currentUser?.role === "franchisee") {
      return [
        { value: "admin", label: "Администратор" },
        { value: "employee", label: "Сотрудник" },
        { value: "animator", label: "Аниматор" },
        { value: "host", label: "Ведущий" },
        { value: "dj", label: "DJ" },
      ]
    }
    return []
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Редактирование пользователя</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Имя</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Телефон</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Новый пароль (оставьте пустым, чтобы не менять)</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-8 text-xs pr-8"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Роль</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getRoleOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Статус</Label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onValueChange={(v) => setFormData({ ...formData, isActive: v === "active" })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="text-xs">
                  Активен
                </SelectItem>
                <SelectItem value="inactive" className="text-xs">
                  Неактивен
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-8 text-xs bg-transparent">
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 h-8 text-xs">
              {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
