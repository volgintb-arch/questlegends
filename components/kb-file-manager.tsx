"use client"

import type React from "react"

import { useState } from "react"
import { Upload, File, Trash2, Download } from "lucide-react"

interface KBFile {
  id: string
  name: string
  size: string
  type: string
  uploadedAt: string
}

interface KBFileManagerProps {
  articleId: string
  files: KBFile[]
  onFileAdd: (file: KBFile) => void
  onFileDelete: (fileId: string) => void
}

export function KBFileManager({ articleId, files, onFileAdd, onFileDelete }: KBFileManagerProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // Simulate file upload
    setTimeout(() => {
      const newFile: KBFile = {
        id: `FILE-${Date.now()}`,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        type: file.type || "unknown",
        uploadedAt: new Date().toISOString(),
      }
      onFileAdd(newFile)
      setIsUploading(false)
    }, 500)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Прикрепленные файлы</h4>

        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
          <Upload size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isUploading ? "Загрузка..." : "Нажмите или перетащите файл"}
          </span>
          <input type="file" onChange={handleFileSelect} disabled={isUploading} className="hidden" />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <File size={18} className="text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Скачать">
                  <Download size={16} />
                </button>
                <button
                  onClick={() => onFileDelete(file.id)}
                  className="p-1 text-muted-foreground hover:text-accent transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
