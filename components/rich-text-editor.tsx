"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import { useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  Highlighter,
  Undo,
  Redo,
  Code,
} from "lucide-react"

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ inline: false, allowBase64: true }),
      Highlight.configure({ multicolor: false }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-3 focus:outline-none",
      },
      handlePaste: (view, event) => {
        // Разрешаем вставку из Word/Google Docs — TipTap обрабатывает HTML автоматически
        const html = event.clipboardData?.getData("text/html")
        if (html) {
          // TipTap's default paste handling preserves formatting
          return false
        }
        return false
      },
    },
    immediatelyRender: false,
  })

  const addImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !editor) return

      const formData = new FormData()
      formData.append("file", file)

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null
        const headers: Record<string, string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const response = await fetch("/api/upload", { method: "POST", body: formData, headers })
        if (response.ok) {
          const data = await response.json()
          const url = data.url || data.fileUrl
          editor.chain().focus().setImage({ src: url }).run()
        }
      } catch {
        // Fallback: base64
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") {
            editor.chain().focus().setImage({ src: reader.result }).run()
          }
        }
        reader.readAsDataURL(file)
      }

      e.target.value = ""
    },
    [editor],
  )

  const setLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt("Введите URL ссылки:", "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const ToolBtn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-muted/80 transition-colors ${active ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  )

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Жирный">
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив">
          <Italic size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Подчёркнутый">
          <UnderlineIcon size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Зачёркнутый">
          <Strikethrough size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Выделение">
          <Highlighter size={15} />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Заголовок 1">
          <Heading1 size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Заголовок 2">
          <Heading2 size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок 3">
          <Heading3 size={15} />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Маркированный список">
          <List size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный список">
          <ListOrdered size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Цитата">
          <Quote size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Код">
          <Code size={15} />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="По левому краю">
          <AlignLeft size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="По центру">
          <AlignCenter size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="По правому краю">
          <AlignRight size={15} />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={setLink} active={editor.isActive("link")} title="Ссылка">
          <LinkIcon size={15} />
        </ToolBtn>
        <ToolBtn onClick={addImage} title="Изображение">
          <ImageIcon size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Разделитель">
          <Minus size={15} />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Отменить">
          <Undo size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Повторить">
          <Redo size={15} />
        </ToolBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Hidden file input for image upload */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
    </div>
  )
}
