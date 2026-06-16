import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { ChevronsUpDown, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { usePaginatedFetch, type PaginatedFetchResult } from "@/hooks/use-paginated-fetch"

export interface PaginatedComboboxItem {
  id: number
  label: string
  description?: string
}

interface PaginatedComboboxProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  fetchFn: (page: number, keyword: string) => Promise<PaginatedFetchResult<PaginatedComboboxItem>>
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  clearable?: boolean
}

export function PaginatedCombobox({
  value,
  onChange,
  fetchFn,
  placeholder = "请选择",
  searchPlaceholder = "搜索...",
  emptyText = "未找到匹配项",
  icon: Icon,
  disabled,
  clearable,
}: PaginatedComboboxProps) {
  const [open, setOpen] = useState(false)

  const {
    items,
    loading,
    keyword,
    hasMore,
    handleSearch,
    handleLoadMore,
    sentinelRef,
  } = usePaginatedFetch(open, fetchFn)

  const selectedItem = items.find((i) => i.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full min-w-0 justify-between font-normal border border-input bg-transparent hover:bg-transparent aria-expanded:bg-transparent dark:bg-input/30 dark:hover:bg-input/50 dark:aria-expanded:bg-input/50",
            !value && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
            {selectedItem
              ? selectedItem.description
                ? `${selectedItem.label} — ${selectedItem.description}`
                : selectedItem.label
              : placeholder}
          </div>
          {clearable && value ? (
            <span
              role="button"
              className="shrink-0 rounded-sm p-0.5 hover:bg-muted"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange(undefined)
              }}
            >
              <X className="size-3.5 opacity-50 hover:opacity-100" />
            </span>
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                  value={String(item.id)}
                  data-checked={item.id === value}
                  onSelect={() => {
                    onChange(item.id)
                    setOpen(false)
                  }}
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
