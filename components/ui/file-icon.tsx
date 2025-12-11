import { File, FileText, ImageIcon, Video, Music, Archive, Code, FileSpreadsheet } from "lucide-react"
import type { LucideProps } from "lucide-react"

interface FileIconProps extends LucideProps {
  filename?: string
  mimeType?: string
}

export function FileIcon({ filename, mimeType, ...props }: FileIconProps) {
  // Определяем тип файла по расширению или MIME-типу
  const getIconByType = () => {
    const ext = filename?.toLowerCase().split(".").pop()

    // Изображения
    if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext || "")) {
      return <ImageIcon {...props} />
    }

    // Видео
    if (mimeType?.startsWith("video/") || ["mp4", "webm", "avi", "mov", "mkv"].includes(ext || "")) {
      return <Video {...props} />
    }

    // Аудио
    if (mimeType?.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac"].includes(ext || "")) {
      return <Music {...props} />
    }

    // PDF и документы
    if (mimeType?.includes("pdf") || ext === "pdf") {
      return <FileText {...props} />
    }

    // Таблицы
    if (mimeType?.includes("spreadsheet") || ["xlsx", "xls", "csv"].includes(ext || "")) {
      return <FileSpreadsheet {...props} />
    }

    // Архивы
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
      return <Archive {...props} />
    }

    // Код
    if (["js", "ts", "jsx", "tsx", "html", "css", "json", "py", "java", "cpp", "c"].includes(ext || "")) {
      return <Code {...props} />
    }

    // По умолчанию
    return <File {...props} />
  }

  return getIconByType()
}
