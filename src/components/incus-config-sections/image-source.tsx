import type { UseFormReturn } from "react-hook-form"
import type { InstanceFormValues } from "@/pages/admin/instances/schema"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageSelector } from "@/components/image-selector"

interface ImageSourceProps {
  form: UseFormReturn<InstanceFormValues>
}

export function ImageSource({ form }: ImageSourceProps) {
  const sourceType = form.watch("source_type")

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="source_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>镜像源类型</FormLabel>
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                if (v === "none") {
                  form.setValue("source_alias", "")
                  form.setValue("source_server", "")
                  form.setValue("source_protocol", "")
                  form.setValue("type", "virtual-machine")
                }
              }}
            >
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="image">从镜像库选择</SelectItem>
                <SelectItem value="none">空盘（从 ISO 安装）</SelectItem>
              </SelectContent>
            </Select>
            {sourceType === "none" && (
              <FormDescription>创建空盘虚拟机，需配合 ISO 挂载安装操作系统</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {sourceType !== "none" && (
        <>
          <FormField
            control={form.control}
            name="source_alias"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>镜像</FormLabel>
                <ImageSelector
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onServerChange={(s) => form.setValue("source_server", s)}
                  onProtocolChange={(p) => form.setValue("source_protocol", p)}
                />
                <FormDescription>选择实例镜像的来源方式</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source_server"
            render={({ field }) => (
              <FormItem>
                <FormLabel>镜像服务器</FormLabel>
                <FormControl>
                  <Input
                    placeholder="留空使用默认"
                    {...field}
                  />
                </FormControl>
                <FormDescription>留空使用默认镜像服务器</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  )
}
