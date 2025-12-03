"use client"

import { Droppable } from "@hello-pangea/dnd"
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
}

interface KanbanColumnProps {
  stage: string
  deals: Deal[]
  dealCount: number
  onEditDeal: (deal: Deal) => void
  onViewDeal?: (deal: Deal) => void
}

export function KanbanColumn({ stage, deals, dealCount, onEditDeal, onViewDeal }: KanbanColumnProps) {
  return (
    <Droppable droppableId={stage}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col bg-muted/30 rounded-lg p-4 min-w-80 border-2 transition-colors ${
            snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-transparent"
          }`}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">{stage}</h3>
            <p className="text-sm text-muted-foreground">{dealCount} сделок</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-96">
            {deals.map((deal, index) => (
              <KanbanCard
                key={deal.id}
                index={index}
                {...deal}
                status={stage.toLowerCase() as any}
                onEdit={() => onEditDeal(deal)}
                onView={onViewDeal ? () => onViewDeal(deal) : undefined}
              />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}
