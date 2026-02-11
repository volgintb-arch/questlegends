"use client"

import { CheckSquare, Plus, Clock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { DealTask } from "./types"
import { formatDate } from "./types"

interface TasksSectionProps {
  tasks: DealTask[]
  onAddTask: () => void
  onTaskComplete: (taskId: string) => void
  onOpenTaskDetails: (task: DealTask) => void
  onDeleteTask: (taskId: string) => void
}

export function TasksSection({ tasks, onAddTask, onTaskComplete, onOpenTaskDetails, onDeleteTask }: TasksSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1">
          <CheckSquare size={12} />
          Задачи ({tasks.length})
        </h3>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onAddTask}>
          <Plus size={12} className="mr-1" />
          Добавить
        </Button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs hover:bg-muted/50 cursor-pointer group"
            onClick={() => onOpenTaskDetails(task)}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => onTaskComplete(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-3 w-3 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</p>
              {task.assigneeName && <p className="text-[10px] text-muted-foreground">{task.assigneeName}</p>}
              {task.deadline && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(task.deadline)}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteTask(task.id)
              }}
            >
              <Trash2 size={12} className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
