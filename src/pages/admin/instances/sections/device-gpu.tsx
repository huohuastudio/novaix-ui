import { useFieldArray, type UseFormReturn } from "react-hook-form"
import type { GpuDevice } from "@/types/incus-config"
import { ConfigSection } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Gpu } from "lucide-react"

const gpuTypeLabels: Record<GpuDevice["gputype"], string> = {
  physical: "物理 GPU",
  mdev: "Mediated (mdev)",
  mig: "MIG",
  sriov: "SR-IOV",
}

const containerOnlyGpuTypes = new Set(["mig"])
const vmOnlyGpuTypes = new Set(["mdev", "sriov"])

interface GpuDeviceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function GpuDeviceSection({ form }: GpuDeviceSectionProps) {
  const instanceType = form.watch("type")
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gpu_devices",
  })

  const availableTypes = Object.entries(gpuTypeLabels).filter(([type]) => {
    if (instanceType === "container" && vmOnlyGpuTypes.has(type)) return false
    if (instanceType === "virtual-machine" && containerOnlyGpuTypes.has(type)) return false
    return true
  })

  const addDevice = () => {
    append({
      name: `gpu${fields.length}`,
      gputype: "physical",
      vendorid: "",
      productid: "",
      pci_address: "",
      mdev: "",
      mig_uuid: "",
      id: "",
    })
  }

  const renderGpuFields = (index: number) => {
    const gpuType = form.watch(`gpu_devices.${index}.gputype`)
    return (
      <div className="grid grid-cols-2 gap-3">
        {gpuType === "physical" && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Vendor ID</label>
              <Input
                className="mt-1"
                placeholder="留空则直通全部 GPU"
                {...form.register(`gpu_devices.${index}.vendorid`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Product ID</label>
              <Input
                className="mt-1"
                placeholder="留空则直通全部 GPU"
                {...form.register(`gpu_devices.${index}.productid`)}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">PCI 地址</label>
              <Input
                className="mt-1"
                placeholder="例如: 0000:01:00.0（可选，精确指定）"
                {...form.register(`gpu_devices.${index}.pci_address`)}
              />
            </div>
          </>
        )}
        {gpuType === "mdev" && (
          <>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">mdev Profile</label>
              <Input
                className="mt-1"
                placeholder="例如: nvidia-468"
                {...form.register(`gpu_devices.${index}.mdev`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">PCI 地址</label>
              <Input
                className="mt-1"
                placeholder="例如: 0000:01:00.0"
                {...form.register(`gpu_devices.${index}.pci_address`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">GPU ID</label>
              <Input
                className="mt-1"
                placeholder="DRM card 编号（可选）"
                {...form.register(`gpu_devices.${index}.id`)}
              />
            </div>
          </>
        )}
        {gpuType === "mig" && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">MIG UUID</label>
              <Input
                className="mt-1"
                placeholder="MIG 设备 UUID"
                {...form.register(`gpu_devices.${index}.mig_uuid`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">PCI 地址</label>
              <Input
                className="mt-1"
                placeholder="例如: 0000:01:00.0"
                {...form.register(`gpu_devices.${index}.pci_address`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">GPU ID</label>
              <Input
                className="mt-1"
                placeholder="DRM card 编号（可选）"
                {...form.register(`gpu_devices.${index}.id`)}
              />
            </div>
          </>
        )}
        {gpuType === "sriov" && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Vendor ID</label>
              <Input
                className="mt-1"
                placeholder="留空则自动选择"
                {...form.register(`gpu_devices.${index}.vendorid`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Product ID</label>
              <Input
                className="mt-1"
                placeholder="留空则自动选择"
                {...form.register(`gpu_devices.${index}.productid`)}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">PCI 地址</label>
              <Input
                className="mt-1"
                placeholder="例如: 0000:01:00.0"
                {...form.register(`gpu_devices.${index}.pci_address`)}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <ConfigSection
      title="图形处理器"
      description="配置 GPU 直通，支持物理 GPU、mdev、MIG 和 SR-IOV"
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Input
                  className="w-36"
                  {...form.register(`gpu_devices.${index}.name`)}
                />
                <Select
                  value={form.watch(`gpu_devices.${index}.gputype`)}
                  onValueChange={(v) =>
                    form.setValue(
                      `gpu_devices.${index}.gputype`,
                      v as GpuDevice["gputype"]
                    )
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {renderGpuFields(index)}
          </div>
        ))}

        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <Gpu className="size-8 mx-auto mb-3 opacity-50" />
            <p>暂未添加 GPU 设备</p>
            <p className="text-xs mt-1">
              支持物理 GPU 直通{instanceType === "virtual-machine" ? "、mdev 虚拟 GPU、SR-IOV" : "、MIG 切片"} 等模式
            </p>
          </div>
        )}

        <Button type="button" variant="outline" onClick={addDevice}>
          <Plus className="size-4" />
          添加 GPU 设备
        </Button>
      </div>
    </ConfigSection>
  )
}
