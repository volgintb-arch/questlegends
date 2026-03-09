"use client"

import type React from "react"
import { useState, useRef } from "react"
import { X, User, Phone, Mail, MessageCircle, Save, Camera, Lock, Eye, EyeOff, KeyRound } from "lucide-react"
import { PhoneInput } from "@/components/ui/phone-input"
import { useAuth } from "@/contexts/auth-context"

interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, getAuthHeaders, setUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    telegram_id: user.telegram_id || "",
  })
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl || "")
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [showPasswordModal, setShowPasswordModal] = useState(false)

  if (!isOpen) return null

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Можно загружать только изображения")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Максимальный размер файла 5 МБ")
      return
    }

    setAvatarUploading(true)
    setError("")

    try {
      const fd = new FormData()
      fd.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка загрузки")
      }

      const data = await res.json()
      setAvatarUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки файла")
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const payload: Record<string, any> = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        telegramId: formData.telegram_id,
      }

      if (avatarUrl !== (user.avatarUrl || "")) {
        payload.avatarUrl = avatarUrl || null
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения")
        return
      }

      setUser({
        ...user,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        telegram_id: formData.telegram_id,
        avatarUrl: avatarUrl || undefined,
      })
      setSuccess("Настройки сохранены")
      setTimeout(() => onClose(), 1000)
    } catch {
      setError("Ошибка сети")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Настройки профиля</h2>
                <p className="text-xs text-muted-foreground">Обновите ваши личные данные</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-2xl">
                    {formData.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera size={20} className="text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <p className="font-medium text-foreground">{formData.name}</p>
                <p className="text-sm text-muted-foreground">{user.role}</p>
                {avatarUploading && <p className="text-xs text-primary">Загрузка...</p>}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  {avatarUrl ? "Изменить фото" : "Загрузить фото"}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  Полное имя
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  placeholder="Введите ваше имя"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground" />
                  Телефон
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  placeholder="email@example.com"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <MessageCircle size={14} className="text-primary" />
                  Telegram ID
                </label>
                <input
                  type="text"
                  value={formData.telegram_id}
                  onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors mb-2"
                  placeholder="@username или ID"
                />
                <p className="text-xs text-muted-foreground">
                  Укажите ваш Telegram ID для получения уведомлений. Чтобы узнать ID, напишите боту @userinfobot
                </p>
              </div>
            </div>

            {/* Change Password Button */}
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <KeyRound size={16} className="text-muted-foreground" />
              Изменить пароль
            </button>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 p-5 border-t border-border">
            {error && <span className="text-sm text-red-500 sm:mr-auto">{error}</span>}
            {success && <span className="text-sm text-green-500 sm:mr-auto">{success}</span>}
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-muted/50 rounded-lg transition-colors text-sm text-foreground"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user, getAuthHeaders } = useAuth()
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChangePassword = async () => {
    setError("")
    setSuccess("")

    if (!passwordData.currentPassword) {
      setError("Введите текущий пароль")
      return
    }
    if (passwordData.newPassword.length < 8) {
      setError("Новый пароль должен быть не менее 8 символов")
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          password: passwordData.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Ошибка смены пароля")
        return
      }
      setSuccess("Пароль успешно изменён")
      setTimeout(() => onClose(), 1500)
    } catch {
      setError("Ошибка сети")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="text-base font-bold text-foreground">Смена пароля</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Текущий пароль</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors pr-10"
                placeholder="Введите текущий пароль"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Новый пароль</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors pr-10"
                placeholder="Минимум 8 символов"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Подтвердите пароль</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors pr-10"
                placeholder="Повторите новый пароль"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-5 border-t border-border">
          {error && <span className="text-sm text-red-500">{error}</span>}
          {success && <span className="text-sm text-green-500">{success}</span>}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-muted/50 rounded-lg transition-colors text-sm text-foreground"
            >
              Отмена
            </button>
            <button
              onClick={handleChangePassword}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              <Lock size={14} />
              {isSaving ? "Сохранение..." : "Сменить пароль"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
