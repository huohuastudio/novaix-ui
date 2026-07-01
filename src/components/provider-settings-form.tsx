import type React from "react"
import { useEffect, useState } from "react"
import { Loader2, Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import {
  getAdminProvidersByKind,
  type ProviderDescriptor,
  type ProviderField,
  type ProviderOption,
} from "@/api"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CopyButton } from "@/components/copy-button"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { isSubmittable, isFieldVisible, validateField } from "@/lib/provider-field-utils"
import { SettingSkeleton } from "@/pages/admin/settings/sections/setting-skeleton"
import { getErrorMessage } from "@/lib/utils"

interface TestConfig {
  label: string
  placeholder?: string
  send: (value: string) => Promise<boolean>
  /** 无需输入参数的测试(如对象存储连接测试),仅渲染一个测试按钮 */
  inputless?: boolean
}

interface ProviderSettingsFormProps {
  /** 渠道类别,如 sms */
  kind: string
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 控制组开关说明 */
  enableLabel: string
  enableHint: string
  /** 渠道选择占位符 */
  selectPlaceholder: string
  /** 可选的测试发送配置 */
  test?: TestConfig
  /** 启用后渲染的额外内容，与主表单共享设置状态 */
  renderExtra?: (props: {
    enabled: boolean
    data: Record<string, string>
    update: (key: string, value: string) => void
    save: (items: Record<string, string>) => Promise<boolean>
    saving: boolean
  }) => React.ReactNode
}

/**
 * 多渠道模块的通用动态配置表单:
 * 启用开关 + 渠道单选 + 选中渠道的动态字段(由后端 Descriptor 驱动渲染)。
 * 加新渠道时前端无需改动。
 */
export function ProviderSettingsForm({
  kind,
  title,
  description,
  enableLabel,
  enableHint,
  selectPlaceholder,
  test,
  renderExtra,
}: ProviderSettingsFormProps) {
  const control = useSettings(kind)
  const [descriptors, setDescriptors] = useState<ProviderDescriptor[]>([])
  const [savingMain, setSavingMain] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data: res } = await getAdminProvidersByKind({ path: { kind } })
        if (alive && res?.code === 0 && res.data) setDescriptors(res.data)
      } catch (err) {
        toast.error(getErrorMessage(err, "加载渠道列表失败"))
      }
    })()
    return () => {
      alive = false
    }
  }, [kind])

  if (control.loading) return <SettingSkeleton />

  const enabled = control.data[`${kind}_enabled`] === "true"
  const provider = control.data[`${kind}_provider`] || ""
  const selectedDescriptor = descriptors.find((d) => d.name === provider)

  const handleSaveMain = async () => {
    setSavingMain(true)
    const items: Record<string, string> = {
      [`${kind}_enabled`]: enabled ? "true" : "false",
      [`${kind}_provider`]: provider,
    }
    const prefix = `${kind}_`
    const providerPrefixes = descriptors.map((d) => `${kind}_${d.name}_`)
    for (const [key, value] of Object.entries(control.data)) {
      if (!key.startsWith(prefix)) continue
      if (key === `${kind}_enabled` || key === `${kind}_provider`) continue
      if (providerPrefixes.some((pp) => key.startsWith(pp))) continue
      items[key] = value
    }
    await control.save(items)
    setSavingMain(false)
  }

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>

      <div className="mt-6 max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>{enableLabel}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{enableHint}</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => control.update(`${kind}_enabled`, v ? "true" : "false")}
          />
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label>渠道</Label>
            <Select
              value={provider}
              onValueChange={(v) => control.update(`${kind}_provider`, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {descriptors.map((d) => (
                  <SelectItem key={d.name} value={d.name ?? ""}>
                    {d.title ?? d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择服务提供商，需在下方配置对应的凭证
            </p>
          </div>
        )}

        <Button onClick={handleSaveMain} disabled={savingMain}>
          {savingMain && <Loader2 className="size-4 animate-spin" />}
          保存
        </Button>
      </div>

      {enabled && selectedDescriptor && (
        selectedDescriptor.plugin ? (
          <div className="mt-8 max-w-2xl">
            <Separator className="mb-6" />
            <p className="text-sm text-muted-foreground">
              该渠道由插件提供，请在「插件管理」页面中配置其参数
            </p>
          </div>
        ) : (
          <ChannelForm
            key={selectedDescriptor.name}
            kind={kind}
            descriptor={selectedDescriptor}
            test={test}
          />
        )
      )}

      {renderExtra?.({ enabled, data: control.data, update: control.update, save: control.save, saving: control.saving })}
    </div>
  )
}

/** 按 group 属性将字段分组，保持原始顺序 */
function groupFields(fields: ProviderField[]): { group: string; fields: ProviderField[] }[] {
  const result: { group: string; fields: ProviderField[] }[] = []
  let current: { group: string; fields: ProviderField[] } | null = null
  for (const f of fields) {
    const g = f.group ?? ""
    if (!current || current.group !== g) {
      current = { group: g, fields: [] }
      result.push(current)
    }
    current.fields.push(f)
  }
  return result
}

/** 解析 computed 模板变量。siteURL 使用系统设置的站点 URL，未配置时显示占位提示 */
function resolveComputed(template: string, descriptorName?: string, siteURL?: string): string {
  const baseURL = siteURL ? siteURL.replace(/\/+$/, "") : "<请先配置站点 URL>"
  return template
    .replace(/\{\{baseURL}}/g, baseURL)
    .replace(/\{\{pluginID}}/g, descriptorName ?? "")
}

/** 获取字段的有效选项列表（支持 options_from 动态选项） */
function getEffectiveOptions(field: ProviderField, fieldValues: Record<string, string>): ProviderOption[] {
  const from = field.options_from
  if (from?.key && from.map) {
    const depValue = fieldValues[from.key] ?? ""
    const dynamicOpts = from.map[depValue]
    if (dynamicOpts && dynamicOpts.length > 0) return dynamicOpts
  }
  return field.options ?? []
}

/** 支持分组和 span 的字段网格渲染 */
export function FieldGrid({
  fields,
  fieldValues,
  errors,
  getValue,
  onChange,
  descriptorName,
  siteURL,
}: {
  fields: ProviderField[]
  fieldValues: Record<string, string>
  errors: Record<string, string>
  getValue: (f: ProviderField) => string
  onChange: (f: ProviderField, v: string) => void
  descriptorName?: string
  siteURL?: string
}) {
  const grouped = groupFields(fields)
  const hasGroups = grouped.some((g) => g.group !== "")

  const renderItems = (items: ProviderField[]) =>
    items.map((f) =>
      isFieldVisible(f, fieldValues) ? (
        <div key={f.key} className={f.span === 1 ? "col-span-1" : "col-span-2"}>
          <DynamicField
            field={f}
            value={getValue(f)}
            onChange={(v) => onChange(f, v)}
            error={errors[f.key!]}
            fieldValues={fieldValues}
            descriptorName={descriptorName}
            siteURL={siteURL}
          />
        </div>
      ) : null,
    )

  if (!hasGroups) {
    return <div className="grid grid-cols-2 gap-x-4 gap-y-5">{renderItems(fields)}</div>
  }

  return (
    <div className="space-y-6">
      {grouped.map((g, i) => {
        const isCollapsible = !!g.fields[0]?.group_collapsed
        const content = (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">{renderItems(g.fields)}</div>
        )

        if (!g.group) return <div key={i}>{content}</div>

        if (isCollapsible) {
          return (
            <CollapsibleGroup key={g.group || i} title={g.group} defaultOpen={false}>
              {content}
            </CollapsibleGroup>
          )
        }

        return (
          <div key={g.group || i}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {g.group}
            </h4>
            {content}
          </div>
        )
      })}
    </div>
  )
}

function CollapsibleGroup({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 hover:text-foreground transition-colors"
        >
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {title}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}

/** 单个渠道的动态字段表单(descriptor 由父组件确保存在) */
function ChannelForm({
  kind,
  descriptor,
  test,
}: {
  kind: string
  descriptor: ProviderDescriptor
  test?: TestConfig
}) {
  const group = `${kind}_${descriptor.name}`
  const settings = useSettings(group)
  const { site_url: siteURL } = useSiteSettings()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testValue, setTestValue] = useState("")
  const [testing, setTesting] = useState(false)

  if (settings.loading) return <SettingSkeleton />

  const fields = descriptor.fields ?? []

  const fieldValues: Record<string, string> = {}
  for (const f of fields) {
    fieldValues[f.key ?? ""] = settings.data[`${group}_${f.key}`] ?? f.default ?? ""
  }

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (!isSubmittable(f)) continue
      if (!isFieldVisible(f, fieldValues)) continue
      const val = settings.data[`${group}_${f.key}`] ?? f.default ?? ""
      const err = validateField(f, val)
      if (err) errs[f.key!] = err
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    const items: Record<string, string> = {}
    for (const f of fields) {
      if (!isSubmittable(f)) continue
      if (!isFieldVisible(f, fieldValues)) continue
      const key = `${group}_${f.key}`
      items[key] = settings.data[key] ?? f.default ?? ""
    }
    await settings.save(items)
    setSaving(false)
  }

  const handleTest = async () => {
    if (!test) return
    setTesting(true)
    await test.send(testValue)
    setTesting(false)
  }

  return (
    <>
      <Separator className="my-8" />
      <h3 className="text-sm font-medium">{descriptor.title}</h3>
      <div className="mt-6 max-w-2xl space-y-4">
        <FieldGrid
          fields={fields}
          fieldValues={fieldValues}
          errors={errors}
          getValue={(f) => settings.data[`${group}_${f.key}`] ?? f.default ?? ""}
          onChange={(f, v) => {
            settings.update(`${group}_${f.key}`, v)
            if (errors[f.key!]) setErrors((prev) => { const n = { ...prev }; delete n[f.key!]; return n })
          }}
          descriptorName={descriptor.name}
          siteURL={siteURL}
        />

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          保存
        </Button>

        {test && (
          <>
            <Separator className="my-8" />
            {test.inputless ? (
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="size-4 animate-spin" />}
                {test.label}
              </Button>
            ) : (
              <div className="space-y-2">
                <Label>{test.label}</Label>
                <div className="flex gap-2">
                  <Input
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    placeholder={test.placeholder}
                  />
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing || !testValue}
                  >
                    {testing && <Loader2 className="size-4 animate-spin" />}
                    测试发送
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

/** 敏感多行字段(证书/私钥):默认遮罩显示,提供一个显示/隐藏切换,与 password 输入框的脱敏一致 */
function MaskedTextarea({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="relative">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        disabled={disabled}
        style={revealed ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 size-7 text-muted-foreground"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "隐藏" : "显示"}
      >
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  )
}

export function DynamicField({
  field,
  value,
  onChange,
  error,
  fieldValues,
  descriptorName,
  siteURL,
}: {
  field: ProviderField
  value: string
  onChange: (v: string) => void
  error?: string
  fieldValues?: Record<string, string>
  descriptorName?: string
  siteURL?: string
}) {
  const displayValue = field.computed ? resolveComputed(field.computed, descriptorName, siteURL) : value

  const hasOptions = field.type === "select" || field.type === "multiselect" || field.type === "radio"
  const effectiveOptions = hasOptions ? getEffectiveOptions(field, fieldValues ?? {}) : []

  // options_from 依赖变化后自动清理不合法的旧值（以依赖字段的当前值为稳定触发源）
  const optionsDepValue = field.options_from?.key ? (fieldValues ?? {})[field.options_from.key] ?? "" : ""
  useEffect(() => {
    if (!field.options_from || field.readonly) return
    if (!displayValue) return
    const opts = getEffectiveOptions(field, fieldValues ?? {})
    const validValues = new Set(opts.map((o) => o.value))
    if (field.type === "multiselect") {
      try {
        const arr = JSON.parse(displayValue) as string[]
        const filtered = arr.filter((v) => validValues.has(v))
        if (filtered.length !== arr.length) onChange(JSON.stringify(filtered))
      } catch { /* ignore */ }
    } else if ((field.type === "select" || field.type === "radio") && !validValues.has(displayValue)) {
      onChange("")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsDepValue])

  // divider 类型：纯视觉分隔
  if (field.type === "divider") {
    return (
      <div className="space-y-1 pt-1">
        {field.label && <p className="text-sm font-medium">{field.label}</p>}
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        <Separator className="mt-2" />
      </div>
    )
  }

  const label = (
    <Label htmlFor={field.key}>
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </Label>
  )

  let control: React.ReactNode
  switch (field.type) {
    case "bool":
      control = (
        <div>
          <Switch
            id={field.key}
            checked={displayValue === "true"}
            onCheckedChange={(v) => onChange(v ? "true" : "false")}
            disabled={field.readonly}
          />
        </div>
      )
      break
    case "select":
      control = (
        <SelectWithCopy
          id={field.key}
          value={displayValue}
          options={effectiveOptions}
          placeholder={`请选择${field.label}`}
          onChange={onChange}
          readonly={field.readonly}
          copyable={field.copyable}
        />
      )
      break
    case "multiselect":
      control = (
        <MultiselectField
          options={effectiveOptions}
          value={displayValue}
          onChange={onChange}
          disabled={field.readonly}
        />
      )
      break
    case "radio":
      control = (
        <RadioGroup
          value={displayValue}
          onValueChange={onChange}
          disabled={field.readonly}
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {effectiveOptions.map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem value={o.value ?? ""} id={`${field.key}-${o.value}`} />
              <Label htmlFor={`${field.key}-${o.value}`} className="font-normal cursor-pointer">
                {o.label ?? o.value}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )
      break
    case "keyvalue":
      control = <KeyValueField value={displayValue} onChange={onChange} disabled={field.readonly} sensitive={!!field.sensitive} />
      break
    case "textarea":
    case "code":
      control = field.sensitive ? (
        <MaskedTextarea id={field.key} value={displayValue} onChange={onChange} disabled={field.readonly} />
      ) : (
        <Textarea
          id={field.key}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.type === "code" ? 8 : 4}
          className={field.type === "code" ? "font-mono text-sm" : undefined}
          disabled={field.readonly}
        />
      )
      break
    case "url":
      control = (
        <InputWithCopy
          id={field.key}
          type="url"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "https://"}
          readonly={field.readonly}
          copyable={field.copyable}
        />
      )
      break
    default:
      control = (
        <InputWithCopy
          id={field.key}
          type={
            field.type === "password" || field.sensitive
              ? "password"
              : field.type === "number"
                ? "number"
                : "text"
          }
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          readonly={field.readonly}
          copyable={field.copyable}
        />
      )
  }

  return (
    <div className="space-y-2">
      {label}
      {control}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  )
}

function WithCopy({ copyable, value, children }: { copyable?: boolean; value: string; children: React.ReactNode }) {
  if (!copyable) return children
  return (
    <div className="flex gap-1.5 items-center">
      {children}
      <CopyButton value={value} />
    </div>
  )
}

function InputWithCopy({
  id,
  type,
  value,
  onChange,
  placeholder,
  readonly,
  copyable,
}: {
  id?: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  readonly?: boolean
  copyable?: boolean
}) {
  return (
    <WithCopy copyable={copyable} value={value}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={readonly}
        className={readonly ? "bg-muted" : undefined}
      />
    </WithCopy>
  )
}

function SelectWithCopy({
  id,
  value,
  options,
  placeholder,
  onChange,
  readonly,
  copyable,
}: {
  id?: string
  value: string
  options: ProviderOption[]
  placeholder: string
  onChange: (v: string) => void
  readonly?: boolean
  copyable?: boolean
}) {
  return (
    <WithCopy copyable={copyable} value={value}>
      <Select value={value} onValueChange={onChange} disabled={readonly}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value ?? ""}>
              {o.label ?? o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </WithCopy>
  )
}

function MultiselectField({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ProviderOption[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  let selected: string[] = []
  try {
    const parsed = JSON.parse(value || "[]")
    if (Array.isArray(parsed)) selected = parsed
  } catch { /* ignore */ }

  const toggle = (optValue: string) => {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue]
    onChange(JSON.stringify(next))
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2.5">
      {options.map((o) => (
        <div key={o.value} className="flex items-center gap-2">
          <Checkbox
            id={`ms-${o.value}`}
            checked={selected.includes(o.value ?? "")}
            onCheckedChange={() => toggle(o.value ?? "")}
            disabled={disabled}
          />
          <Label htmlFor={`ms-${o.value}`} className="font-normal cursor-pointer">
            {o.label ?? o.value}
          </Label>
        </div>
      ))}
    </div>
  )
}

function parseKVEntries(json: string): [string, string][] {
  try {
    const obj = JSON.parse(json || "{}")
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      return Object.entries(obj) as [string, string][]
    }
  } catch { /* ignore */ }
  return []
}

function serializeKVEntries(rows: [string, string][]): string {
  const obj: Record<string, string> = {}
  for (const [k, v] of rows) {
    if (k.trim()) obj[k.trim()] = v
  }
  return JSON.stringify(obj)
}

function KeyValueField({
  value,
  onChange,
  disabled,
  sensitive,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  sensitive?: boolean
}) {
  // 本地维护行状态（含空 key 行），仅在序列化时过滤空 key
  const [rows, setRows] = useState<[string, string][]>(() => parseKVEntries(value))
  const [prevValue, setPrevValue] = useState(value)

  // 外部 value 变化时（如设置重新加载），渲染期间重置本地 rows（React 推荐模式，无需 effect）
  if (value !== prevValue) {
    setPrevValue(value)
    if (serializeKVEntries(rows) !== value) {
      setRows(parseKVEntries(value))
    }
  }

  const flush = (next: [string, string][]) => {
    setRows(next)
    onChange(serializeKVEntries(next))
  }

  const add = () => setRows((prev) => [...prev, ["", ""]])
  const remove = (i: number) => flush(rows.filter((_, idx) => idx !== i))
  const set = (i: number, pos: 0 | 1, val: string) => {
    const next = rows.map((row, idx) => (idx === i ? ([...row] as [string, string]) : row))
    next[i][pos] = val
    flush(next)
  }

  return (
    <div className="space-y-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={k}
            onChange={(e) => set(i, 0, e.target.value)}
            placeholder="Key"
            className="flex-1"
            disabled={disabled}
          />
          <Input
            type={sensitive ? "password" : "text"}
            value={v}
            onChange={(e) => set(i, 1, e.target.value)}
            placeholder="Value"
            className="flex-1"
            disabled={disabled}
          />
          {!disabled && (
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => remove(i)}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="size-3.5" />
          添加
        </Button>
      )}
    </div>
  )
}
