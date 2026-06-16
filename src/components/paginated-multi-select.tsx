import { useState, useCallback, useEffect } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { usePaginatedFetch, type PaginatedFetchResult } from "@/hooks/use-paginated-fetch"

export interface PaginatedMultiSelectItem {
  id: string
  label: string
  description?: string
}

interface PaginatedMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  fetchFn: (page: number, keyword: string) => Promise<PaginatedFetchResult<PaginatedMultiSelectItem>>
  initialItems?: PaginatedMultiSelectItem[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
}

export function PaginatedMultiSelect({
  value,
  onChange,
  fetchFn,
  initialItems,
  placeholder = "选择...",
  searchPlaceholder = "搜索...",
  emptyText = "无匹配项",
}: PaginatedMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const [selectedCache, setSelectedCache] = useState<Map<string, PaginatedMultiSelectItem>>(new Map())

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 同步外部传入的初始值到缓存
      setSelectedCache((prev) => {
        const next = new Map(prev)
        for (const item of initialItems) {
          next.set(item.id, item)
        }
        return next
      })
    }
  }, [initialItems])

  const cachingFetchFn = useCallback(async (page: number, keyword: string) => {
    const result = await fetchFn(page, keyword)
    setSelectedCache((prev) => {
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

  const selectedItems = value.map(
    (v) => selectedCache.get(v) ?? { id: v, label: v }
  )

  const handleToggle = (itemId: string) => {
    if (value.includes(itemId)) {
      onChange(value.filter((v) => v !== itemId))
    } else {
      onChange([...value, itemId])
    }
  }

  const handleRemove = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== itemId))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-9 w-full justify-start font-normal"
        >
          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedItems.map((item) => (
                <Badge key={item.id} variant="secondary" className="gap-0.5 pr-0.5">
                  {item.label}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-0.5 rounded-sm p-0.5 hover:bg-muted-foreground/20"
                    onClick={(e) => handleRemove(item.id, e)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRemove(item.id, e as unknown as React.MouseEvent) }}
                  >
                    <X className="size-3" />
                  </span>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
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
                  data-checked={value.includes(item.id)}
                  onSelect={() => handleToggle(item.id)}
                >
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
