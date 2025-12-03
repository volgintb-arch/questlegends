"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Grip, Clock, AlertCircle, Edit2, User, Eye } from "lucide-react"

interface KanbanCardProps {
  id: string
  index: number
  title: string
  location: string
  amount: string
  daysOpen: number
  status: "lead" | "negotiation" | "proposal" | "signed"
  priority?: "high" | "normal"
  participants?: number
  package?: string
  staff?: string[]
  onEdit?: () => void
  onView?: () => void
}

export function KanbanCard({
  id,
  index,
  title,
  location,
  amount,
  daysOpen,
  status,
  priority,
  participants,
  package: packageType,
  staff,
  onEdit,
  onView,
}: KanbanCardProps) {
  const priorityColor = priority === "high" ? "border-accent" : "border-border"

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-card border-l-4 ${priorityColor} rounded-lg p-4 cursor-grab hover:shadow-lg transition-shadow group ${
            snapshot.isDragging ? "shadow-2xl rotate-2 scale-105" : ""
          }`}
        >
          <div className="flex items-start gap-2 mb-3">
            <Grip size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
              <p className="text-xs text-muted-foreground">{location}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onView && (
                <button onClick={onView} className="p-1 text-muted-foreground hover:text-primary" title="Подробно">
                  <Eye size={14} />
                </button>
              )}
              {onEdit && (
                <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-primary" title="Редактировать">
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary">{amount}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{id}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={14} />
              <span>{daysOpen} дн. в работе</span>
            </div>

            {participants && (
              <div className="text-xs text-muted-foreground">
                <span>{participants} участников</span>
                {packageType && <span className="ml-2 text-primary">• {packageType}</span>}
              </div>
            )}
          </div>

          {priority === "high" && (
            <div className="flex items-center gap-1 text-xs text-accent">
              <AlertCircle size={14} />
              <span>Приоритет</span>
            </div>
          )}

          {staff && staff.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User size={14} />
                <span className="truncate">{staff.join(", ")}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}
