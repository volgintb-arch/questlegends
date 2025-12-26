"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Instagram,
  Facebook,
  MessageCircle,
  Youtube,
  Music,
  Send,
  Pencil,
  Trash2,
  Key,
  ListFilter,
} from "lucide-react"
import { SocialIntegrationModal } from "@/components/social-integration-modal"
import { TriggerManagementModal } from "@/components/trigger-management-modal"

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
  createdAt: string
  updatedAt: string
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  vk: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  tiktok: <Music className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
}

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  vk: "ВКонтакте",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  youtube: "YouTube",
}

export function SocialIntegrationsFranchisee() {
  const { user, getAuthHeaders } = useAuth()
  const [configs, setConfigs] = useState<SocialConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SocialConfig | null>(null)
  const [managingTriggersFor, setManagingTriggersFor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/integrations`, {
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        const data = await res.json()
        setConfigs(data.integrations || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching configs:", error)
      toast({ title: "Ошибка загрузки данных", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (configId: string) => {
    if (!confirm("Удалить эту интеграцию?")) return

    try {
      const res = await fetch(`/api/integrations/${configId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        toast({ title: "Интеграция удалена" })
        fetchConfigs()
      } else {
        const error = await res.json()
        toast({ title: "Ошибка", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("[v0] Error deleting config:", error)
      toast({ title: "Ошибка удаления", variant: "destructive" })
    }
  }

  const filteredConfigs = configs.filter((config) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const platformName = platformNames[config.platform]?.toLowerCase() || ""
    return platformName.includes(query)
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">Интеграции с соцсетями</h1>
          <p className="text-xs text-muted-foreground">Настройка получения лидов в CRM систему вашей франшизы</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-8 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Добавить интеграцию
        </Button>
      </div>

      <Input
        placeholder="Поиск по платформе..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8 text-xs"
      />

      {isLoading ? (
        <div className="text-center py-8 text-xs text-muted-foreground">Загрузка...</div>
      ) : filteredConfigs.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">
          {searchQuery ? "Не найдено интеграций" : "Нет настроенных интеграций"}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredConfigs.map((config) => (
            <Card key={config.id} className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {platformIcons[config.platform]}
                  <div>
                    <h3 className="text-sm font-semibold">{platformNames[config.platform]}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {config.isEnabled ? (
                        <Badge variant="default" className="text-[9px] h-4 bg-green-500">
                          Включена
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] h-4">
                          Отключена
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingConfig(config)}>
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setManagingTriggersFor(config.id)}
                  >
                    <ListFilter size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleDelete(config.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                {config.accountUsername && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Key size={10} />
                    <span>@{config.accountUsername}</span>
                  </div>
                )}
                {config.notes && <p className="text-[10px] text-muted-foreground">{config.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <SocialIntegrationModal
        open={showCreateModal || !!editingConfig}
        onClose={() => {
          setShowCreateModal(false)
          setEditingConfig(null)
        }}
        onSuccess={() => {
          fetchConfigs()
          setShowCreateModal(false)
          setEditingConfig(null)
        }}
        config={editingConfig}
        franchisees={[]}
        isAdmin={false}
      />

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
