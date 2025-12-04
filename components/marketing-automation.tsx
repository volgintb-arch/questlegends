"use client"

import { useState, useEffect } from "react"
import { Send, Plus, BarChart, Edit, Trash2, Power, PowerOff } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { MarketingCampaign } from "@/lib/types"

export function MarketingAutomation() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/marketing-campaigns")
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const campaignTypes = [
    { value: "post_game", label: "После игры" },
    { value: "birthday", label: "День рождения" },
    { value: "follow_up", label: "Напоминание" },
    { value: "reminder", label: "Повторный контакт" },
    { value: "review_request", label: "Запрос отзыва" },
  ]

  const getTypeLabel = (type: string) => {
    return campaignTypes.find((t) => t.value === type)?.label || type
  }

  const toggleCampaign = async (id: string) => {
    try {
      const campaign = campaigns.find((c) => c.id === id)
      if (!campaign) return

      const response = await fetch(`/api/marketing-campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !campaign.is_active }),
      })

      if (response.ok) {
        setCampaigns(campaigns.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c)))
      }
    } catch (error) {
      console.error("[v0] Error toggling campaign:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка кампаний...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Маркетинговая Автоматизация</h2>
          <p className="text-sm text-muted-foreground">Автоматические рассылки и уведомления клиентам</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Новая кампания
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.sent_count, 0)}</div>
              <p className="text-sm text-muted-foreground">Отправлено</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.opened_count, 0)}</div>
              <p className="text-sm text-muted-foreground">Открыто</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.clicked_count, 0)}</div>
              <p className="text-sm text-muted-foreground">Клики</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Power className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {campaigns.filter((c) => c.is_active).length}/{campaigns.length}
              </div>
              <p className="text-sm text-muted-foreground">Активные</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="p-8 text-center">
            <Send size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Нет кампаний</h3>
            <p className="text-muted-foreground">Создайте первую маркетинговую кампанию</p>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <Badge variant="secondary">{getTypeLabel(campaign.type)}</Badge>
                    {campaign.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Активна</Badge>
                    ) : (
                      <Badge variant="secondary">Неактивна</Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{campaign.message_template}</p>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Отправлено</p>
                      <p className="text-lg font-semibold">{campaign.sent_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Открываемость</p>
                      <p className="text-lg font-semibold">
                        {campaign.sent_count > 0 ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) : 0}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CTR</p>
                      <p className="text-lg font-semibold">
                        {campaign.opened_count > 0
                          ? ((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleCampaign(campaign.id)}>
                    {campaign.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCampaign(campaign)
                      setIsModalOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
