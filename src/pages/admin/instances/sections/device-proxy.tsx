import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { ConfigSection } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, ArrowRightLeft } from "lucide-react"

interface ProxyDeviceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function ProxyDeviceSection({ form }: ProxyDeviceSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "proxy_devices",
  })

  const addProxy = () => {
    append({
      name: `proxy${fields.length}`,
      nat: true,
      bind: "host",
      listen: "tcp:0.0.0.0:8080",
      connect: "tcp:127.0.0.1:8080",
    })
  }

  return (
    <ConfigSection
      title="代理设备"
      description="配置端口转发和网络代理，将宿主机端口映射到实例内部"
    >
      <div className="space-y-4">
        {fields.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">设备名称</TableHead>
                <TableHead>监听地址</TableHead>
                <TableHead>连接地址</TableHead>
                <TableHead className="w-[100px]">绑定</TableHead>
                <TableHead className="w-[70px]">NAT</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Input {...form.register(`proxy_devices.${index}.name`)} />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="tcp:0.0.0.0:8080"
                      {...form.register(`proxy_devices.${index}.listen`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="tcp:127.0.0.1:8080"
                      {...form.register(`proxy_devices.${index}.connect`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={form.watch(`proxy_devices.${index}.bind`)}
                      onValueChange={(v) =>
                        form.setValue(`proxy_devices.${index}.bind`, v as "host" | "instance")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="host">主机</SelectItem>
                        <SelectItem value="instance">实例</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={form.watch(`proxy_devices.${index}.nat`)}
                      onCheckedChange={(v) =>
                        form.setValue(`proxy_devices.${index}.nat`, v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <ArrowRightLeft className="size-8 mx-auto mb-3 opacity-50" />
            <p>暂未添加代理设备</p>
            <p className="text-xs mt-1">代理设备可将宿主机端口映射到实例内部端口</p>
          </div>
        )}

        <Button type="button" variant="outline" onClick={addProxy}>
          <Plus className="size-4" />
          添加代理设备
        </Button>
      </div>
    </ConfigSection>
  )
}
