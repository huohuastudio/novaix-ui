import { useEffect, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { postAdminRegions, putAdminRegionsById } from "@/api"
import type { RegionRegionItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { countries, searchCountries } from "@/lib/countries"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormSheet } from "@/components/form-sheet"
import { ImageUploadField } from "@/components/image-upload-field"

const formSchema = z.object({
  code: z.string().min(1, "代码不能为空").max(64, "代码不能超过 64 个字符"),
  display_name: z.string().min(1, "展示名称不能为空").max(100, "展示名称不能超过 100 个字符"),
  name: z.string().max(100, "内部名称不能超过 100 个字符").optional().or(z.literal("")),
  country: z.string().min(1, "国家/地区不能为空").max(100, "国家/地区不能超过 100 个字符"),
  city: z.string().min(1, "城市不能为空").max(100, "城市不能超过 100 个字符"),
  flag: z.string().max(16, "国旗不能超过 16 个字符").optional().or(z.literal("")),
  latitude: z.coerce.number<number | string>().min(-90).max(90).optional().default(0),
  longitude: z.coerce.number<number | string>().min(-180).max(180).optional().default(0),
  network_provider: z.string().max(64, "线路信息不能超过 64 个字符").optional().or(z.literal("")),
  description: z.string().max(1000, "描述不能超过 1000 个字符").optional().or(z.literal("")),
  features: z.string().optional().or(z.literal("")),
  test_ip: z.string().max(100, "测试 IP 不能超过 100 个字符").optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
  public_visible: z.boolean().optional().default(false),
  status: z.coerce.number<number | string>().int(),
  sort_order: z.coerce.number<number | string>().int().min(0, "排序权重不能为负数"),
})

type FormInput = z.input<typeof formSchema>
type FormValues = z.output<typeof formSchema>

const defaultValues: FormValues = {
  code: "",
  display_name: "",
  name: "",
  country: "",
  city: "",
  flag: "",
  latitude: 0,
  longitude: 0,
  network_provider: "",
  description: "",
  features: "",
  test_ip: "",
  image: "",
  public_visible: false,
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function FeaturesTagInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [inputValue, setInputValue] = useState("")
  const tags = parseTags(value)

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    const current = parseTags(value)
    if (current.includes(trimmed)) return
    const newTags = [...current, trimmed]
    onChange(newTags.join(", "))
    setInputValue("")
  }

  const removeTag = (index: number) => {
    const current = parseTags(value)
    current.splice(index, 1)
    onChange(current.join(", "))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder="输入特性后按回车添加"
      />
    </div>
  )
}

function CountryPickerField({ form }: { form: UseFormReturn<FormInput, unknown, FormValues> }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const currentCountry = form.watch("country")
  const currentFlag = form.watch("flag")

  const matched = countries.find((c) => c.name === currentCountry)
  const displayLabel = matched
    ? `${matched.flag} ${matched.name}`
    : currentCountry
      ? `${currentFlag ? currentFlag + " " : ""}${currentCountry}`
      : undefined

  const filtered = searchCountries(search)

  return (
    <FormField
      control={form.control}
      name="country"
      render={() => (
        <FormItem className="flex flex-col">
          <FormLabel required>国家/地区</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn("justify-between font-normal", !displayLabel && "text-muted-foreground")}
              >
                <span className="truncate">{displayLabel ?? "选择国家/地区"}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="搜索国家（中文/拼音/英文）..." value={search} onValueChange={setSearch} />
                <CommandList>
                  <CommandEmpty>
                    <div className="py-2 text-center">
                      <p className="text-sm text-muted-foreground">未找到匹配的国家</p>
                      {search && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="mt-1"
                          onClick={() => {
                            form.setValue("country", search, { shouldValidate: true })
                            setOpen(false)
                            setSearch("")
                          }}
                        >
                          使用「{search}」
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {filtered.map((c) => (
                      <CommandItem
                        key={c.name}
                        value={c.name}
                        onSelect={() => {
                          form.setValue("country", c.name, { shouldValidate: true })
                          form.setValue("flag", c.flag)
                          const currentCode = form.getValues("code")
                          if (!currentCode) {
                            form.setValue("code", c.code)
                          }
                          setOpen(false)
                          setSearch("")
                        }}
                      >
                        <Check className={cn("mr-2 size-4", currentCountry === c.name ? "opacity-100" : "opacity-0")} />
                        <span className="mr-2">{c.flag}</span>
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function RegionFormFields({ form }: { form: UseFormReturn<FormInput, unknown, FormValues> }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>展示名称</FormLabel>
              <FormControl>
                <Input placeholder="如：香港" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>区域代码</FormLabel>
              <FormControl>
                <Input placeholder="如：hk-1" {...field} />
              </FormControl>
              <FormDescription>唯一标识符，用于 API 调用</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>内部名称</FormLabel>
            <FormControl>
              <Input placeholder="留空则使用展示名称" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>城市</FormLabel>
              <FormControl>
                <Input placeholder="如：香港" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <CountryPickerField form={form} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="flag"
          render={({ field }) => (
            <FormItem>
              <FormLabel>国旗</FormLabel>
              <FormControl>
                <Input placeholder="选择国家后自动填充，也可手动修改" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="network_provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>线路信息</FormLabel>
              <FormControl>
                <Input placeholder="如：BGP、电信" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>纬度</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="22.3193" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>经度</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="114.1694" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>描述</FormLabel>
            <FormControl>
              <Textarea placeholder="输入区域描述" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="features"
        render={({ field }) => (
          <FormItem>
            <FormLabel>特性</FormLabel>
            <FormControl>
              <FeaturesTagInput value={field.value ?? ""} onChange={field.onChange} />
            </FormControl>
            <FormDescription>输入特性标签后按回车添加，如：高带宽、低延迟、DDoS 防护</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="test_ip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>测试 IP</FormLabel>
            <FormControl>
              <Input placeholder="输入测试 IP 地址" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>图片</FormLabel>
            <FormControl>
              <ImageUploadField value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="public_visible"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>公开展示</FormLabel>
              <p className="text-xs text-muted-foreground">在官网首页展示该区域的数据中心信息</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>状态</FormLabel>
              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">活跃</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                  <SelectItem value="2">维护中</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>排序权重</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}

export function RegionCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const features = parseTags(values.features ?? "")
      const { data: res } = await postAdminRegions({
        body: {
          code: values.code,
          display_name: values.display_name,
          name: values.name || values.display_name,
          country: values.country,
          city: values.city,
          flag: values.flag || undefined,
          latitude: values.latitude,
          longitude: values.longitude,
          network_provider: values.network_provider || undefined,
          description: values.description || undefined,
          features: features.length > 0 ? features : undefined,
          test_ip: values.test_ip || undefined,
          image: values.image || undefined,
          public_visible: values.public_visible,
          status: values.status,
          sort_order: values.sort_order,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames,
        })
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="添加区域"
      description="添加一个新的区域"
      footer={
        <Button form="region-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "提交中..." : "提交"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="region-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <RegionFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function RegionEditSheet({
  open,
  onOpenChange,
  region,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  region: RegionRegionItem
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({
        code: region.code ?? "",
        display_name: region.display_name ?? "",
        name: region.name ?? "",
        country: region.country ?? "",
        city: region.city ?? "",
        flag: region.flag ?? "",
        latitude: region.latitude ?? 0,
        longitude: region.longitude ?? 0,
        network_provider: region.network_provider ?? "",
        description: region.description ?? "",
        features: region.features?.join(", ") ?? "",
        test_ip: region.test_ip ?? "",
        image: region.image ?? "",
        public_visible: region.public_visible ?? false,
        status: region.status ?? 1,
        sort_order: region.sort_order ?? 0,
      })
    }
  }, [open, region, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const features = parseTags(values.features ?? "")
      const { data: res } = await putAdminRegionsById({
        path: { id: region.id! },
        body: {
          code: values.code,
          display_name: values.display_name,
          name: values.name || values.display_name,
          country: values.country,
          city: values.city,
          flag: values.flag,
          latitude: values.latitude,
          longitude: values.longitude,
          network_provider: values.network_provider,
          description: values.description,
          features,
          test_ip: values.test_ip,
          image: values.image,
          public_visible: values.public_visible,
          status: values.status,
          sort_order: values.sort_order,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames,
        })
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="编辑区域"
      description="修改区域信息"
      footer={
        <Button form="region-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="region-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <RegionFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
