import { z } from "zod"
import {
  incusConfigSchema,
  incusConfigDefaults,
  buildConfigAndDevices,
  configToFormValues,
} from "@/types/incus-config"

export type { ProxyDevice, GpuDevice, VolumeDevice, OtherDevice } from "@/types/incus-config"

// 注意：schema 已做输入/输出类型归一化（不使用 .default()，默认值由 defaultValues 常量提供；
// z.coerce.number<number>() 仅声明输入类型，运行时仍执行 coerce），详见 @/types/incus-config。
export const instanceFormSchema = incusConfigSchema.extend({
  // 主要配置
  node_id: z.coerce.number<number>().min(1, "请选择宿主机节点"),
  name: z
    .string()
    .min(1, "请输入实例名称")
    .max(63, "名称不能超过 63 个字符")
    .regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, "只能包含字母、数字和连字符，且以字母开头"),
  source_type: z.string(),
  source_server: z.string().optional(),
  source_protocol: z.string().optional(),
  source_alias: z.string().optional(),
  source_fingerprint: z.string().optional(),
  profiles: z.string().optional(),
  description: z.string().optional(),

  // 资源配置（0 表示不由业务字段托管，保留 raw config 中的值）
  cpu: z.coerce.number<number>().min(0).max(128, "最多 128 核"),
  memory: z.coerce.number<number>().int().min(0).max(524288, "最多 512 GB"),
  disk: z.coerce.number<number>().int().min(0).max(10240, "最多 10 TB"),
  bandwidth: z.coerce.number<number>().int().min(0).optional(),
  traffic_limit: z.coerce.number<number>().int().min(0).optional(),

  // IP 分配
  ip_id: z.coerce.number<number>().optional(),

  // 其他
  hostname: z.string().optional(),
  os_type: z.string().optional(),
  password: z.string().optional(),
  arch: z.string().optional(),
  user_id: z.coerce.number<number>().optional(),
})

export type InstanceFormValues = z.infer<typeof instanceFormSchema>

export const instanceUpdateSchema = instanceFormSchema.refine(
  (v) => {
    if (v.cpu === 0) return true
    return v.type === "virtual-machine" ? v.cpu >= 1 && v.cpu === Math.floor(v.cpu) : v.cpu >= 0.5
  },
  { message: "VM 要求 0 或整数 >=1，容器要求 0 或 >=0.5", path: ["cpu"] },
)

export const instanceCreateSchema = instanceFormSchema.refine(
  (v) => v.type === "virtual-machine" ? v.cpu >= 1 && v.cpu === Math.floor(v.cpu) : v.cpu >= 0.5,
  { message: "VM 至少 1 核且为整数，容器至少 0.5 核", path: ["cpu"] },
).refine(
  (v) => v.memory >= 64,
  { message: "至少 64 MB", path: ["memory"] },
).refine(
  (v) => v.disk >= 1,
  { message: "至少 1 GB", path: ["disk"] },
)

export const fieldNames = Object.keys(instanceFormSchema.shape) as Array<keyof InstanceFormValues>

export const defaultValues: InstanceFormValues = {
  ...incusConfigDefaults,
  node_id: 0,
  name: "",
  source_type: "image",
  source_server: "",
  source_protocol: "",
  source_alias: "",
  source_fingerprint: "",
  profiles: "",
  description: "",
  cpu: 1,
  memory: 512,
  disk: 10,
  bandwidth: 0,
  traffic_limit: 0,
  ip_id: undefined,
  hostname: "",
  os_type: "",
  password: "",
  arch: "",
  user_id: undefined,
}

function parseProfiles(v: string) {
  const arr = v.split(",").map(s => s.trim()).filter(Boolean)
  return arr.length > 0 ? arr : undefined
}

function buildCommonBody(values: InstanceFormValues) {
  const { config, devices } = buildConfigAndDevices(values)
  return {
    name: values.name,
    description: values.description || undefined,
    hostname: values.hostname || undefined,
    cpu: values.cpu,
    memory: values.memory,
    disk: values.disk,
    bandwidth: values.bandwidth || undefined,
    traffic_limit: values.traffic_limit || undefined,
    profiles: values.profiles ? parseProfiles(values.profiles) : undefined,
    config: Object.keys(config).length > 0 ? config : undefined,
    devices: Object.keys(devices).length > 0 ? devices : undefined,
    os_type: values.os_type || undefined,
    password: values.password || undefined,
  }
}

export function buildCreateBody(values: InstanceFormValues) {
  return {
    ...buildCommonBody(values),
    node_id: values.node_id,
    type: values.type,
    source_type: values.source_type || undefined,
    source_server: values.source_server || undefined,
    source_protocol: values.source_protocol || undefined,
    source_alias: values.source_alias || undefined,
    source_fingerprint: values.source_fingerprint || undefined,
    ip_id: values.ip_id || undefined,
    arch: values.arch || undefined,
    user_id: values.user_id || undefined,
  }
}

export function buildUpdateBody(values: InstanceFormValues) {
  return buildCommonBody(values)
}

export function instanceToFormValues(instance: {
  name?: string
  hostname?: string
  description?: string
  node_id?: number
  type?: string
  arch?: string
  cpu?: number
  memory?: number
  disk?: number
  bandwidth?: number
  traffic_limit?: number
  os_type?: string
  status?: string
  user_id?: number
  profiles?: string[]
  config?: Record<string, string>
  devices?: Record<string, Record<string, string>>
}): InstanceFormValues {
  const configFields = configToFormValues(instance.config, instance.devices)

  return {
    ...defaultValues,
    ...configFields,
    node_id: instance.node_id ?? 0,
    name: instance.name ?? "",
    type: (instance.type as "virtual-machine" | "container") ?? "virtual-machine",
    description: instance.description ?? "",
    hostname: instance.hostname ?? "",
    cpu: instance.cpu ?? 1,
    memory: instance.memory ?? 512,
    disk: instance.disk ?? 10,
    bandwidth: instance.bandwidth ?? 0,
    traffic_limit: instance.traffic_limit ?? 0,
    os_type: instance.os_type ?? "",
    arch: instance.arch ?? "",
    user_id: instance.user_id,
    profiles: instance.profiles?.join(", ") ?? "",
  }
}
