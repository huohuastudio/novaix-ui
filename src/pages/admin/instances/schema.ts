import { z } from "zod"
import {
  incusConfigSchema,
  incusConfigDefaults,
  buildConfigAndDevices,
  configToFormValues,
} from "@/types/incus-config"

export type { ProxyDevice, GpuDevice, VolumeDevice, OtherDevice } from "@/types/incus-config"

export const instanceFormSchema = incusConfigSchema.extend({
  // 主要配置
  node_id: z.coerce.number().min(1, "请选择宿主机节点"),
  name: z
    .string()
    .min(1, "请输入实例名称")
    .max(63, "名称不能超过 63 个字符")
    .regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, "只能包含字母、数字和连字符，且以字母开头"),
  source_type: z.string().default("image"),
  source_server: z.string().optional().default(""),
  source_protocol: z.string().optional().default(""),
  source_alias: z.string().optional().default(""),
  source_fingerprint: z.string().optional().default(""),
  profiles: z.string().optional().default(""),
  description: z.string().optional().default(""),

  // 资源配置
  cpu: z.coerce.number().int().min(1, "至少 1 核").max(128, "最多 128 核").default(1),
  memory: z.coerce.number().int().min(64, "至少 64 MB").max(524288, "最多 512 GB").default(512),
  disk: z.coerce.number().int().min(1, "至少 1 GB").max(10240, "最多 10 TB").default(10),
  bandwidth: z.coerce.number().int().min(0).optional().default(0),
  traffic_limit: z.coerce.number().int().min(0).optional().default(0),

  // IP 分配
  ip_id: z.coerce.number().optional(),

  // 其他
  hostname: z.string().optional().default(""),
  os_type: z.string().optional().default(""),
  password: z.string().optional().default(""),
  arch: z.string().optional().default(""),
  user_id: z.coerce.number().optional(),
})

export type InstanceFormValues = z.infer<typeof instanceFormSchema>

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
