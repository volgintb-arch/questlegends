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
  Globe,
  Phone,
  ExternalLink,
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
  franchiseeName: string | null
  franchiseeCity: string | null
  isActive: boolean
  webhookUrl: string
  assignmentStrategy: string
  autoLeadCreation: boolean
  credentials: Record<string, string>
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
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

export function SocialIntegrationsAdmin() {
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
    } catch (error) {
      toast({ title: "Ошибка загрузки данных", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string, channel: string) => {
    if (!confirm(`Удалить интеграцию ${channelNames[channel]}? Это удалит все связанные сообщения и правила.`)) return

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

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/integrations/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
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

  // Group integrations: UK first, then by franchisee
  const ukIntegrations = integrations.filter((i) => i.ownerType === "uk")
  const franchiseeIntegrations = integrations.filter((i) => i.ownerType === "franchisee")

  // Group franchisee integrations by franchisee name
  const groupedByFranchisee = franchiseeIntegrations.reduce(
    (acc, i) => {
      const key = i.franchiseeName || i.ownerId || "Неизвестная"
      if (!acc[key]) acc[key] = { city: i.franchiseeCity, items: [] }
      acc[key].items.push(i)
      return acc
    },
    {} as Record<string, { city: string | null; items: Integration[] }>,
  )

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Интеграции</h1>
          <p className="text-xs text-muted-foreground">
            Подключение каналов для автоматического создания лидов в CRM
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} size="sm" className="h-8 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Подключить канал
        </Button>
      </div>

      {/* Connected channels summary */}
      {!isLoading && integrations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["telegram", "whatsapp", "instagram", "vk", "avito"].map((ch) => {
            const count = integrations.filter((i) => i.channel === ch).length
            if (count === 0) return null
            return (
              <Badge key={ch} variant="outline" className={`text-[10px] h-5 ${channelColors[ch]}`}>
                {channelNames[ch]}: {count}
              </Badge>
            )
          })}
        </div>
      )}

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
            Подключите Telegram, WhatsApp, Instagram, ВК или Авито для автоматического приема заявок
          </p>
          <Button onClick={() => setShowWizard(true)} size="sm" className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Подключить первый канал
          </Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* UK Integrations */}
          {ukIntegrations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Управляющая компания
                </h2>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {ukIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onDelete={handleDelete}
                    onToggle={handleToggleActive}
                    onManageTriggers={setManagingTriggersFor}
                    onCopyWebhook={handleCopyWebhook}
                    isToggling={togglingId === integration.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Franchisee Integrations */}
          {Object.entries(groupedByFranchisee).map(([name, group]) => (
            <div key={name} className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {name} {group.city && `(${group.city})`}
              </h2>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {group.items.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onDelete={handleDelete}
                    onToggle={handleToggleActive}
                    onManageTriggers={setManagingTriggersFor}
                    onCopyWebhook={handleCopyWebhook}
                    isToggling={togglingId === integration.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wizard */}
      <IntegrationWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={fetchData}
        isAdmin={true}
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

// Sub-component: Integration Card
function IntegrationCard({
  integration,
  onDelete,
  onToggle,
  onManageTriggers,
  onCopyWebhook,
  isToggling,
}: {
  integration: Integration
  onDelete: (id: string, channel: string) => void
  onToggle: (id: string, currentActive: boolean) => void
  onManageTriggers: (id: string) => void
  onCopyWebhook: (url: string) => void
  isToggling: boolean
}) {
  const color = channelColors[integration.channel] || "text-foreground"
  const bg = channelBgColors[integration.channel] || ""

  return (
    <Card className={`p-3 border ${bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={color}>{channelIcons[integration.channel]}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {channelNames[integration.channel] || integration.channel}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isToggling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Switch
              checked={integration.isActive}
              onCheckedChange={() => onToggle(integration.id, integration.isActive)}
              className="scale-75"
            />
          )}
        </div>
      </div>

      {/* Status badges */}
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

      {/* Last message */}
      {integration.lastMessageAt && (
        <p className="text-[10px] text-muted-foreground mb-2">
          Последнее сообщение: {new Date(integration.lastMessageAt).toLocaleDateString("ru-RU")}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-1 pt-1 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onManageTriggers(integration.id)}
          className="h-6 text-[10px] px-1.5 flex-1"
        >
          <Zap className="w-2.5 h-2.5 mr-0.5" />
          Триггеры
        </Button>
        {integration.webhookUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyWebhook(integration.webhookUrl)}
            className="h-6 text-[10px] px-1.5"
          >
            <Copy className="w-2.5 h-2.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(integration.id, integration.channel)}
          className="h-6 text-[10px] px-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </Button>
      </div>
    </Card>
  )
}
