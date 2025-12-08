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
  onViewDeal?: (deal: Deal) => void
  stageColor?: string
}

export function KanbanColumn({ stage, deals, dealCount, onViewDeal, stageColor = "#6B7280" }: KanbanColumnProps) {
  return (
    <Droppable droppableId={stage}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col bg-muted/30 rounded-lg p-2 min-w-56 border-2 transition-colors ${
            snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-transparent"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }} />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-foreground truncate">{stage}</h3>
              <p className="text-[10px] text-muted-foreground">{dealCount} сделок</p>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
            {deals.map((deal, index) => (
              <KanbanCard
                key={deal.id}
                index={index}
                {...deal}
                status={stage.toLowerCase() as any}
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
