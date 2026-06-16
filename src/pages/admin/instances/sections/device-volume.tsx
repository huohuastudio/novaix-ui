import { useEffect, useState } from "react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, HardDrive } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { incus } from "@/lib/incus"
import type { IncusStorageVolume } from "@/types/incus"

interface VolumeDeviceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  nodeId?: number
}

interface PoolVolumes {
  poolName: string
  volumes: IncusStorageVolume[]
}

export function VolumeDeviceSection({ form, nodeResources, nodeId: nodeIdProp }: VolumeDeviceSectionProps) {
  const nodeId = nodeIdProp ?? form.watch("node_id")
  const { storagePools, loading: poolsLoading } = nodeResources

  const [poolVolumes, setPoolVolumes] = useState<PoolVolumes[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nodeId || storagePools.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPoolVolumes([])
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all(
      storagePools.map(async (pool) => {
        const vols = await incus<IncusStorageVolume[]>(
          nodeId,
          `1.0/storage-pools/${pool.name}/volumes`,
          { params: { recursion: "1" } },
        ).catch(() => [])
        return {
          poolName: pool.name,
          volumes: (vols ?? []).filter((v) => v.type === "custom"),
        }
      }),
    ).then((results) => {
      if (!cancelled) setPoolVolumes(results.filter((r) => r.volumes.length > 0))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [nodeId, storagePools])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "volume_devices",
  })

  const allVolumes = poolVolumes.flatMap((pv) =>
    pv.volumes.map((v) => ({ pool: pv.poolName, name: v.name, content_type: v.content_type })),
  )

  const addVolume = () => {
    append({
      name: `vol${fields.length}`,
      pool: "",
      source: "",
      path: "/mnt/data",
      content_type: "filesystem",
    })
  }

  const handleVolumeSelect = (index: number, value: string) => {
    const [pool, ...rest] = value.split("/")
    const volName = rest.join("/")
    const vol = allVolumes.find((v) => v.pool === pool && v.name === volName)
    form.setValue(`volume_devices.${index}.pool`, pool)
    form.setValue(`volume_devices.${index}.source`, volName)
    if (vol) {
      const ct = vol.content_type || "filesystem"
      form.setValue(`volume_devices.${index}.content_type`, ct)
      if (ct === "block") {
        form.setValue(`volume_devices.${index}.path`, "")
      }
    }
  }

  return (
    <ConfigSection
      title="附加存储卷"
      description="挂载自定义存储卷到实例，可用于持久化数据或跨实例共享"
    >
      <div className="space-y-4">
        {!nodeId ? (
          <p className="text-sm text-muted-foreground">请先选择宿主机节点</p>
        ) : poolsLoading || loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            加载存储卷列表...
          </div>
        ) : (
          <>
            {fields.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">设备名称</TableHead>
                    <TableHead>存储卷</TableHead>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[160px]">挂载路径</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const contentType = form.watch(`volume_devices.${index}.content_type`)
                    const pool = form.watch(`volume_devices.${index}.pool`)
                    const source = form.watch(`volume_devices.${index}.source`)
                    const selectValue = pool && source ? `${pool}/${source}` : ""

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Input {...form.register(`volume_devices.${index}.name`)} />
                        </TableCell>
                        <TableCell>
                          {allVolumes.length > 0 ? (
                            <Select
                              value={selectValue}
                              onValueChange={(v) => handleVolumeSelect(index, v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择存储卷" />
                              </SelectTrigger>
                              <SelectContent>
                                {poolVolumes.map((pv) =>
                                  pv.volumes.map((v) => (
                                    <SelectItem
                                      key={`${pv.poolName}/${v.name}`}
                                      value={`${pv.poolName}/${v.name}`}
                                    >
                                      {v.name}
                                      <span className="text-muted-foreground ml-1">
                                        ({pv.poolName} · {v.content_type || "filesystem"})
                                      </span>
                                    </SelectItem>
                                  )),
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder="存储池"
                                {...form.register(`volume_devices.${index}.pool`)}
                              />
                              <Input
                                placeholder="卷名称"
                                {...form.register(`volume_devices.${index}.source`)}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {contentType === "block" ? "块设备" : "文件系统"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {contentType === "filesystem" ? (
                            <Input
                              placeholder="/mnt/data"
                              {...form.register(`volume_devices.${index}.path`)}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
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
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {fields.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <HardDrive className="size-8 mx-auto mb-3 opacity-50" />
                <p>暂未挂载附加存储卷</p>
                <p className="text-xs mt-1">
                  在节点详情的存储页面创建自定义卷后，可在此挂载到实例
                </p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={addVolume}
              disabled={allVolumes.length === 0 && fields.length === 0}
            >
              <Plus className="size-4" />
              挂载存储卷
            </Button>
            {allVolumes.length === 0 && !loading && nodeId > 0 && (
              <p className="text-xs text-muted-foreground">
                该节点暂无可用的自定义存储卷
              </p>
            )}
          </>
        )}
      </div>
    </ConfigSection>
  )
}
