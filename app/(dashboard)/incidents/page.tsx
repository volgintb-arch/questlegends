"use client"

import { useState } from "react"
import { IncidentsList } from "@/components/incidents-list"
import { IncidentModal } from "@/components/incident-modal"
import { useAuth } from "@/contexts/auth-context"
import { usePersonnel } from "@/hooks/use-personnel"
import type { Incident } from "@/lib/types"

export default function IncidentsPage() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | undefined>()

  const currentLocationId =
    user?.role === "uk" || user?.role === "uk_employee" || user?.role === "super_admin"
      ? ""
      : user?.franchiseeIds?.[0] || ""

  const { data: personnelData } = usePersonnel({
    locationId: currentLocationId,
    status: "active",
  })

  const personnel = personnelData?.data || []

  const handleCreateIncident = () => {
    setSelectedIncident(undefined)
    setIsModalOpen(true)
  }

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident)
    setIsModalOpen(true)
  }

  return (
    <div className="p-6">
      <IncidentsList
        locationId={currentLocationId}
        onCreateIncident={handleCreateIncident}
        onViewIncident={handleViewIncident}
      />

      {isModalOpen && (
        <IncidentModal
          incident={selectedIncident}
          locationId={currentLocationId}
          personnel={personnel}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
