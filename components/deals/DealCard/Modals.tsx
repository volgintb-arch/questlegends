"use client"

import { CalendarIcon, CheckCircle2, Circle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import type { DealTask, DealData, Employee } from "./types"
import { formatDate } from "./types"

// ---- Task Create Modal ----
interface TaskCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newTask: { title: string; description: string; assigneeId: string; deadline: string; type: string }
  setNewTask: (task: { title: string; description: string; assigneeId: string; deadline: string; type: string }) => void
  employees: Employee[]
  deadlineDate: Date | undefined
  setDeadlineDate: (date: Date | undefined) => void
  deadlineTime: string
  setDeadlineTime: (time: string) => void
  onCreateTask: () => void
  onClose: () => void
}

export function TaskCreateModal({
  open,
  onOpenChange,
  newTask,
  setNewTask,
  employees,
  deadlineDate,
  setDeadlineDate,
  deadlineTime,
  setDeadlineTime,
  onCreateTask,
  onClose,
}: TaskCreateModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setDeadlineDate(undefined)
          setDeadlineTime("12:00")
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Новая задача</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Тип задачи</Label>
            <Select value={newTask.type || "general"} onValueChange={(value) => setNewTask({ ...newTask, type: value })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Выберите тип задачи" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Общая задача</SelectItem>
                <SelectItem value="call">Звонок</SelectItem>
                <SelectItem value="meeting">Встреча</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="follow_up">Следующий шаг</SelectItem>
                <SelectItem value="document">Подготовка документов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Название</Label>
            <Input
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="h-8 text-xs"
              placeholder="Что нужно сделать?"
            />
          </div>
          <div>
            <Label className="text-xs">Описание</Label>
            <Textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="text-xs min-h-[60px]"
              placeholder="Подробности задачи..."
            />
          </div>
          <div>
            <Label className="text-xs">Исполнитель (сотрудник УК)</Label>
            <Select value={newTask.assigneeId} onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Выбрать сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Срок выполнения</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 text-xs flex-1 justify-start text-left font-normal bg-transparent">
                    <CalendarIcon size={12} className="mr-2" />
                    {deadlineDate ? format(deadlineDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadlineDate} onSelect={setDeadlineDate} locale={ru} initialFocus />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="h-8 text-xs w-24"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={onCreateTask}>
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- Task Details Modal ----
interface TaskDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: DealTask | null
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
}

export function TaskDetailsModal({ open, onOpenChange, task, onComplete, onDelete }: TaskDetailsModalProps) {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {task.completed ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : (
              <Circle size={16} className="text-muted-foreground" />
            )}
            Детали задачи
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Тип</Label>
            <p className="text-sm font-medium">
              {task.type === "call" && "Звонок"}
              {task.type === "meeting" && "Встреча"}
              {task.type === "email" && "Email"}
              {task.type === "follow_up" && "Следующий шаг"}
              {task.type === "document" && "Подготовка документов"}
              {(!task.type || task.type === "general") && "Общая задача"}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Название</Label>
            <p className="text-sm font-medium">{task.title}</p>
          </div>
          {task.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Описание</Label>
              <p className="text-sm">{task.description}</p>
            </div>
          )}
          {task.assigneeName && (
            <div>
              <Label className="text-xs text-muted-foreground">Исполнитель</Label>
              <p className="text-sm">{task.assigneeName}</p>
            </div>
          )}
          {task.deadline && (
            <div>
              <Label className="text-xs text-muted-foreground">Срок выполнения</Label>
              <p className="text-sm flex items-center gap-1">
                <CalendarIcon size={12} />
                {formatDate(task.deadline)}
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Статус</Label>
            <p className={`text-sm font-medium ${task.completed ? "text-green-600" : "text-orange-500"}`}>
              {task.completed ? "Выполнена" : "В работе"}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Дата создания</Label>
            <p className="text-sm">{formatDate(task.createdAt)}</p>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)}>
              <Trash2 size={12} className="mr-1" />
              Удалить
            </Button>
            <div className="flex gap-2">
              {!task.completed && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onComplete(task.id)
                    onOpenChange(false)
                  }}
                >
                  <CheckCircle2 size={12} className="mr-1" />
                  Выполнить
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- Delete Task Dialog ----
interface DeleteTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteTaskDialog({ open, onOpenChange, onConfirm, onCancel }: DeleteTaskDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить. Задача будет удалена безвозвратно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---- Delete Deal Dialog ----
interface DeleteDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealName: string
  onConfirm: () => void
}

export function DeleteDealDialog({ open, onOpenChange, dealName, onConfirm }: DeleteDealDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить сделку "{dealName}"? Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-500 hover:bg-red-600">
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
