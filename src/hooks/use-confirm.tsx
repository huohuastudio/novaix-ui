import type { ReactNode } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
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

interface ConfirmOptions {
  title?: string
  description: ReactNode
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions
  }>({
    open: false,
    options: { description: "" },
  })

  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ open: true, options })
    })
  }, [])

  const handleAction = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed)
    resolveRef.current = null
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  const ConfirmDialog = useMemo(() => (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && handleAction(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.options.title ?? "确认操作"}</AlertDialogTitle>
          <AlertDialogDescription asChild><div>{state.options.description}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleAction(false)}>
            {state.options.cancelText ?? "取消"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleAction(true)}
            className={state.options.destructive ? "bg-destructive text-white hover:bg-destructive/90" : ""}
          >
            {state.options.confirmText ?? "确认"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ), [state.open, state.options, handleAction])

  return { confirm, ConfirmDialog }
}
