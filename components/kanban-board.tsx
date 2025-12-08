"use client"

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { DealKanbanCard } from "./deal-kanban-card"

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  clientName?: string
  clientPhone?: string
  stageId?: string
}

interface Stage {
  id: string
  name: string
  color: string
  order: number
}

interface KanbanBoardProps {
  stages: Stage[]
  boardData: Record<string, Deal[]>
  onDragEnd: (sourceId: string, destId: string, dealId: string, sourceIndex: number, destIndex: number) => void
  onViewDeal: (dealId: string) => void
}

export function KanbanBoard({ stages, boardData, onDragEnd, onViewDeal }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    onDragEnd(source.droppableId, destination.droppableId, draggableId, source.index, destination.index)
  }

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-3">
        <div className="flex gap-3 h-full min-w-max">
          {sortedStages.map((stage) => {
            const deals = boardData[stage.id] || []
            const validDeals = deals.filter((d) => d && d.id)

            return (
              <div key={stage.id} className="w-64 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg">
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || "#6B7280" }} />
                    <span className="text-xs font-medium">{stage.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {validDeals.length}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      }`}
                    >
                      {validDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onViewDeal(deal.id)}
                              className={`cursor-pointer ${snapshot.isDragging ? "opacity-70" : ""}`}
                            >
                              <DealKanbanCard deal={deal} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </div>
    </DragDropContext>
  )
}
