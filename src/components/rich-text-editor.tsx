import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Superscript from "@tiptap/extension-superscript"
import Subscript from "@tiptap/extension-subscript"
import Image from "@tiptap/extension-image"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import { useEffect, useRef } from "react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Quote,
  Minus,
  Highlighter,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  CodeXml,
  ImagePlus,
  RemoveFormatting,
  Palette,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-7", active && "bg-accent text-accent-foreground")}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

const TEXT_COLORS = [
  { label: "默认", value: "" },
  { label: "红色", value: "#ef4444" },
  { label: "橙色", value: "#f97316" },
  { label: "黄色", value: "#eab308" },
  { label: "绿色", value: "#22c55e" },
  { label: "蓝色", value: "#3b82f6" },
  { label: "紫色", value: "#a855f7" },
  { label: "粉色", value: "#ec4899" },
  { label: "灰色", value: "#6b7280" },
]

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const colorPopoverCloseRef = useRef<HTMLButtonElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Image.configure({ inline: true }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-3 outline-none",
      },
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("输入链接地址", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt("输入图片地址")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run()
  }

  return (
    <div className={cn("rounded-lg border", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
        {/* 标题 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="标题 1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="标题 2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="标题 3"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* 文本样式 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="粗体"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="斜体"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="下划线"
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="删除线"
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="行内代码"
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="高亮"
        >
          <Highlighter className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* 文字颜色 */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  ref={colorPopoverCloseRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("size-7", editor.isActive("textStyle") && "bg-accent text-accent-foreground")}
                >
                  <Palette className="size-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>文字颜色</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value || "default"}
                  type="button"
                  className={cn(
                    "size-6 rounded-md border transition-transform hover:scale-110",
                    !color.value && "bg-foreground"
                  )}
                  style={color.value ? { backgroundColor: color.value } : undefined}
                  title={color.label}
                  onClick={() => {
                    if (color.value) {
                      editor.chain().focus().setColor(color.value).run()
                    } else {
                      editor.chain().focus().unsetColor().run()
                    }
                    colorPopoverCloseRef.current?.click()
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 上标/下标 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive("superscript")}
          title="上标"
        >
          <SuperscriptIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive("subscript")}
          title="下标"
        >
          <SubscriptIcon className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* 对齐 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="左对齐"
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="居中"
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="右对齐"
        >
          <AlignRight className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="两端对齐"
        >
          <AlignJustify className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* 列表与块级 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="无序列表"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="有序列表"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="引用"
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="代码块"
        >
          <CodeXml className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分割线"
        >
          <Minus className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* 插入 */}
        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="链接">
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          title="取消链接"
        >
          <Unlink className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="插入图片">
          <ImagePlus className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* 工具 */}
        <ToolbarButton onClick={clearFormatting} title="清除格式">
          <RemoveFormatting className="size-4" />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="撤销">
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="重做">
          <Redo className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
