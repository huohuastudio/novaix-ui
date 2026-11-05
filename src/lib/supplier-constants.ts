// 供应商转售（模块商品）相关的状态文案与表单工具，供管理端各页面复用
import type { ProviderField } from "@/api"
import { isFieldVisible, isSubmittable, validateField } from "@/lib/provider-field-utils"
import { datetimeLocalToServer } from "@/lib/datetime"
import { formatDisk, formatMemory } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

interface StatusMeta {
  label: string
  variant: BadgeVariant
}

function toOptions(map: Record<string, StatusMeta | string>) {
  return Object.entries(map).map(([value, meta]) => ({
    value,
    label: typeof meta === "string" ? meta : meta.label,
  }))
}

/** 供应商连接状态 */
export const connectionStatusMap: Record<string, StatusMeta> = {
  active: { label: "正常", variant: "default" },
  maintenance: { label: "维护（停止新购）", variant: "outline" },
  disabled: { label: "停用", variant: "secondary" },
}
export const connectionStatusOptions = toOptions(connectionStatusMap)

/** 模块商品状态 */
export const productStatusMap: Record<string, StatusMeta> = {
  on_sale: { label: "上架", variant: "default" },
  hidden: { label: "隐藏（仅续费）", variant: "outline" },
  off: { label: "下架", variant: "secondary" },
}
export const productStatusOptions = toOptions(productStatusMap)

/** 模块服务状态 */
export const moduleServiceStatusMap: Record<string, StatusMeta> = {
  pending: { label: "开通中", variant: "outline" },
  active: { label: "运行中", variant: "default" },
  suspended: { label: "已暂停", variant: "destructive" },
  terminating: { label: "退订中", variant: "outline" },
  terminated: { label: "已终止", variant: "secondary" },
  cancelled: { label: "已取消", variant: "secondary" },
}
export const moduleServiceStatusOptions = toOptions(moduleServiceStatusMap)

/** 暂停原因 */
export const suspendReasonMap: Record<string, string> = {
  expired: "到期暂停",
  admin: "管理员暂停",
}

/** 服务操作类型 */
export const moduleOpTypeMap: Record<string, string> = {
  create: "开通",
  renew: "续费",
  suspend: "暂停",
  unsuspend: "恢复",
  terminate: "退订",
  action: "操作",
  reconcile: "对账差异",
}
export const moduleOpTypeOptions = toOptions(moduleOpTypeMap)

/** 服务操作状态 */
export const moduleOpStatusMap: Record<string, StatusMeta> = {
  queued: { label: "排队", variant: "outline" },
  running: { label: "执行中", variant: "default" },
  waiting: { label: "等待上游", variant: "outline" },
  succeeded: { label: "成功", variant: "secondary" },
  failed: { label: "失败", variant: "destructive" },
  unknown: { label: "结果未知", variant: "destructive" },
  manual: { label: "待人工处理", variant: "destructive" },
  cancelled: { label: "已取消", variant: "secondary" },
}
export const moduleOpStatusOptions = toOptions(moduleOpStatusMap)

/** 操作发起方 */
export const moduleOpRequesterMap: Record<string, string> = {
  user: "用户",
  admin: "管理员",
  system: "系统",
}

/** 操作是否仍在进行中 */
export function isModuleOpActive(status?: string) {
  return status === "queued" || status === "running" || status === "waiting"
}

/** 操作是否需要人工处理 */
export function isModuleOpAttention(status?: string) {
  return status === "manual" || status === "unknown" || status === "failed"
}

/** 模块商品支持的计费周期 */
export const MODULE_CYCLES = [
  { value: "monthly", label: "月付" },
  { value: "quarterly", label: "季付" },
  { value: "yearly", label: "年付" },
] as const

/** 远程选项显示名的保存键后缀（仅用于编辑回显） */
export const REMOTE_LABEL_SUFFIX = "__label"

/** 读取动态字段的当前值（未填写时回落默认值） */
export function dynamicFieldValue(field: ProviderField, values: Record<string, string>) {
  return values[field.key ?? ""] ?? field.default ?? ""
}

/** 构造用于条件显示判断的字段值映射 */
export function dynamicFieldValues(fields: ProviderField[], values: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const f of fields) out[f.key ?? ""] = dynamicFieldValue(f, values)
  return out
}

/** 校验插件声明的动态字段，返回 key → 错误信息 */
export function validateDynamicFields(fields: ProviderField[], values: Record<string, string>) {
  const visibleValues = dynamicFieldValues(fields, values)
  const errors: Record<string, string> = {}
  for (const f of fields) {
    if (!isSubmittable(f) || !isFieldVisible(f, visibleValues)) continue
    const err = validateField(f, dynamicFieldValue(f, values))
    if (err) errors[f.key!] = err
  }
  return errors
}

/** 收集需要提交的动态字段值（含远程选项的显示名） */
export function collectDynamicValues(fields: ProviderField[], values: Record<string, string>) {
  const visibleValues = dynamicFieldValues(fields, values)
  const out: Record<string, string> = {}
  for (const f of fields) {
    if (!isSubmittable(f) || !isFieldVisible(f, visibleValues)) continue
    const key = f.key ?? ""
    out[key] = dynamicFieldValue(f, values)
    if (f.options_remote) {
      const labelKey = key + REMOTE_LABEL_SUFFIX
      if (labelKey in values) out[labelKey] = values[labelKey]
    }
  }
  return out
}

/** 远程选项字段的回显显示名：字段 key → 显示名 */
export function remoteLabelsOf(fields: ProviderField[], values: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const f of fields) {
    if (!f.options_remote || !f.key) continue
    const label = values[f.key + REMOTE_LABEL_SUFFIX]
    if (label) out[f.key] = label
  }
  return out
}

/** 剔除远程选项显示名，作为上游查询参数 */
export function stripRemoteLabels(values: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(values)) {
    if (!k.endsWith(REMOTE_LABEL_SUFFIX)) out[k] = v
  }
  return out
}

/** 规格摘要，0 值不展示 */
export function formatModuleSpec(spec: { cpu?: number; memory?: number; disk?: number; bandwidth?: number; traffic?: number }) {
  const parts: string[] = []
  if (spec.cpu) parts.push(`${spec.cpu} 核`)
  if (spec.memory) parts.push(formatMemory(spec.memory))
  if (spec.disk) parts.push(formatDisk(spec.disk))
  if (spec.bandwidth) parts.push(`${spec.bandwidth} Mbps`)
  if (spec.traffic) parts.push(`${spec.traffic} GB 流量`)
  return parts.join(" / ")
}

/** 尝试将 JSON 字符串格式化，失败时原样返回 */
export function prettyJSON(text?: string) {
  if (!text) return ""
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

/** datetime-local（系统时区）→ RFC3339，供 *time.Time 字段提交 */
export function datetimeLocalToISO(local: string | undefined, tz: string): string | undefined {
  const server = datetimeLocalToServer(local, tz)
  if (!server) return undefined
  return new Date(server.replace(" ", "T") + "Z").toISOString()
}

/** 仅允许 http(s) 地址，防止上游返回 javascript: 等危险链接 */
function safeConsoleURL(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url, window.location.href)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString()
  } catch { /* 非法地址 */ }
  return undefined
}

/**
 * 打开上游控制台：type=url 新窗口打开链接；type=form 创建隐藏表单在新窗口自动提交。
 * 返回是否成功发起打开。
 */
export function openSupplierConsole(console: {
  type?: string
  url?: string
  method?: string
  action?: string
  fields?: Record<string, string>
}): boolean {
  if (console.type === "form") {
    const action = safeConsoleURL(console.action || console.url)
    if (!action) return false
    const form = document.createElement("form")
    form.method = (console.method || "POST").toUpperCase() === "GET" ? "GET" : "POST"
    form.action = action
    form.target = "_blank"
    form.style.display = "none"
    for (const [name, value] of Object.entries(console.fields ?? {})) {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = name
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
    form.remove()
    return true
  }
  const url = safeConsoleURL(console.url)
  if (!url) return false
  const win = window.open(url, "_blank")
  if (win) win.opener = null
  return true
}
