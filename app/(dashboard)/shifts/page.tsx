"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { ShiftsCalendar } from "@/components/shifts-calendar"
import { ShiftModal } from "@/components/shift-modal"
import { useAuth } from "@/contexts/auth-context"
import { usePersonnel } from "@/hooks/use-personnel"
import type { Shift } from "@/lib/types"

export default function ShiftsPage() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>()
  const [selectedDate, setSelectedDate] = useState<Date>()

  // Get current location based on user role
  const currentLocationId = user?.role === "uk" ? "" : user?.franchiseeIds?.[0] || ""

  const { data: personnelData } = usePersonnel({
    locationId: currentLocationId,
    status: "active",
  })

  const personnel = personnelData?.data || []

  const handleCreateShift = () => {
    setSelectedShift(undefined)
    setSelectedDate(new Date())
    setIsModalOpen(true)
  }

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift)
    setIsModalOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Графики смен</h1>
          <p className="text-muted-foreground">Управление расписанием персонала</p>
        </div>
      </div>

      <ShiftsCalendar locationId={currentLocationId} onCreateShift={handleCreateShift} onEditShift={handleEditShift} />

      {isModalOpen && (
        <ShiftModal
          shift={selectedShift}
          personnel={personnel}
          locationId={currentLocationId}
          onClose={() => setIsModalOpen(false)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  )
}
