"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SipuniSettings } from "@/components/sipuni-settings"
import { CallLog } from "@/components/call-log"
import { Phone, Settings } from "lucide-react"

export default function TelephonyPage() {
  const [tab, setTab] = useState("calls")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-primary-text">Телефония</h1>
        <p className="text-sm text-muted-foreground mt-1">IP-телефония Sipuni — звонки, записи, настройки</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="calls" className="gap-2">
            <Phone className="w-4 h-4" />
            Звонки
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="mt-4">
          <CallLog />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SipuniSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
