import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { postAdminImages, putAdminImagesById } from "@/api"
import type { ImageImageItem, ImageGroupItem } from "@/api"
import { handleServerErrors } from "@/lib/form-utils"
import { useTasks } from "@/hooks/use-tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TusUploader } from "@/components/tus-uploader"
import { ImageSelector, type ImageSelectInfo } from "@/components/image-selector"
import { getErrorMessage } from "@/lib/utils"

const OS_OPTIONS = ["Ubuntu", "Debian", "CentOS", "Rocky Linux", "AlmaLinux", "Alpine", "Fedora", "Arch Linux", "openSUSE"]

const osLabelMap: Record<string, string> = {
  ubuntu: "Ubuntu",
  debian: "Debian",
  centos: "CentOS",
  rockylinux: "Rocky Linux",
  almalinux: "AlmaLinux",
  alpine: "Alpine",
  fedora: "Fedora",
  archlinux: "Arch Linux",
  opensuse: "openSUSE",
}
const ARCH_OPTIONS = ["amd64", "arm64"]
const TYPE_OPTIONS = [
  { value: "container", label: "容器" },
  { value: "virtual-machine", label: "虚拟机" },
]

const createFields = {
  name: z.string().min(1, "请输入名称").max(128),
  os: z.string().min(1, "请选择操作系统"),
  version: z.string().min(1, "请输入版本号").max(64),
  arch: z.string().default("amd64"),
  type: z.string().default("virtual-machine"),
  min_disk: z.coerce.number().int().min(0).default(0),
  min_memory: z.coerce.number().int().min(0).default(0),
  default_user: z.string().max(32).default("root"),
  cloud_init: z.boolean().default(true),
  description: z.string().max(255).default(""),
  status: z.coerce.number().int().min(0).max(1).default(1),
  // 分组与高级配置（group_id/模式以字符串存储，提交前归一化）
  group_id: z.string().default("0"),
  boot_script: z.string().max(8192).default(""),
  disk_mode: z.string().default("default"),
  cpu_mode: z.string().default("default"),
  boot_mode: z.string().default("default"),
  hidden: z.boolean().default(false),
}

const BOOT_MODE_OPTIONS = [
  { value: "default", label: "默认（UEFI 安全启动）" },
  { value: "secureboot", label: "UEFI 安全启动" },
  { value: "uefi", label: "UEFI（关闭安全启动）" },
  { value: "csm", label: "传统 BIOS" },
]
const DISK_MODE_OPTIONS = [
  { value: "default", label: "默认（virtio-scsi）" },
  { value: "virtio-blk", label: "virtio-blk" },
  { value: "nvme", label: "nvme" },
  { value: "usb", label: "usb" },
]
const CPU_MODE_OPTIONS = [
  { value: "default", label: "默认（宿主透传）" },
  { value: "host-passthrough", label: "host-passthrough" },
]

// normalizeImageValues 将表单值中的分组/模式哨兵值（"0"/"default"）归一化为后端请求字段
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeImageValues(values: any, isEdit: boolean): any {
  const { group_id, boot_script, disk_mode, cpu_mode, boot_mode, hidden, ...rest } = values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {
    ...rest,
    boot_script: boot_script || "",
    disk_mode: disk_mode === "default" ? "" : disk_mode,
    cpu_mode: cpu_mode === "default" ? "" : cpu_mode,
    boot_mode: boot_mode === "default" ? "" : boot_mode,
    hidden,
  }
  const gid = Number(group_id)
  if (gid > 0) {
    out.group_id = gid
  } else if (isEdit) {
    out.clear_group = true
  }
  return out
}

// 镜像库 - 从镜像服务器浏览选择
const librarySchema = z.object({
  ...createFields,
  alias: z.string().min(1, "请选择镜像").max(128),
  source_server: z.string().min(1).max(255),
})

// 远程下载 - 填写 HTTP 下载链接
const urlSchema = z.object({
  ...createFields,
  source_url: z.string().url("请输入有效的下载链接").max(512),
})

const uploadSchema = z.object(createFields)

const localSchema = z.object({
  ...createFields,
  local_path: z.string().min(1, "请输入文件路径").max(512),
})

type LibraryFormValues = z.infer<typeof librarySchema>
type URLFormValues = z.infer<typeof urlSchema>
type UploadFormValues = z.infer<typeof uploadSchema>
type LocalFormValues = z.infer<typeof localSchema>

const extraDefaults = {
  min_disk: 0, min_memory: 0, default_user: "root", cloud_init: true, description: "", status: 1,
  group_id: "0", boot_script: "", disk_mode: "default", cpu_mode: "default", boot_mode: "default", hidden: false,
}

const libraryDefaults: LibraryFormValues = {
  name: "", os: "", version: "", arch: "amd64", type: "virtual-machine",
  alias: "", source_server: "https://images.linuxcontainers.org",
  ...extraDefaults,
}

const urlDefaults: URLFormValues = {
  name: "", os: "", version: "", arch: "amd64", type: "virtual-machine",
  source_url: "",
  ...extraDefaults,
}

const uploadDefaults: UploadFormValues = {
  name: "", os: "", version: "", arch: "amd64", type: "virtual-machine",
  ...extraDefaults,
}

const localDefaults: LocalFormValues = {
  name: "", os: "", version: "", arch: "amd64", type: "virtual-machine",
  local_path: "",
  ...extraDefaults,
}

const libraryFieldNames = Object.keys(libraryDefaults) as string[]
const urlFieldNames = Object.keys(urlDefaults) as string[]
const uploadFieldNames = Object.keys(uploadDefaults) as string[]
const localFieldNames = Object.keys(localDefaults) as string[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CoreFields({ form }: { form: any }) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel required>名称</FormLabel>
          <FormControl><Input placeholder="Ubuntu 22.04 LTS" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="os" render={({ field }) => (
          <FormItem>
            <FormLabel required>操作系统</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="选择操作系统" /></SelectTrigger></FormControl>
              <SelectContent>
                {OS_OPTIONS.map(os => <SelectItem key={os} value={os}>{os}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="version" render={({ field }) => (
          <FormItem>
            <FormLabel required>版本</FormLabel>
            <FormControl><Input placeholder="22.04" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="arch" render={({ field }) => (
          <FormItem>
            <FormLabel>架构</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {ARCH_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>类型</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ExtraFields({ form }: { form: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="min_disk" render={({ field }) => (
          <FormItem>
            <FormLabel>最小磁盘 (GB)</FormLabel>
            <FormControl><Input type="number" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="min_memory" render={({ field }) => (
          <FormItem>
            <FormLabel>最小内存 (MB)</FormLabel>
            <FormControl><Input type="number" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="default_user" render={({ field }) => (
        <FormItem>
          <FormLabel>默认用户</FormLabel>
          <FormControl><Input placeholder="root" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>描述</FormLabel>
          <FormControl><Input placeholder="可选描述信息" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="cloud_init" render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel className="!mt-0">Cloud-Init</FormLabel>
            <p className="text-xs text-muted-foreground">启用后可在创建实例时注入密码、SSH 密钥等初始化配置</p>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />
      <FormField control={form.control} name="status" render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel className="!mt-0">启用</FormLabel>
            <p className="text-xs text-muted-foreground">禁用后该镜像不会出现在创建实例的镜像选项中</p>
          </div>
          <FormControl>
            <Switch checked={field.value === 1} onCheckedChange={(v: boolean) => field.onChange(v ? 1 : 0)} />
          </FormControl>
        </FormItem>
      )} />
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AdvancedFields({ form, groups }: { form: any; groups: ImageGroupItem[] }) {
  const isVM = form.watch("type") === "virtual-machine"
  return (
    <>
      <FormField control={form.control} name="group_id" render={({ field }) => (
        <FormItem>
          <FormLabel>分组</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder="无分组" /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="0">无分组</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="boot_script" render={({ field }) => (
        <FormItem>
          <FormLabel>开机脚本</FormLabel>
          <FormControl><Textarea rows={4} placeholder={"#cloud-config 格式，例如：\nruncmd:\n  - echo hello > /root/init.log"} className="font-mono text-xs" {...field} /></FormControl>
          <p className="text-xs text-muted-foreground">cloud-config 格式，开通实例时与 SSH 公钥合并注入（需镜像启用 Cloud-Init）</p>
          <FormMessage />
        </FormItem>
      )} />
      {isVM && (
        <div className="grid grid-cols-3 gap-4">
          <FormField control={form.control} name="boot_mode" render={({ field }) => (
            <FormItem>
              <FormLabel>启动模式</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {BOOT_MODE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="disk_mode" render={({ field }) => (
            <FormItem>
              <FormLabel>磁盘模式</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {DISK_MODE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="cpu_mode" render={({ field }) => (
            <FormItem>
              <FormLabel>CPU 模式</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {CPU_MODE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}
      <FormField control={form.control} name="hidden" render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel className="!mt-0">客户端隐藏</FormLabel>
            <p className="text-xs text-muted-foreground">开启后该镜像不会出现在用户端的镜像选择列表中</p>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />
    </>
  )
}

function CreateImageForm({ open, onOpenChange, onSuccess, groups }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  groups: ImageGroupItem[]
}) {
  const [tab, setTab] = useState<"library" | "url" | "upload" | "local">("library")
  const [uploading, setUploading] = useState(false)
  const [uploadId, setUploadId] = useState("")
  const fileRef = useRef<File | null>(null)
  const [fileName, setFileName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { addTask } = useTasks()

  const libraryForm = useForm<LibraryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(librarySchema) as any,
    defaultValues: libraryDefaults,
  })

  const urlForm = useForm<URLFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(urlSchema) as any,
    defaultValues: urlDefaults,
  })

  const uploadForm = useForm<UploadFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(uploadSchema) as any,
    defaultValues: uploadDefaults,
  })

  const localForm = useForm<LocalFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(localSchema) as any,
    defaultValues: localDefaults,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("library")
      setUploading(false)
      setUploadId("")
      setFileName("")
      fileRef.current = null
      libraryForm.reset(libraryDefaults)
      urlForm.reset(urlDefaults)
      uploadForm.reset(uploadDefaults)
      localForm.reset(localDefaults)
    }
  }, [open, libraryForm, urlForm, uploadForm, localForm])

  function makeSubmitHandler(
    sourceType: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: { setError: any; handleSubmit: any },
    fieldNames: string[],
    extra?: Record<string, unknown>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (values: any) => {
      try {
        const { data: res, error } = await postAdminImages({
          body: { ...normalizeImageValues(values, false), source_type: sourceType, ...extra },
        })
        const result = res ?? error
        if (result?.code !== 0) {
          handleServerErrors(result, { setError: form.setError, fieldNames })
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (result as any)?.data as ImageImageItem | undefined
        if (data?.download_task_id) {
          addTask(data.download_task_id, "download_image")
          toast.success("镜像已创建，正在后台下载", { description: `任务 #${data.download_task_id} 正在执行` })
        } else {
          toast.success("镜像已创建")
        }
        onSuccess()
      } catch (err) {
        toast.error(getErrorMessage(err, "请求失败，请重试"))
      }
    }
  }

  const onSubmitLibrary = makeSubmitHandler("remote", libraryForm, libraryFieldNames)
  const onSubmitURL = makeSubmitHandler("url", urlForm, urlFieldNames)
  const onSubmitUpload = makeSubmitHandler("upload", uploadForm, uploadFieldNames, { upload_id: uploadId })
  const onSubmitLocal = makeSubmitHandler("local", localForm, localFieldNames)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      fileRef.current = file
      setFileName(file.name)
      setUploading(true)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUploadSuccess = (upload: any) => {
    const url: string = upload.url || ""
    const id = url.split("/").pop() || ""
    setUploadId(id)
    setUploading(false)
  }

  const uploadDone = !!uploadId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg" preventClose>
        <DialogHeader>
          <DialogTitle>添加镜像</DialogTitle>
          <DialogDescription>添加操作系统镜像到全局目录</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="library" className="flex-1">镜像库</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">远程下载</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">上传镜像</TabsTrigger>
            <TabsTrigger value="local" className="flex-1">本地路径</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0 min-h-0 flex-1 overflow-y-auto pt-4">
            <Form {...libraryForm}>
              <form className="flex flex-col gap-4">
                <FormField control={libraryForm.control} name="alias" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>选择镜像</FormLabel>
                    <FormControl>
                      <ImageSelector
                        value={field.value}
                        onChange={field.onChange}
                        onServerChange={(s) => libraryForm.setValue("source_server", s)}
                        onImageSelect={(info: ImageSelectInfo) => {
                          const osLabel = osLabelMap[info.os] ?? info.os
                          libraryForm.setValue("name", `${osLabel} ${info.version}`)
                          libraryForm.setValue("os", osLabel)
                          libraryForm.setValue("version", info.version)
                          libraryForm.setValue("cloud_init", info.variant === "cloud")
                          if (info.arch.length === 1) {
                            libraryForm.setValue("arch", info.arch[0])
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <CoreFields form={libraryForm} />
                <ExtraFields form={libraryForm} />
                <AdvancedFields form={libraryForm} groups={groups} />
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="url" className="mt-0 min-h-0 flex-1 overflow-y-auto pt-4">
            <Form {...urlForm}>
              <form className="flex flex-col gap-4">
                <FormField control={urlForm.control} name="source_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>下载链接</FormLabel>
                    <FormControl><Input placeholder="https://example.com/images/ubuntu-22.04.tar.gz" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">支持 HTTP/HTTPS 直链，文件将下载到服务器本地</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <CoreFields form={urlForm} />
                <ExtraFields form={urlForm} />
                <AdvancedFields form={urlForm} groups={groups} />
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="upload" className="mt-0 min-h-0 flex-1 overflow-y-auto pt-4">
            <div className="flex flex-col gap-4">
              {/* eslint-disable-next-line react-hooks/refs */}
              {uploading && fileRef.current ? (
                <TusUploader
                  endpoint="/api/v1/admin/upload/"
                  // eslint-disable-next-line react-hooks/refs
                  file={fileRef.current}
                  onSuccess={handleUploadSuccess}
                  onError={(err) => { setUploading(false); toast.error("文件上传失败", { description: err.message }) }}
                />
              ) : (
                <div>
                  <Label>镜像文件 <span className="text-destructive">*</span></Label>
                  <div
                    className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
                    onClick={() => inputRef.current?.click()}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      {uploadDone ? `${fileName} ✓` : fileName || "点击选择 .tar.gz / .tar.xz 文件"}
                    </span>
                    <Button type="button" variant="outline" className="shrink-0" disabled={uploadDone}>
                      {uploadDone ? "已上传" : "选择文件"}
                    </Button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".tar.gz,.tar.xz,.tar,.gz,.xz,.squashfs,.img,.qcow2"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={uploadDone}
                    />
                  </div>
                </div>
              )}
              <Form {...uploadForm}>
                <form className="flex flex-col gap-4">
                  <CoreFields form={uploadForm} />
                  <ExtraFields form={uploadForm} />
                  <AdvancedFields form={uploadForm} groups={groups} />
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="local" className="mt-0 min-h-0 flex-1 overflow-y-auto pt-4">
            <Form {...localForm}>
              <form className="flex flex-col gap-4">
                <FormField control={localForm.control} name="local_path" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>服务器文件路径</FormLabel>
                    <FormControl><Input placeholder="/data/images/ubuntu-22.04.tar.gz" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">填写镜像文件在服务器上的绝对路径</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <CoreFields form={localForm} />
                <ExtraFields form={localForm} />
                <AdvancedFields form={localForm} groups={groups} />
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        <DialogFooter className="shrink-0">
          {tab === "library" && (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <Button onClick={libraryForm.handleSubmit(onSubmitLibrary as any)} disabled={libraryForm.formState.isSubmitting}>
              {libraryForm.formState.isSubmitting ? "提交中..." : "创建"}
            </Button>
          )}
          {tab === "url" && (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <Button onClick={urlForm.handleSubmit(onSubmitURL as any)} disabled={urlForm.formState.isSubmitting}>
              {urlForm.formState.isSubmitting ? "提交中..." : "创建"}
            </Button>
          )}
          {tab === "upload" && uploadDone && (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <Button onClick={uploadForm.handleSubmit(onSubmitUpload as any)} disabled={uploadForm.formState.isSubmitting}>
              {uploadForm.formState.isSubmitting ? "保存中..." : "保存"}
            </Button>
          )}
          {tab === "local" && (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <Button onClick={localForm.handleSubmit(onSubmitLocal as any)} disabled={localForm.formState.isSubmitting}>
              {localForm.formState.isSubmitting ? "提交中..." : "创建"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 编辑表单 ──

const editSchema = z.object(createFields)

type EditFormValues = z.infer<typeof editSchema>

const editDefaults: EditFormValues = {
  name: "", os: "", version: "", arch: "amd64", type: "virtual-machine",
  ...extraDefaults,
}

const editFieldNames = Object.keys(editDefaults) as string[]

function EditImageForm({ open, onOpenChange, image, onSuccess, groups }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageImageItem
  onSuccess: () => void
  groups: ImageGroupItem[]
}) {
  const form = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: editDefaults,
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: image.name ?? "",
        os: image.os ?? "",
        version: image.version ?? "",
        arch: image.arch ?? "amd64",
        type: image.type ?? "virtual-machine",
        min_disk: image.min_disk ?? 0,
        min_memory: image.min_memory ?? 0,
        default_user: image.default_user ?? "root",
        cloud_init: image.cloud_init ?? true,
        description: image.description ?? "",
        status: image.status ?? 1,
        group_id: image.group_id ? String(image.group_id) : "0",
        boot_script: image.boot_script ?? "",
        disk_mode: image.disk_mode || "default",
        cpu_mode: image.cpu_mode || "default",
        boot_mode: image.boot_mode || "default",
        hidden: image.hidden ?? false,
      })
    }
  }, [open, image, form])

  const onSubmit = async (values: EditFormValues) => {
    try {
      const { data: res, error } = await putAdminImagesById({
        path: { id: image.id! },
        body: normalizeImageValues(values, true),
      })
      const result = res ?? error
      if (result?.code !== 0) {
        handleServerErrors<EditFormValues>(result, { setError: form.setError, fieldNames: editFieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败，请重试"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg" preventClose>
        <DialogHeader>
          <DialogTitle>编辑镜像</DialogTitle>
          <DialogDescription>修改镜像元数据</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Form {...form}>
            <form className="flex flex-col gap-4">
              <CoreFields form={form} />
              <ExtraFields form={form} />
              <AdvancedFields form={form} groups={groups} />
            </form>
          </Form>
        </div>
        <DialogFooter className="shrink-0">
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ImageFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image?: ImageImageItem
  onSuccess: () => void
  groups: ImageGroupItem[]
}

export default function ImageFormSheet({ open, onOpenChange, image, onSuccess, groups }: ImageFormSheetProps) {
  if (image) {
    return <EditImageForm open={open} onOpenChange={onOpenChange} image={image} onSuccess={onSuccess} groups={groups} />
  }
  return <CreateImageForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} groups={groups} />
}
