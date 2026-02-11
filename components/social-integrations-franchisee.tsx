"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Send,
  Instagram,
  MessageCircle,
  ShoppingBag,
  Trash2,
  Zap,
  Phone,
  Copy,
  Power,
  Loader2,
} from "lucide-react"
import { IntegrationWizard } from "@/components/integration-wizard"
import { TriggerManagementModal } from "@/components/trigger-management-modal"

interface Integration {
  id: string
  channel: string
  ownerType: string
  ownerId: string | null
  isActive: boolean
  webhookUrl: string
  assignmentStrategy: string
  autoLeadCreation: boolean
  credentials: Record<string, string>
  lastMessageAt: string | null
  createdAt: string
}

const channelIcons: Record<string, React.ReactNode> = {
  telegram: <Send className="w-5 h-5" />,
  whatsapp: <Phone className="w-5 h-5" />,
  instagram: <Instagram className="w-5 h-5" />,
  vk: <MessageCircle className="w-5 h-5" />,
  avito: <ShoppingBag className="w-5 h-5" />,
}

const channelNames: Record<string, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  vk: "ВКонтакте",
  avito: "Авито",
}

const channelColors: Record<string, string> = {
  telegram: "text-[#26A5E4]",
  whatsapp: "text-[#25D366]",
  instagram: "text-[#E4405F]",
  vk: "text-[#4680C2]",
  avito: "text-[#00AAFF]",
}

const channelBgColors: Record<string, string> = {
  telegram: "border-[#26A5E4]/20 bg-[#26A5E4]/5",
  whatsapp: "border-[#25D366]/20 bg-[#25D366]/5",
  instagram: "border-[#E4405F]/20 bg-[#E4405F]/5",
  vk: "border-[#4680C2]/20 bg-[#4680C2]/5",
  avito: "border-[#00AAFF]/20 bg-[#00AAFF]/5",
}

export function SocialIntegrationsFranchisee() {
  const { getAuthHeaders } = useAuth()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [managingTriggersFor, setManagingTriggersFor] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/integrations", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations || [])
      }
    } catch {
      toast({ title: "Ошибка загрузки данных", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string, channel: string) => {
    if (!confirm(`Удалить интеграцию ${channelNames[channel]}?`)) return
    try {
      const res = await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        toast({ title: `${channelNames[channel]} удалён` })
        fetchData()
      } else {
        const error = await res.json()
        toast({ title: "Ошибка", description: error.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" })
    }
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/integrations/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      if (res.ok) {
        setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: !currentActive } : i)))
        toast({ title: !currentActive ? "Интеграция включена" : "Интеграция отключена" })
      }
    } catch {
      toast({ title: "Ошибка", variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "Webhook URL скопирован" })
  }

  // Which channels are already connected?
  const connectedChannels = new Set(integrations.map((i) => i.channel))
  const allChannels = ["telegram", "whatsapp", "instagram", "vk", "avito"]
  const availableChannels = allChannels.filter((ch) => !connectedChannels.has(ch))

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Интеграции</h1>
          <p className="text-xs text-muted-foreground">
            Подключите каналы для автоматического приема заявок в CRM
          </p>
        </div>
        {availableChannels.length > 0 && (
          <Button onClick={() => setShowWizard(true)} size="sm" className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Подключить канал
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : integrations.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Нет подключенных каналов</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Подключите Telegram, WhatsApp, Instagram, ВК или Авито
          </p>
          <Button onClick={() => setShowWizard(true)} size="sm" className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Подключить первый канал
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const color = channelColors[integration.channel] || "text-foreground"
            const bg = channelBgColors[integration.channel] || ""

            return (
              <Card key={integration.id} className={`p-3 border ${bg}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={color}>{channelIcons[integration.channel]}</span>
                    <h3 className="text-sm font-semibold text-foreground">
                      {channelNames[integration.channel]}
                    </h3>
                  </div>
                  {togglingId === integration.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Switch
                      checked={integration.isActive}
                      onCheckedChange={() => handleToggle(integration.id, integration.isActive)}
                      className="scale-75"
                    />
                  )}
                </div>

                {/* Status */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {integration.isActive ? (
                    <Badge variant="default" className="text-[9px] h-4 bg-[#25D366] text-[#000]">
                      <Power className="w-2 h-2 mr-0.5" />
                      Активна
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] h-4">
                      Отключена
                    </Badge>
                  )}
                  {integration.autoLeadCreation && (
                    <Badge variant="outline" className="text-[9px] h-4">
                      <Zap className="w-2 h-2 mr-0.5" />
                      Автолид
                    </Badge>
                  )}
                </div>

                {integration.lastMessageAt && (
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Последнее: {new Date(integration.lastMessageAt).toLocaleDateString("ru-RU")}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-1 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagingTriggersFor(integration.id)}
                    className="h-6 text-[10px] px-1.5 flex-1"
                  >
                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                    Триггеры
                  </Button>
                  {integration.webhookUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyWebhook(integration.webhookUrl)}
                      className="h-6 text-[10px] px-1.5"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(integration.id, integration.channel)}
                    className="h-6 text-[10px] px-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Wizard */}
      <IntegrationWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={fetchData}
        isAdmin={false}
      />

      {/* Trigger Management */}
      {managingTriggersFor && (
        <TriggerManagementModal
          open={!!managingTriggersFor}
          onClose={() => setManagingTriggersFor(null)}
          configId={managingTriggersFor}
        />
      )}
    </div>
  )
}
