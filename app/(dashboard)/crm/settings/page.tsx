"use client"

import { PipelineSettings } from "@/components/pipeline-settings"

export default function CRMSettingsPage() {
  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-base font-semibold mb-4">Настройки CRM</h1>
      <PipelineSettings />
    </div>
  )
}
