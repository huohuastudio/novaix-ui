import { useEffect, useImperativeHandle, useRef, forwardRef } from "react"
import { EditorView, placeholder as placeholderExt } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { html } from "@codemirror/lang-html"
import { basicSetup } from "codemirror"
import { oneDark } from "@codemirror/theme-one-dark"

export interface CodeEditorRef {
  insertText: (text: string) => void
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(function CodeEditor({
  value,
  onChange,
  placeholder = "",
  className = "",
  minHeight = "300px",
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const isDark = document.documentElement.classList.contains("dark")

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        html(),
        ...(isDark ? [oneDark] : []),
        ...(placeholder ? [placeholderExt(placeholder)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { minHeight, fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace" },
        }),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅初始化一次
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentValue = view.state.doc.toString()
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      })
    }
  }, [value])

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const view = viewRef.current
      if (!view) return
      const pos = view.state.selection.main.head
      view.dispatch({ changes: { from: pos, insert: text } })
      view.focus()
    },
  }), [])

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-md border bg-background [&_.cm-editor]:outline-none [&_.cm-focused]:outline-none ${className}`}
    />
  )
})
