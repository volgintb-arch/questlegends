"use client"

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { GameKanbanCard } from "./game-kanban-card"

interface GameLead {
  id: string
  clientName: string
  clientPhone?: string
  gameDate?: string
  gameTime?: string
  playersCount: number
  packagePrice?: number
  totalAmount: number
  prepayment: number
  status?: string
  stageId?: string
  responsibleName?: string
}

interface Stage {
  id: string
  name: string
  color: string
  order: number
}

interface GameKanbanBoardProps {
  stages: Stage[]
  boardData: Record<string, GameLead[]>
  onLeadClick: (lead: GameLead) => void
  onLeadMove: (leadId: string, newStageId: string) => void
}

export function GameKanbanBoard({ stages, boardData, onLeadClick, onLeadMove }: GameKanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    onLeadMove(draggableId, destination.droppableId)
  }

  const sortedStages = Array.isArray(stages) ? [...stages].sort((a, b) => a.order - b.order) : []
  const safeBoard = boardData || {}

  if (sortedStages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Нет доступных этапов</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-3">
        <div className="flex gap-3 h-full min-w-max">
          {sortedStages.map((stage) => {
            const games = safeBoard[stage.id] || []
            const validGames = games.filter((g) => g && g.id)
            const stageTotal = validGames.reduce((sum, g) => sum + (g.totalAmount || 0), 0)

            return (
              <div key={stage.id} className="w-64 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg">
                <div className="p-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || "#6B7280" }} />
                      <span className="text-xs font-medium">{stage.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {validGames.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{stageTotal.toLocaleString()} ₽</div>
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
                      {validGames.map((game, index) => (
                        <Draggable key={game.id} draggableId={game.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onLeadClick(game)}
                              className={`cursor-pointer ${snapshot.isDragging ? "opacity-70" : ""}`}
                            >
                              <GameKanbanCard game={game} />
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
