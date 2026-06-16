import { useEffect, useState, useCallback, useRef } from "react"
import type { UseFormReturn } from "react-hook-form"
import { getAdminIpsFree } from "@/api"
import type { IppoolFreeIpItem } from "@/api"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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
import { Globe, ChevronsUpDown, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

interface IPSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function IPSelector({ form }: IPSelectorProps) {
  const [open, setOpen] = useState(false)
  const [ips, setIps] = useState<IppoolFreeIpItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const selectedIpId = form.watch("ip_id")
  const selectedIp = ips.find((ip) => ip.id === selectedIpId)

  const fetchIPs = useCallback(async (p: number, kw: string, append: boolean) => {
    setLoading(true)
    try {
      const { data: res } = await getAdminIpsFree({
        query: { page: p, page_size: PAGE_SIZE, keyword: kw || undefined },
      })
      const data = res?.data as { items?: IppoolFreeIpItem[] } | undefined
      const items: IppoolFreeIpItem[] = data?.items ?? []
      setIps((prev) => append ? [...prev, ...items] : items)
      setHasMore(items.length >= PAGE_SIZE)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePopoverOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setKeyword("")
      setPage(1)
      setHasMore(true)
      fetchIPs(1, "", false)
    }
  }, [fetchIPs])

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleSearch = useCallback((value: string) => {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchIPs(1, value, false)
    }, 300)
  }, [fetchIPs])

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchIPs(page + 1, keyword, true)
  }, [loading, hasMore, page, keyword, fetchIPs])

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!hasMore || loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const root = sentinel.closest("[cmdk-list]") as Element | null
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore()
      },
      { root, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, handleLoadMore])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    form.setValue("ip_id", undefined)
  }, [form])

  return (
    <FormField
      control={form.control}
      name="ip_id"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>IP 地址</FormLabel>
          <Popover open={open} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "w-full justify-between font-normal border border-input bg-transparent hover:bg-transparent aria-expanded:bg-transparent dark:bg-input/30 dark:hover:bg-input/50 dark:aria-expanded:bg-input/50",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                    {selectedIp
                      ? `${selectedIp.address} — ${selectedIp.pool_name}（${selectedIp.pool_type?.toUpperCase()}）`
                      : "不分配 IP（使用 DHCP）"}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {field.value && (
                      <span
                        role="button"
                        tabIndex={-1}
                        className="rounded-sm opacity-50 hover:opacity-100"
                        onClick={handleClear}
                        onKeyDown={() => {}}
                      >
                        <X className="size-3.5" />
                      </span>
                    )}
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </div>
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false} disablePointerSelection>
                <CommandInput
                  placeholder="搜索 IP 地址或池名称..."
                  value={keyword}
                  onValueChange={handleSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {loading ? "搜索中..." : "未找到匹配的空闲 IP"}
                  </CommandEmpty>
                  <CommandGroup>
                    {ips.map((ip) => (
                      <CommandItem
                        key={ip.id}
                        value={String(ip.id)}
                        data-checked={ip.id === field.value}
                        onSelect={() => {
                          field.onChange(ip.id)
                          setOpen(false)
                        }}
                      >
                        <span className="font-mono">{ip.address}</span>
                        <span className="text-muted-foreground ml-1">
                          — {ip.pool_name}（{ip.pool_type?.toUpperCase()}）
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {hasMore && (
                    <>
                      <div ref={sentinelRef} className="h-1" />
                      <div className="p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-muted-foreground"
                          disabled={loading}
                          onClick={handleLoadMore}
                        >
                          {loading ? <Spinner /> : "加载更多"}
                        </Button>
                      </div>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormDescription>
            从 IP 池中选择一个空闲 IP 分配给实例，或留空使用 DHCP 自动获取
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
