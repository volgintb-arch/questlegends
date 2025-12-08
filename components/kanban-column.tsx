"use client"

import { Droppable, Draggable } from "@hello-pangea/dnd"
import { KanbanCard } from "./kanban-card"

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  priority?: "high" | "normal"
  participants?: number
  package?: string
  staff?: string[]
  clientName?: string
  clientPhone?: string
  stage?: string
  stageId?: string
}

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  deals: Deal[]
  onViewDeal?: (dealId: string) => void
}

export function KanbanColumn({ id, title, color, deals, onViewDeal }: KanbanColumnProps) {
  if (!id) {
    return null
  }

  const validDeals = deals.filter((deal) => deal && deal.id)

  return (
    <Droppable droppableId={String(id)}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col bg-muted/30 rounded-lg p-2 min-w-56 w-56 border-2 transition-colors ${
            snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-transparent"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color || "#6B7280" }} />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-foreground truncate">{title || "Без названия"}</h3>
              <p className="text-[10px] text-muted-foreground">{validDeals.length} сделок</p>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {validDeals.map((deal, index) => (
              <Draggable key={String(deal.id)} draggableId={String(deal.id)} index={index}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    <KanbanCard
                      index={index}
                      {...deal}
                      status={title?.toLowerCase() as any}
                      onView={onViewDeal ? () => onViewDeal(deal.id) : undefined}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}
