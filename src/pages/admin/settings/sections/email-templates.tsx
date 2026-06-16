import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  RotateCcw,
  Eye,
  Variable,
  Loader2,
  Code,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAdminEmailTemplates,
  putAdminEmailTemplatesByType,
  deleteAdminEmailTemplatesByType,
  postAdminEmailTemplatesByTypePreview,
} from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CodeEditor, type CodeEditorRef } from "@/components/code-editor"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SettingSkeleton } from "./setting-skeleton"
import { sanitizeEmailHtml } from "@/lib/sanitize"
import { getErrorMessage } from "@/lib/utils"

interface TemplateVariable {
  key: string
  label: string
}

interface TemplateItem {
  type: string
  label: string
  subject: string
  body: string
  is_custom: boolean
  variables: TemplateVariable[]
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  )
}

function EditorToolbar({
  editor,
  variables,
}: {
  editor: ReturnType<typeof useEditor>
  variables: TemplateVariable[]
}) {
  if (!editor) return null

  const insertLink = () => {
    const url = window.prompt("输入链接地址", "https://")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="flex items-center gap-0.5 border-b px-2 py-1 flex-wrap">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="加粗"
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="斜体"
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="无序列表"
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="有序列表"
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={insertLink}
        title="插入链接"
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="撤销">
        <Undo className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="重做">
        <Redo className="size-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <VariablePopover
        variables={variables}
        onSelect={(key) => editor.chain().focus().insertContent(`{{${key}}}`).run()}
      />
    </div>
  )
}

function VariablePopover({
  variables,
  onSelect,
  align = "start",
  children,
}: {
  variables: TemplateVariable[]
  onSelect: (key: string) => void
  align?: "start" | "end"
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Variable className="size-3.5" />
            插入变量
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align={align}>
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {variables.map((v) => (
            <Badge
              key={v.key}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => { onSelect(v.key); setOpen(false) }}
            >
              {v.label}
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SourceToolbar({
  variables,
  onInsertVariable,
}: {
  variables: TemplateVariable[]
  onInsertVariable: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-0.5 border-b px-2 py-1">
      <VariablePopover variables={variables} onSelect={onInsertVariable} />
    </div>
  )
}

export function EmailTemplateSection() {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedType, setSelectedType] = useState("")
  const [subject, setSubject] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewing, setPreviewing] = useState(false)
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceCode, setSourceCode] = useState("")
  const codeEditorRef = useRef<CodeEditorRef>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Placeholder.configure({ placeholder: "编辑邮件模板内容..." }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2",
      },
    },
  })

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminEmailTemplates()
      if (res?.code === 0 && res.data) {
        const items = res.data as unknown as TemplateItem[]
        setTemplates(items)
        setSelectedType((prev) => prev || (items.length > 0 ? items[0].type : ""))
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "加载邮件模板失败"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    void loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = useMemo(
    () => templates.find((t) => t.type === selectedType),
    [templates, selectedType],
  )

  useEffect(() => {
    if (current && editor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 模板切换时同步状态
      setSubject(current.subject)
      setSourceMode(false)
      setSourceCode(current.body)
      editor.commands.setContent(current.body)
    }
  }, [current, editor])

  const getBodyHtml = useCallback(() => {
    if (sourceMode) return sourceCode
    return editor?.getHTML() ?? ""
  }, [sourceMode, sourceCode, editor])

  const toggleSourceMode = useCallback(() => {
    if (!editor) return
    if (sourceMode) {
      editor.commands.setContent(sourceCode)
    } else {
      setSourceCode(editor.getHTML())
    }
    setSourceMode((v) => !v)
  }, [sourceMode, sourceCode, editor])

  const handleSave = useCallback(async () => {
    if (!current) return
    const bodyHtml = getBodyHtml()
    setSaving(true)
    try {
      const { data: res } = await putAdminEmailTemplatesByType({
        path: { type: current.type },
        body: { subject, body: bodyHtml },
      })
      if (res?.code === 0) {
        toast.success("模板已保存")
        setTemplates((prev) =>
          prev.map((t) =>
            t.type === current.type
              ? { ...t, subject, body: bodyHtml, is_custom: true }
              : t,
          ),
        )
      } else {
        toast.error(res?.message ?? "保存失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "保存失败"))
    } finally {
      setSaving(false)
    }
  }, [current, getBodyHtml, subject])

  const handleReset = useCallback(async () => {
    if (!current) return
    try {
      const { data: res } = await deleteAdminEmailTemplatesByType({
        path: { type: current.type },
      })
      if (res?.code === 0) {
        toast.success("已恢复默认模板")
        await loadTemplates()
      } else {
        toast.error(res?.message ?? "重置失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "重置失败"))
    }
  }, [current, loadTemplates])

  const handlePreview = useCallback(async () => {
    if (!current) return
    setPreviewing(true)
    try {
      const { data: res } = await postAdminEmailTemplatesByTypePreview({
        path: { type: current.type },
        body: { subject, body: getBodyHtml() },
      })
      if (res?.code === 0 && res.data) {
        const data = res.data as unknown as { subject: string; body: string }
        setPreviewHtml(data.body)
        setPreviewOpen(true)
      } else {
        toast.error(res?.message ?? "预览失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "预览失败"))
    } finally {
      setPreviewing(false)
    }
  }, [current, getBodyHtml, subject])

  if (loading) return <SettingSkeleton rows={6} />

  return (
    <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-6">
      <TabsList variant="line" className="w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar justify-start">
        {templates.map((t) => (
          <TabsTrigger key={t.type} value={t.type}>
            {t.label}
            {t.is_custom && " (已自定义)"}
          </TabsTrigger>
        ))}
      </TabsList>

      {current && (
        <div className="max-w-2xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">邮件主题</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="邮件主题"
              />
              <VariablePopover
                variables={current.variables}
                onSelect={(key) => setSubject((s) => s + `{{${key}}}`)}
                align="end"
              >
                <Button variant="outline" className="shrink-0">
                  <Variable className="size-4" />
                  变量
                </Button>
              </VariablePopover>
            </div>
            <p className="text-xs text-muted-foreground">
              支持变量：{current.variables.map((v) => `{{${v.key}}}`).join("、")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>邮件内容</Label>
              <Button
                variant="ghost"
                onClick={toggleSourceMode}
                className="gap-1"
              >
                <Code className="size-3.5" />
                {sourceMode ? "富文本" : "源代码"}
              </Button>
            </div>
            <div className="rounded-md border bg-background overflow-hidden">
              {sourceMode ? (
                <>
                  <SourceToolbar
                    variables={current.variables}
                    onInsertVariable={(key) => codeEditorRef.current?.insertText(`{{${key}}}`)}
                  />
                  <CodeEditor
                    ref={codeEditorRef}
                    value={sourceCode}
                    onChange={setSourceCode}
                    placeholder="在此输入 HTML 源代码..."
                    className="border-0 rounded-none"
                  />
                </>
              ) : (
                <>
                  <EditorToolbar editor={editor} variables={current.variables} />
                  <EditorContent editor={editor} />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={previewing}>
              {previewing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              预览
            </Button>
            {current.is_custom && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost">
                    <RotateCcw className="size-4" />
                    恢复默认
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>恢复默认模板</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要恢复"{current.label}"为系统默认模板吗？自定义的内容将会丢失。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>确认恢复</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>邮件预览</DialogTitle>
          </DialogHeader>
          <div
            className="overflow-hidden"
            style={{ wordBreak: "break-word" }}
          >
            <div
              className="[&_table]:!w-full [&_table]:!max-w-full [&_td]:!box-border"
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(previewHtml) }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

