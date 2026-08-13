import type { ReactNode } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export type ConfirmChoiceResult = "confirm" | "force" | false

interface ConfirmChoiceOptions {
  title?: string
  description: ReactNode
  confirmText?: string
  forceText?: string
  cancelText?: string
  forceDescription?: ReactNode
}

export function useConfirmChoice() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmChoiceOptions
  }>({
    open: false,
    options: { description: "" },
  })

  const resolveRef = useRef<((value: ConfirmChoiceResult) => void) | null>(null)

  const confirmChoice = useCallback((options: ConfirmChoiceOptions): Promise<ConfirmChoiceResult> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ open: true, options })
    })
  }, [])

  const handleAction = useCallback((result: ConfirmChoiceResult) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  const ConfirmChoiceDialog = useMemo(() => (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && handleAction(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.options.title ?? "确认操作"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <div>{state.options.description}</div>
              {state.options.forceDescription && (
                <div className="text-destructive">{state.options.forceDescription}</div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleAction(false)}>
            {state.options.cancelText ?? "取消"}
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => handleAction("confirm")}
          >
            {state.options.confirmText ?? "删除"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction("force")}
          >
            {state.options.forceText ?? "强制删除"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ), [state.open, state.options, handleAction])

  return { confirmChoice, ConfirmChoiceDialog }
}
