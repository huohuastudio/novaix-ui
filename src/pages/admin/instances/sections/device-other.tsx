import { useFieldArray, type UseFormReturn } from "react-hook-form"
import type { OtherDevice } from "@/types/incus-config"
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
import { Plus, Trash2, Cpu } from "lucide-react"

const deviceTypeLabels: Record<OtherDevice["device_type"], string> = {
  usb: "USB",
  tpm: "TPM",
  pci: "PCI",
  "unix-char": "Unix 字符设备",
  "unix-block": "Unix 块设备",
  "unix-hotplug": "Unix 热插拔",
  infiniband: "Infiniband",
}

const containerOnlyTypes = new Set(["unix-char", "unix-block", "unix-hotplug", "infiniband"])
const vmOnlyTypes = new Set(["pci"])

interface OtherDeviceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function OtherDeviceSection({ form }: OtherDeviceSectionProps) {
  const instanceType = form.watch("type")
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "other_devices",
  })

  const availableTypes = Object.entries(deviceTypeLabels).filter(([type]) => {
    if (instanceType === "container" && vmOnlyTypes.has(type)) return false
    if (instanceType === "virtual-machine" && containerOnlyTypes.has(type)) return false
    return true
  })

  const addDevice = () => {
    append({
      name: `device${fields.length}`,
      device_type: "usb",
      vendorid: "",
      productid: "",
      pci_address: "",
      path: "",
      source: "",
    })
  }

  const renderDeviceFields = (index: number) => {
    const deviceType = form.watch(`other_devices.${index}.device_type`)
    return (
      <div className="grid grid-cols-2 gap-3">
        {(deviceType === "usb") && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Vendor ID</label>
              <Input
                className="mt-1"
                placeholder="例如: 046d"
                {...form.register(`other_devices.${index}.vendorid`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Product ID</label>
              <Input
                className="mt-1"
                placeholder="例如: c52b"
                {...form.register(`other_devices.${index}.productid`)}
              />
            </div>
          </>
        )}
        {deviceType === "pci" && (
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">PCI 地址</label>
            <Input
              className="mt-1"
              placeholder="例如: 0000:01:00.0"
              {...form.register(`other_devices.${index}.pci_address`)}
            />
          </div>
        )}
        {(deviceType === "unix-char" || deviceType === "unix-block" || deviceType === "unix-hotplug") && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">源路径</label>
              <Input
                className="mt-1"
                placeholder="例如: /dev/ttyUSB0"
                {...form.register(`other_devices.${index}.source`)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">实例内路径</label>
              <Input
                className="mt-1"
                placeholder="留空则与源路径相同"
                {...form.register(`other_devices.${index}.path`)}
              />
            </div>
          </>
        )}
        {deviceType === "tpm" && (
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">路径</label>
            <Input
              className="mt-1"
              placeholder="留空使用默认路径"
              {...form.register(`other_devices.${index}.path`)}
            />
          </div>
        )}
        {deviceType === "infiniband" && (
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">父设备</label>
            <Input
              className="mt-1"
              placeholder="例如: ib0"
              {...form.register(`other_devices.${index}.source`)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <ConfigSection
      title="其他设备"
      description="配置 USB、TPM、PCI 直通等设备"
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Input
                  className="w-36"
                  {...form.register(`other_devices.${index}.name`)}
                />
                <Select
                  value={form.watch(`other_devices.${index}.device_type`)}
                  onValueChange={(v) =>
                    form.setValue(
                      `other_devices.${index}.device_type`,
                      v as OtherDevice["device_type"]
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
            {renderDeviceFields(index)}
          </div>
        ))}

        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <Cpu className="size-8 mx-auto mb-3 opacity-50" />
            <p>暂未添加其他设备</p>
            <p className="text-xs mt-1">
              支持 USB、TPM、PCI{instanceType === "container" ? "、Unix 字符/块设备、Infiniband" : ""} 等设备直通
            </p>
          </div>
        )}

        <Button type="button" variant="outline" onClick={addDevice}>
          <Plus className="size-4" />
          添加设备
        </Button>
      </div>
    </ConfigSection>
  )
}
