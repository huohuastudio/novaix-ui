import type { ProviderField, ProviderFieldCondition } from "@/api"

/** 判断字段是否需要提交（divider 和 readonly 字段不产生用户输入值） */
export function isSubmittable(field: ProviderField): boolean {
  return field.type !== "divider" && !field.readonly
}

/** 判断字段是否满足 when 条件可见。values 是当前所有字段的值映射（key → value） */
export function isFieldVisible(field: ProviderField, values: Record<string, string>): boolean {
  if (!field.when) return true
  return evalCondition(field.when, values)
}

function evalCondition(c: ProviderFieldCondition, values: Record<string, string>): boolean {
  if (c.conditions && c.conditions.length > 0) {
    const logic = c.logic ?? "and"
    if (logic === "or") return c.conditions.some((sub) => evalCondition(sub, values))
    return c.conditions.every((sub) => evalCondition(sub, values))
  }

  const actual = values[c.key ?? ""] ?? ""
  const op = c.op ?? "eq"
  switch (op) {
    case "neq":
      return actual !== (c.value ?? "")
    case "in":
      return (c.values ?? []).includes(actual)
    case "empty":
      return actual.trim() === ""
    case "notEmpty":
      return actual.trim() !== ""
    case "contains":
      return actual.includes(c.value ?? "")
    default:
      return actual === (c.value ?? "")
  }
}

/** 校验单个字段值，返回错误信息或 undefined */
export function validateField(field: ProviderField, value: string): string | undefined {
  if (field.type === "divider" || field.readonly) return undefined
  if (field.required) {
    if (!value.trim()) return `${field.label}不能为空`
    if (field.type === "multiselect") {
      try {
        const arr = JSON.parse(value)
        if (Array.isArray(arr) && arr.length === 0) return `${field.label}不能为空`
      } catch { /* handled below */ }
    }
    if (field.type === "keyvalue") {
      try {
        const obj = JSON.parse(value)
        if (typeof obj === "object" && obj !== null && Object.keys(obj).length === 0) return `${field.label}不能为空`
      } catch { /* handled below */ }
    }
  }
  if (field.type === "url" && value.trim()) {
    try {
      new URL(value.trim())
    } catch {
      return field.validation?.message ?? "请输入有效的 URL"
    }
  }
  if (field.type === "multiselect" && value) {
    try {
      const arr = JSON.parse(value)
      if (!Array.isArray(arr)) return `${field.label} 格式无效`
    } catch {
      return `${field.label} 格式无效`
    }
  }
  if (field.type === "keyvalue" && value) {
    try {
      const obj = JSON.parse(value)
      if (typeof obj !== "object" || Array.isArray(obj) || obj === null) return `${field.label} 必须为有效的键值对`
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v !== "string") return `${field.label} 的值必须为字符串（"${k}" 的值不是字符串）`
      }
    } catch {
      return `${field.label} 必须为有效的 JSON`
    }
  }
  const v = field.validation
  if (!v || !value) return undefined
  if (field.type === "number") {
    const num = Number(value)
    if (!Number.isFinite(num) || !Number.isInteger(num)) return "请输入有效的整数"
    if (v.min != null && num < v.min) return v.message ?? `不能小于 ${v.min}`
    if (v.max != null && num > v.max) return v.message ?? `不能大于 ${v.max}`
  } else {
    const len = value.length
    const minLen = v.min_length ?? v.min
    const maxLen = v.max_length ?? v.max
    if (minLen != null && len < minLen) return v.message ?? `长度不能少于 ${minLen} 个字符`
    if (maxLen != null && len > maxLen) return v.message ?? `长度不能超过 ${maxLen} 个字符`
  }
  return undefined
}
