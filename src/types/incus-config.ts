import { z } from "zod"

export const proxyDeviceSchema = z.object({
  name: z.string().min(1),
  nat: z.boolean().default(true),
  bind: z.enum(["host", "instance"]).default("host"),
  listen: z.string().min(1, "请输入监听地址"),
  connect: z.string().min(1, "请输入连接地址"),
})
export type ProxyDevice = z.infer<typeof proxyDeviceSchema>

export const gpuDeviceSchema = z.object({
  name: z.string().min(1),
  gputype: z.enum(["physical", "mdev", "mig", "sriov"]).default("physical"),
  vendorid: z.string().optional().default(""),
  productid: z.string().optional().default(""),
  pci_address: z.string().optional().default(""),
  mdev: z.string().optional().default(""),
  mig_uuid: z.string().optional().default(""),
  id: z.string().optional().default(""),
})
export type GpuDevice = z.infer<typeof gpuDeviceSchema>

export const volumeDeviceSchema = z.object({
  name: z.string().min(1, "请输入设备名称"),
  pool: z.string().min(1, "请选择存储池"),
  source: z.string().min(1, "请选择存储卷"),
  path: z.string().default(""),
  content_type: z.enum(["filesystem", "block"]).default("filesystem"),
})
export type VolumeDevice = z.infer<typeof volumeDeviceSchema>

export const otherDeviceSchema = z.object({
  name: z.string().min(1),
  device_type: z.enum(["usb", "tpm", "pci", "unix-char", "unix-block", "unix-hotplug", "infiniband"]),
  vendorid: z.string().optional().default(""),
  productid: z.string().optional().default(""),
  pci_address: z.string().optional().default(""),
  path: z.string().optional().default(""),
  source: z.string().optional().default(""),
})
export type OtherDevice = z.infer<typeof otherDeviceSchema>

export const incusConfigSchema = z.object({
  type: z.enum(["virtual-machine", "container"]),

  // 资源限制
  limits_memory_swap: z.string().optional().default(""),
  limits_disk_priority: z.coerce.number().int().min(0).max(10).optional(),
  limits_processes: z.coerce.number().int().min(0).optional(),

  // 安全策略
  security_privileged: z.boolean().default(false),
  security_nesting: z.boolean().default(false),
  security_protection_delete: z.boolean().default(false),
  security_protection_shift: z.boolean().default(false),
  security_secureboot: z.boolean().default(true),
  security_csm: z.boolean().default(false),
  security_idmap_base: z.string().optional().default(""),
  security_idmap_size: z.coerce.number().int().min(0).optional(),
  security_idmap_isolated: z.boolean().default(false),
  security_devlxd: z.boolean().default(true),
  security_devlxd_images: z.boolean().default(false),

  // 快照
  snapshots_schedule: z.string().optional().default(""),
  snapshots_schedule_stopped: z.boolean().default(false),
  snapshots_pattern: z.string().optional().default(""),
  snapshots_expiry: z.string().optional().default(""),

  // 迁移
  migration_stateful: z.boolean().default(false),
  cluster_evacuate: z.string().optional().default(""),

  // 引导
  boot_autostart: z.boolean().default(false),
  boot_autostart_priority: z.coerce.number().int().optional().default(0),
  boot_autostart_delay: z.coerce.number().int().min(0).optional().default(0),
  boot_stop_priority: z.coerce.number().int().optional().default(0),
  boot_host_shutdown_timeout: z.coerce.number().int().min(0).optional().default(30),

  // 高级
  raw_incus_config: z.string().optional().default(""),

  // Cloud Init
  cloud_init_user_data: z.string().optional().default(""),
  cloud_init_vendor_data: z.string().optional().default(""),
  cloud_init_network_config: z.string().optional().default(""),

  // 设备 - 网络
  network_device_name: z.string().optional().default("eth0"),
  network_name: z.string().optional().default(""),

  // 设备 - 磁盘
  disk_pool: z.string().optional().default(""),
  disk_size: z.string().optional().default(""),

  // 设备 - 代理
  proxy_devices: z.array(proxyDeviceSchema).default([]),

  // 设备 - GPU
  gpu_devices: z.array(gpuDeviceSchema).default([]),

  // 设备 - 附加卷
  volume_devices: z.array(volumeDeviceSchema).default([]),

  // 设备 - 其他
  other_devices: z.array(otherDeviceSchema).default([]),
})

export type IncusConfigFormValues = z.infer<typeof incusConfigSchema>

export const incusConfigDefaults: IncusConfigFormValues = {
  type: "virtual-machine",
  limits_memory_swap: "",
  limits_disk_priority: undefined,
  limits_processes: undefined,
  security_privileged: false,
  security_nesting: false,
  security_protection_delete: false,
  security_protection_shift: false,
  security_secureboot: true,
  security_csm: false,
  security_idmap_base: "",
  security_idmap_size: undefined,
  security_idmap_isolated: false,
  security_devlxd: true,
  security_devlxd_images: false,
  snapshots_schedule: "",
  snapshots_schedule_stopped: false,
  snapshots_pattern: "",
  snapshots_expiry: "",
  migration_stateful: false,
  cluster_evacuate: "",
  boot_autostart: false,
  boot_autostart_priority: 0,
  boot_autostart_delay: 0,
  boot_stop_priority: 0,
  boot_host_shutdown_timeout: 30,
  raw_incus_config: "",
  cloud_init_user_data: "",
  cloud_init_vendor_data: "",
  cloud_init_network_config: "",
  network_device_name: "eth0",
  network_name: "",
  disk_pool: "",
  disk_size: "",
  proxy_devices: [],
  gpu_devices: [],
  volume_devices: [],
  other_devices: [],
}

export function buildConfigAndDevices(values: IncusConfigFormValues) {
  const config: Record<string, string> = {}

  if (values.type === "container") {
    if (values.security_privileged) config["security.privileged"] = "true"
    if (values.security_nesting) config["security.nesting"] = "true"
    if (values.security_protection_shift) config["security.protection.shift"] = "true"
    if (values.security_idmap_base) config["security.idmap.base"] = values.security_idmap_base
    if (values.security_idmap_size) config["security.idmap.size"] = String(values.security_idmap_size)
    if (values.security_idmap_isolated) config["security.idmap.isolated"] = "true"
    if (!values.security_devlxd) config["security.devlxd"] = "false"
    if (values.security_devlxd_images) config["security.devlxd.images"] = "true"
    if (values.limits_memory_swap) config["limits.memory.swap"] = values.limits_memory_swap
    if (values.limits_processes) config["limits.processes"] = String(values.limits_processes)
  }
  if (values.type === "virtual-machine") {
    config["security.secureboot"] = values.security_secureboot ? "true" : "false"
    if (values.security_csm) config["security.csm"] = "true"
  }
  if (values.security_protection_delete) config["security.protection.delete"] = "true"
  if (values.limits_disk_priority != null) config["limits.disk.priority"] = String(values.limits_disk_priority)
  if (values.snapshots_schedule) config["snapshots.schedule"] = values.snapshots_schedule
  if (values.snapshots_schedule_stopped) config["snapshots.schedule.stopped"] = "true"
  if (values.snapshots_pattern) config["snapshots.pattern"] = values.snapshots_pattern
  if (values.snapshots_expiry) config["snapshots.expiry"] = values.snapshots_expiry
  if (values.type === "virtual-machine" && values.migration_stateful) config["migration.stateful"] = "true"
  if (values.cluster_evacuate) config["cluster.evacuate"] = values.cluster_evacuate
  if (values.boot_autostart) config["boot.autostart"] = "true"
  if (values.boot_autostart_priority) config["boot.autostart.priority"] = String(values.boot_autostart_priority)
  if (values.boot_autostart_delay) config["boot.autostart.delay"] = String(values.boot_autostart_delay)
  if (values.boot_stop_priority) config["boot.stop.priority"] = String(values.boot_stop_priority)
  if (values.boot_host_shutdown_timeout !== 30) config["boot.host_shutdown_timeout"] = String(values.boot_host_shutdown_timeout)
  if (values.cloud_init_user_data) config["cloud-init.user-data"] = values.cloud_init_user_data
  if (values.cloud_init_vendor_data) config["cloud-init.vendor-data"] = values.cloud_init_vendor_data
  if (values.cloud_init_network_config) config["cloud-init.network-config"] = values.cloud_init_network_config

  if (values.raw_incus_config) {
    try {
      const raw = JSON.parse(values.raw_incus_config) as Record<string, string>
      Object.assign(config, raw)
    } catch { /* ignore invalid JSON */ }
  }

  const devices: Record<string, Record<string, string>> = {}

  if (values.disk_pool || values.disk_size) {
    devices["root"] = {
      type: "disk",
      path: "/",
      ...(values.disk_pool && { pool: values.disk_pool }),
      ...(values.disk_size && { size: values.disk_size }),
    }
  }
  if (values.network_name) {
    devices[values.network_device_name || "eth0"] = { type: "nic", network: values.network_name }
  }
  for (const proxy of values.proxy_devices) {
    devices[proxy.name] = {
      type: "proxy", listen: proxy.listen, connect: proxy.connect, bind: proxy.bind,
      ...(proxy.nat && { nat: "true" }),
    }
  }
  for (const gpu of values.gpu_devices) {
    const d: Record<string, string> = { type: "gpu", gputype: gpu.gputype }
    if (gpu.vendorid) d["vendorid"] = gpu.vendorid
    if (gpu.productid) d["productid"] = gpu.productid
    if (gpu.pci_address) d["pci"] = gpu.pci_address
    if (gpu.mdev) d["mdev"] = gpu.mdev
    if (gpu.mig_uuid) d["mig.uuid"] = gpu.mig_uuid
    if (gpu.id) d["id"] = gpu.id
    devices[gpu.name] = d
  }
  for (const vol of values.volume_devices) {
    const d: Record<string, string> = {
      type: "disk",
      pool: vol.pool,
      source: vol.source,
    }
    if (vol.content_type === "filesystem" && vol.path) {
      d["path"] = vol.path
    }
    devices[vol.name] = d
  }
  for (const dev of values.other_devices) {
    const d: Record<string, string> = { type: dev.device_type }
    if (dev.vendorid) d["vendorid"] = dev.vendorid
    if (dev.productid) d["productid"] = dev.productid
    if (dev.pci_address) d["address"] = dev.pci_address
    if (dev.path) d["path"] = dev.path
    if (dev.source) d["source"] = dev.source
    devices[dev.name] = d
  }

  return { config, devices }
}

export function configToFormValues(
  cfg: Record<string, string> | null | undefined,
  devs: Record<string, Record<string, string>> | null | undefined,
): Partial<IncusConfigFormValues> {
  const rootDev = devs?.["root"]
  const nicEntry = devs ? Object.entries(devs).find(([, d]) => d.type === "nic") : undefined

  const proxyDevices: ProxyDevice[] = []
  const gpuDevices: GpuDevice[] = []
  const volumeDevices: VolumeDevice[] = []
  const otherDevices: OtherDevice[] = []

  if (devs) {
    for (const [name, d] of Object.entries(devs)) {
      if (d.type === "proxy") {
        proxyDevices.push({
          name,
          nat: d.nat === "true",
          bind: (d.bind as "host" | "instance") ?? "host",
          listen: d.listen ?? "",
          connect: d.connect ?? "",
        })
      } else if (d.type === "gpu") {
        gpuDevices.push({
          name,
          gputype: (d.gputype as "physical" | "mdev" | "mig" | "sriov") ?? "physical",
          vendorid: d.vendorid ?? "",
          productid: d.productid ?? "",
          pci_address: d.pci ?? d.address ?? "",
          mdev: d.mdev ?? "",
          mig_uuid: d["mig.uuid"] ?? "",
          id: d.id ?? "",
        })
      } else if (d.type === "disk" && name !== "root" && d.source) {
        volumeDevices.push({
          name,
          pool: d.pool ?? "",
          source: d.source,
          path: d.path ?? "",
          content_type: d.path ? "filesystem" : "block",
        })
      } else if (d.type !== "disk" && d.type !== "nic") {
        otherDevices.push({
          name,
          device_type: d.type as OtherDevice["device_type"],
          vendorid: d.vendorid ?? "",
          productid: d.productid ?? "",
          pci_address: d.address ?? "",
          path: d.path ?? "",
          source: d.source ?? "",
        })
      }
    }
  }

  return {
    security_privileged: cfg?.["security.privileged"] === "true",
    security_nesting: cfg?.["security.nesting"] === "true",
    security_protection_delete: cfg?.["security.protection.delete"] === "true",
    security_protection_shift: cfg?.["security.protection.shift"] === "true",
    security_secureboot: cfg?.["security.secureboot"] !== "false",
    security_csm: cfg?.["security.csm"] === "true",
    security_idmap_base: cfg?.["security.idmap.base"] ?? "",
    security_idmap_size: cfg?.["security.idmap.size"] ? Number(cfg["security.idmap.size"]) : undefined,
    security_idmap_isolated: cfg?.["security.idmap.isolated"] === "true",
    security_devlxd: cfg?.["security.devlxd"] !== "false",
    security_devlxd_images: cfg?.["security.devlxd.images"] === "true",

    limits_memory_swap: cfg?.["limits.memory.swap"] ?? "",
    limits_disk_priority: cfg?.["limits.disk.priority"] != null ? Number(cfg["limits.disk.priority"]) : undefined,
    limits_processes: cfg?.["limits.processes"] ? Number(cfg["limits.processes"]) : undefined,

    snapshots_schedule: cfg?.["snapshots.schedule"] ?? "",
    snapshots_schedule_stopped: cfg?.["snapshots.schedule.stopped"] === "true",
    snapshots_pattern: cfg?.["snapshots.pattern"] ?? "",
    snapshots_expiry: cfg?.["snapshots.expiry"] ?? "",

    migration_stateful: cfg?.["migration.stateful"] === "true",
    cluster_evacuate: cfg?.["cluster.evacuate"] ?? "",

    boot_autostart: cfg?.["boot.autostart"] === "true",
    boot_autostart_priority: cfg?.["boot.autostart.priority"] ? Number(cfg["boot.autostart.priority"]) : 0,
    boot_autostart_delay: cfg?.["boot.autostart.delay"] ? Number(cfg["boot.autostart.delay"]) : 0,
    boot_stop_priority: cfg?.["boot.stop.priority"] ? Number(cfg["boot.stop.priority"]) : 0,
    boot_host_shutdown_timeout: cfg?.["boot.host_shutdown_timeout"] ? Number(cfg["boot.host_shutdown_timeout"]) : 30,

    cloud_init_user_data: cfg?.["cloud-init.user-data"] ?? "",
    cloud_init_vendor_data: cfg?.["cloud-init.vendor-data"] ?? "",
    cloud_init_network_config: cfg?.["cloud-init.network-config"] ?? "",

    disk_pool: rootDev?.pool ?? "",
    disk_size: rootDev?.size ?? "",
    network_device_name: nicEntry?.[0] ?? "eth0",
    network_name: nicEntry?.[1]?.network ?? "",
    proxy_devices: proxyDevices,
    gpu_devices: gpuDevices,
    volume_devices: volumeDevices,
    other_devices: otherDevices,
  }
}
