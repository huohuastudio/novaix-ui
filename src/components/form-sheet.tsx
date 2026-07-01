import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"

interface FormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-[min(80vw,1100px)] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {children}
        </div>
        {footer && (
          <SheetFooter className="shrink-0 border-t px-4 py-3 flex-row items-center justify-end gap-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
