import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface ProfileSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  nodeId?: number
}

export function ProfileSelector({ form, nodeResources, nodeId }: ProfileSelectorProps) {
  return (
    <FormField
      control={form.control}
      name="profiles"
      render={({ field }) => {
        const selected = field.value ? field.value.split(",").filter(Boolean) : []
        const toggle = (name: string) => {
          const next = selected.includes(name)
            ? selected.filter((s: string) => s !== name)
            : [...selected, name]
          field.onChange(next.join(","))
        }
        return (
          <FormItem>
            <FormLabel>配置文件</FormLabel>
            {!nodeId ? (
              <p className="text-sm text-muted-foreground">请先选择宿主机节点</p>
            ) : nodeResources.loading ? (
              <p className="text-sm text-muted-foreground">加载配置文件...</p>
            ) : nodeResources.profiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {nodeResources.profiles.map((p) => {
                  const isSelected = selected.includes(p.name)
                  return (
                    <Badge
                      key={p.name}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggle(p.name)}
                    >
                      {p.name}
                      {p.description && (
                        <span className="ml-1 opacity-60">({p.description})</span>
                      )}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <FormControl>
                <Input placeholder="default" {...field} />
              </FormControl>
            )}
            <FormDescription>
              点击选择配置文件，未选择时使用默认配置
            </FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
