import type { UseFormReturn } from "react-hook-form"
import { Monitor, Box } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface TypeSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function TypeSelector({ form }: TypeSelectorProps) {
  const instanceType = form.watch("type")

  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel required>实例类型</FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => field.onChange("virtual-machine")}
              className={cn(
                "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                instanceType === "virtual-machine"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <Monitor className="size-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">虚拟机 (Virtual Machine)</div>
                <div className="text-xs text-muted-foreground mt-1">
                  完整的虚拟化环境，拥有独立的内核
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => field.onChange("container")}
              className={cn(
                "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                instanceType === "container"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <Box className="size-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">容器 (Container)</div>
                <div className="text-xs text-muted-foreground mt-1">
                  轻量级的应用容器，共享主机内核
                </div>
              </div>
            </button>
          </div>
          <FormDescription>选择要创建的实例类型</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface TypeReadonlyProps {
  type: string
}

export function TypeReadonly({ type }: TypeReadonlyProps) {
  return (
    <FormItem>
      <FormLabel>实例类型</FormLabel>
      <div className="flex items-center gap-2 text-sm">
        {type === "virtual-machine" ? (
          <><Monitor className="size-4 text-muted-foreground" /><span className="font-medium">虚拟机 (Virtual Machine)</span></>
        ) : (
          <><Box className="size-4 text-muted-foreground" /><span className="font-medium">容器 (Container)</span></>
        )}
      </div>
      <FormDescription>实例创建后不可更改类型</FormDescription>
    </FormItem>
  )
}
