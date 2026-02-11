"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

interface SocialConfig {
  id: string
  platform: string
  franchiseeId: string | null
  isGlobal: boolean
  isEnabled: boolean
  apiKey?: string
  apiSecret?: string
  webhookUrl?: string
  accessToken?: string
  pageId?: string
  botToken?: string
  accountUsername?: string
  notes?: string
}

interface Franchisee {
  id: string
  name: string
  city: string
}

interface SocialIntegrationModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  config: SocialConfig | null
  franchisees: Franchisee[]
  isAdmin: boolean
}

const platforms = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "vk", label: "ВКонтакте" },
  { value: "avito", label: "Авито" },
]

export function SocialIntegrationModal({
  open,
  onClose,
  onSuccess,
  config,
  franchisees,
  isAdmin,
}: SocialIntegrationModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    platform: "",
    franchiseeId: user?.franchiseeId || "",
    isGlobal: false,
    isEnabled: true,
    apiKey: "",
    apiSecret: "",
    webhookUrl: "",
    accessToken: "",
    pageId: "",
    botToken: "",
    accountUsername: "",
    notes: "",
  })

  useEffect(() => {
    if (config) {
      setFormData({
        platform: config.platform,
        franchiseeId: config.franchiseeId || "",
        isGlobal: config.isGlobal,
        isEnabled: config.isEnabled,
        apiKey: config.apiKey || "",
        apiSecret: config.apiSecret || "",
        webhookUrl: config.webhookUrl || "",
        accessToken: config.accessToken || "",
        pageId: config.pageId || "",
        botToken: config.botToken || "",
        accountUsername: config.accountUsername || "",
        notes: config.notes || "",
      })
    } else {
      setFormData({
        platform: "",
        franchiseeId: user?.franchiseeId || "",
        isGlobal: false,
        isEnabled: true,
        apiKey: "",
        apiSecret: "",
        webhookUrl: "",
        accessToken: "",
        pageId: "",
        botToken: "",
        accountUsername: "",
        notes: "",
      })
    }
  }, [config, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = config ? `/api/social-integrations/${config.id}` : "/api/social-integrations"
      const method = config ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast({ title: config ? "Интеграция обновлена" : "Интеграция создана" })
        onSuccess()
      } else {
        const error = await res.json()
        toast({ title: "Ошибка", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("[v0] Error saving config:", error)
      toast({ title: "Ошибка сохранения", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? "Редактировать интеграцию" : "Добавить интеграцию"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Платформа</Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => setFormData({ ...formData, platform: value })}
              disabled={!!config}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите платформу" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="isGlobal">Глобальная интеграция для УК</Label>
                <Switch
                  id="isGlobal"
                  checked={formData.isGlobal}
                  onCheckedChange={(checked) => setFormData({ ...formData, isGlobal: checked })}
                />
              </div>

              {!formData.isGlobal && (
                <div className="space-y-2">
                  <Label htmlFor="franchiseeId">Франшиза</Label>
                  <Select
                    value={formData.franchiseeId}
                    onValueChange={(value) => setFormData({ ...formData, franchiseeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите франшизу" />
                    </SelectTrigger>
                    <SelectContent>
                      {franchisees.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.city} - {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="isEnabled">Включена</Label>
            <Switch
              id="isEnabled"
              checked={formData.isEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountUsername">Имя аккаунта</Label>
            <Input
              id="accountUsername"
              value={formData.accountUsername}
              onChange={(e) => setFormData({ ...formData, accountUsername: e.target.value })}
              placeholder="@username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API ключ</Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="API ключ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">API секрет</Label>
            <Input
              id="apiSecret"
              type="password"
              value={formData.apiSecret}
              onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
              placeholder="API секрет"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder="Access Token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token (Telegram)</Label>
            <Input
              id="botToken"
              type="password"
              value={formData.botToken}
              onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
              placeholder="Bot Token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pageId">Page ID (Facebook/Instagram)</Label>
            <Input
              id="pageId"
              value={formData.pageId}
              onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
              placeholder="Page ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.platform}>
              {isSubmitting ? "Сохранение..." : config ? "Обновить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
