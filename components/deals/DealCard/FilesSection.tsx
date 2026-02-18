"use client"

import type React from "react"
import { FileText, Plus, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DealFile } from "./types"

interface FilesSectionProps {
  files: DealFile[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDownloadFile: (fileId: string, fileName: string) => void
  onDeleteFile: (fileId: string) => void
}

export function FilesSection({ files, fileInputRef, onDownloadFile, onDeleteFile }: FilesSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1">
          <FileText size={12} />
          Файлы ({files.length})
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus size={12} className="mr-1" />
          Добавить
        </Button>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
            <FileText size={12} className="text-muted-foreground" />
            <span className="flex-1 truncate">{file.name}</span>
            <button
              onClick={() => onDownloadFile(file.id, file.name)}
              className="hover:text-primary"
              title="Скачать"
            >
              <Download size={12} />
            </button>
            <button
              onClick={() => onDeleteFile(file.id)}
              className="hover:text-destructive"
              title="Удалить"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
