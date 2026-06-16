import { useEffect, useState, useCallback, useRef } from "react"
import type { UseFormReturn } from "react-hook-form"
import { getAdminNodes, getAdminNodesById } from "@/api"
import type { NodeNodeItem } from "@/api"
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
import { Server, ChevronsUpDown } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

interface NodeSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  onNodeSwitch?: (node: NodeNodeItem) => void
}

export function NodeSelector({ form, onNodeSwitch }: NodeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [nodes, setNodes] = useState<NodeNodeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const selectedNodeId = form.watch("node_id")
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const fetchNodes = useCallback(async (p: number, kw: string, append: boolean) => {
    setLoading(true)
    try {
      const { data: res } = await getAdminNodes({
        query: { page: p, page_size: PAGE_SIZE, status: 1, keyword: kw || undefined },
      })
      const items = res?.data?.items ?? []
      setNodes((prev) => append ? [...prev, ...items] : items)
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
      fetchNodes(1, "", false)
    }
  }, [fetchNodes])

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleSearch = useCallback((value: string) => {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchNodes(1, value, false)
    }, 300)
  }, [fetchNodes])

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchNodes(page + 1, keyword, true)
  }, [loading, hasMore, page, keyword, fetchNodes])

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

  const prevNodeId = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!selectedNodeId) return
    const isSwitch = prevNodeId.current != null && prevNodeId.current !== selectedNodeId
    prevNodeId.current = selectedNodeId
    if (isSwitch) {
      const node = nodes.find((n) => n.id === selectedNodeId)
      if (node) onNodeSwitch?.(node)
    }
  }, [selectedNodeId, nodes, onNodeSwitch])

  return (
    <FormField
      control={form.control}
      name="node_id"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel required>宿主机节点</FormLabel>
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
                    <Server className="size-4 shrink-0 text-muted-foreground" />
                    {selectedNode
                      ? `${selectedNode.name}${selectedNode.host && selectedNode.host !== selectedNode.name ? ` (${selectedNode.host})` : ""}${selectedNode.region ? ` - ${selectedNode.region}` : ""}`
                      : "选择要部署到的宿主机节点"}
                  </div>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false} disablePointerSelection>
                <CommandInput
                  placeholder="搜索节点名称或地址..."
                  value={keyword}
                  onValueChange={handleSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {loading ? "搜索中..." : "未找到匹配的节点"}
                  </CommandEmpty>
                  <CommandGroup>
                    {nodes.map((node) => (
                      <CommandItem
                        key={node.id}
                        value={String(node.id)}
                        data-checked={node.id === field.value}
                        onSelect={() => {
                          field.onChange(node.id)
                          setOpen(false)
                        }}
                      >
                        <Server className="size-4 text-muted-foreground" />
                        <span>
                          {node.name}{node.host && node.host !== node.name ? ` (${node.host})` : ""}
                          {node.region && ` - ${node.region}`}
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
                          {loading ? (
                            <Spinner />
                          ) : (
                            "加载更多"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormDescription>选择实例将要运行的宿主机节点</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface NodeReadonlyProps {
  nodeId: number
  description?: string
}

export function NodeReadonly({ nodeId, description }: NodeReadonlyProps) {
  const [node, setNode] = useState<NodeNodeItem | null>(null)

  useEffect(() => {
    if (!nodeId) return
    let cancelled = false
    getAdminNodesById({ path: { id: nodeId } }).then(({ data: res }) => {
      if (!cancelled && res?.data) setNode(res.data as NodeNodeItem)
    })
    return () => { cancelled = true }
  }, [nodeId])

  return (
    <FormItem>
      <FormLabel>宿主机节点</FormLabel>
      <div className="flex items-center gap-2 text-sm">
        <Server className="size-4 text-muted-foreground" />
        <span className="font-medium">
          {node
            ? `${node.name}${node.host && node.host !== node.name ? ` (${node.host})` : ""}${node.region ? ` - ${node.region}` : ""}`
            : `节点 #${nodeId}`}
        </span>
      </div>
      {description && <FormDescription>{description}</FormDescription>}
    </FormItem>
  )
}
