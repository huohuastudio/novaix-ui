import { useState, useCallback, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { usePaginatedFetch, type PaginatedFetchResult } from "@/hooks/use-paginated-fetch"

export interface PaginatedSelectItem {
  id: string
  label: string
  description?: string
}

interface PaginatedSelectProps {
  value: string
  onChange: (value: string) => void
  fetchFn: (page: number, keyword: string) => Promise<PaginatedFetchResult<PaginatedSelectItem>>
  initialItem?: PaginatedSelectItem
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
}

export function PaginatedSelect({
  value,
  onChange,
  fetchFn,
  initialItem,
  placeholder = "选择...",
  searchPlaceholder = "搜索...",
  emptyText = "无匹配项",
}: PaginatedSelectProps) {
  const [open, setOpen] = useState(false)

  // 缓存已加载过的选项，确保选中项始终能显示 label
  const [itemCache, setItemCache] = useState<Map<string, PaginatedSelectItem>>(new Map())

  useEffect(() => {
    if (initialItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 同步外部传入的初始值到缓存
      setItemCache((prev) => {
        const next = new Map(prev)
        next.set(initialItem.id, initialItem)
        return next
      })
    }
  }, [initialItem])

  const cachingFetchFn = useCallback(async (page: number, keyword: string) => {
    const result = await fetchFn(page, keyword)
    setItemCache((prev) => {
      const next = new Map(prev)
      for (const item of result.items) {
        next.set(item.id, item)
      }
      return next
    })
    return result
  }, [fetchFn])

  const {
    items,
    loading,
    keyword,
    hasMore,
    handleSearch,
    handleLoadMore,
    sentinelRef,
  } = usePaginatedFetch(open, cachingFetchFn)

  const selectedItem = value ? (itemCache.get(value) ?? { id: value, label: value }) : null

  const handleSelect = (itemId: string) => {
    onChange(itemId === value ? "" : itemId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedItem ? (
            <span className="truncate">{selectedItem.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false} disablePointerSelection>
          <CommandInput
            placeholder={searchPlaceholder}
            value={keyword}
            onValueChange={handleSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "搜索中..." : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4 shrink-0",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
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
                    size="sm"
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
  )
}
