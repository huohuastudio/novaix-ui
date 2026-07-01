import type { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ImageSelector } from "@/components/image-selector"

interface ImageSourceProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function ImageSource({ form }: ImageSourceProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="source_alias"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>镜像</FormLabel>
            <ImageSelector
              value={field.value}
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
    </div>
  )
}
