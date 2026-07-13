import { useEffect, useState, useCallback } from "react"
import { getAdminIpsFree } from "@/api"
import type { IppoolFreeIpItem } from "@/api"
import { usePaginatedFetch, type PaginatedFetchResult } from "@/hooks/use-paginated-fetch"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const PAGE_SIZE = 20

// 空闲 IP 选择对话框：搜索/分页/滚动加载由 usePaginatedFetch 承担，提交动作由调用方通过 onConfirm 注入
export function FreeIpPickerDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  confirmLabel: string
  onConfirm: (ip: IppoolFreeIpItem) => Promise<void>
}) {
  const [selectedIP, setSelectedIP] = useState<IppoolFreeIpItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fetchIPs = useCallback(async (page: number, keyword: string): Promise<PaginatedFetchResult<IppoolFreeIpItem>> => {
    const { data: res } = await getAdminIpsFree({
      query: { page, page_size: PAGE_SIZE, keyword: keyword || undefined },
    })
    const items = res?.data?.items ?? []
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])
  const {
    items: ips,
    loading,
    keyword,
    hasMore,
    handleSearch,
    handleLoadMore,
    sentinelRef,
  } = usePaginatedFetch(open, fetchIPs)
  // 打开时清空上次的选择
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置选择
    if (open) setSelectedIP(null)
  }, [open])
  const handleSubmit = async () => {
    if (!selectedIP?.id) return
    setSubmitting(true)
    try {
      await onConfirm(selectedIP)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} disablePointerSelection className="rounded-md border">
          <CommandInput
            placeholder="搜索 IP 地址或池名称..."
            value={keyword}
            onValueChange={handleSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {loading ? "搜索中..." : "未找到匹配的空闲 IP"}
            </CommandEmpty>
            <CommandGroup>
              {ips.map((ip) => (
                <CommandItem
                  key={ip.id}
                  value={String(ip.id)}
                  data-checked={ip.id === selectedIP?.id}
                  onSelect={() => setSelectedIP(ip)}
                >
                  <span className="font-mono font-medium">{ip.address}</span>
                  <span className="text-xs text-muted-foreground">
                    {ip.pool_name} · {ip.pool_type?.toUpperCase()}
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
        {selectedIP && (
          <p className="text-sm">
            已选择: <span className="font-mono font-medium">{selectedIP.address}</span>
            <span className="text-muted-foreground"> · {selectedIP.pool_name}</span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!selectedIP || submitting}>
            {submitting && <Spinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
