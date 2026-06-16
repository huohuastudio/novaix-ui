import { useState, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageOption {
  alias: string
  os: string
  version: string
  variant?: string
  arch: string[]
}

const imageCategories: { label: string; os: string; images: ImageOption[] }[] = [
  {
    label: "Ubuntu",
    os: "ubuntu",
    images: [
      { alias: "ubuntu/24.04/cloud", os: "ubuntu", version: "24.04 LTS (Noble)", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "ubuntu/22.04/cloud", os: "ubuntu", version: "22.04 LTS (Jammy)", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "ubuntu/24.04", os: "ubuntu", version: "24.04 LTS (Noble)", arch: ["amd64", "arm64"] },
      { alias: "ubuntu/22.04", os: "ubuntu", version: "22.04 LTS (Jammy)", arch: ["amd64", "arm64"] },
      { alias: "ubuntu/20.04", os: "ubuntu", version: "20.04 LTS (Focal)", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "Debian",
    os: "debian",
    images: [
      { alias: "debian/12/cloud", os: "debian", version: "12 (Bookworm)", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "debian/12", os: "debian", version: "12 (Bookworm)", arch: ["amd64", "arm64"] },
      { alias: "debian/11", os: "debian", version: "11 (Bullseye)", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "CentOS",
    os: "centos",
    images: [
      { alias: "centos/9-Stream/cloud", os: "centos", version: "9 Stream", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "centos/9-Stream", os: "centos", version: "9 Stream", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "Rocky Linux",
    os: "rockylinux",
    images: [
      { alias: "rockylinux/9/cloud", os: "rockylinux", version: "9", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "rockylinux/9", os: "rockylinux", version: "9", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "AlmaLinux",
    os: "almalinux",
    images: [
      { alias: "almalinux/9/cloud", os: "almalinux", version: "9", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "almalinux/9", os: "almalinux", version: "9", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "Alpine",
    os: "alpine",
    images: [
      { alias: "alpine/3.21/cloud", os: "alpine", version: "3.21", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "alpine/3.21", os: "alpine", version: "3.21", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "Fedora",
    os: "fedora",
    images: [
      { alias: "fedora/42/cloud", os: "fedora", version: "42", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "fedora/42", os: "fedora", version: "42", arch: ["amd64", "arm64"] },
    ],
  },
  {
    label: "Arch Linux",
    os: "archlinux",
    images: [
      { alias: "archlinux/current/cloud", os: "archlinux", version: "Rolling", variant: "cloud", arch: ["amd64"] },
      { alias: "archlinux/current", os: "archlinux", version: "Rolling", arch: ["amd64"] },
    ],
  },
  {
    label: "openSUSE",
    os: "opensuse",
    images: [
      { alias: "opensuse/16.0/cloud", os: "opensuse", version: "Leap 16.0", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "opensuse/tumbleweed/cloud", os: "opensuse", version: "Tumbleweed", variant: "cloud", arch: ["amd64", "arm64"] },
      { alias: "opensuse/16.0", os: "opensuse", version: "Leap 16.0", arch: ["amd64", "arm64"] },
      { alias: "opensuse/tumbleweed", os: "opensuse", version: "Tumbleweed", arch: ["amd64", "arm64"] },
    ],
  },
]

export interface ImageSelectInfo {
  alias: string
  os: string
  version: string
  variant?: string
  arch: string[]
}

interface ImageSelectorProps {
  value: string
  onChange: (alias: string) => void
  onServerChange?: (server: string) => void
  onProtocolChange?: (protocol: "simplestreams" | "incus") => void
  onImageSelect?: (info: ImageSelectInfo) => void
}

export function ImageSelector({ value, onChange, onServerChange, onProtocolChange, onImageSelect }: ImageSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const tabsListRef = useRef<HTMLDivElement>(null)

  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val)
    const container = tabsListRef.current
    if (!container) return
    const trigger = container.querySelector(`[data-value="${val}"]`) as HTMLElement | null
    if (!trigger) return
    const containerRect = container.getBoundingClientRect()
    const triggerRect = trigger.getBoundingClientRect()
    const scrollLeft = container.scrollLeft + (triggerRect.left + triggerRect.width / 2) - (containerRect.left + containerRect.width / 2)
    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }, [])

  const allImages = useMemo(
    () => imageCategories.flatMap((c) => c.images),
    []
  )

  const filteredImages = useMemo(() => {
    const q = search.toLowerCase()
    const source = activeTab === "all" ? allImages : imageCategories.find((c) => c.os === activeTab)?.images ?? []
    if (!q) return source
    return source.filter(
      (img) =>
        img.alias.toLowerCase().includes(q) ||
        img.version.toLowerCase().includes(q) ||
        img.os.toLowerCase().includes(q)
    )
  }, [search, activeTab, allImages])

  const handleSelect = (img: ImageOption) => {
    onChange(img.alias)
    onServerChange?.("https://images.linuxcontainers.org")
    onProtocolChange?.("simplestreams")
    onImageSelect?.({ alias: img.alias, os: img.os, version: img.version, variant: img.variant, arch: img.arch })
    setOpen(false)
  }

  return (
    <>
      <Button type="button" variant="default" size="sm" onClick={() => setOpen(true)}>
        浏览镜像库
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[80vh] overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>选择镜像</DialogTitle>
            <DialogDescription>
              从 images.linuxcontainers.org 镜像库选择操作系统镜像
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索镜像..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
            <TabsList ref={tabsListRef} className="w-full shrink-0 overflow-x-auto no-scrollbar justify-start">
              <TabsTrigger value="all" data-value="all">全部</TabsTrigger>
              {imageCategories.map((cat) => (
                <TabsTrigger key={cat.os} value={cat.os} data-value={cat.os}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-2 pb-4">
                {filteredImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    未找到匹配的镜像
                  </p>
                ) : (
                  filteredImages.map((img) => (
                    <button
                      key={img.alias}
                      type="button"
                      onClick={() => handleSelect(img)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                        value === img.alias && "border-primary bg-primary/5"
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm">{img.os}/{img.version}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {img.alias}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {img.arch.map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px] px-1 py-0">
                              {a}
                            </Badge>
                          ))}
                          {img.variant && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {img.variant}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {value === img.alias && (
                        <Check className="size-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
