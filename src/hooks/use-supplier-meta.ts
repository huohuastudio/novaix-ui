import { useCallback, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { postAdminSupplierConnectionsByIdOptions } from "@/api"
import type { ProviderField, ServiceSupplierPluginItem } from "@/api"
import {
  getAdminSupplierConnectionsOptions,
  getAdminSupplierPluginsOptions,
  getAdminSupplierProductsOptions,
} from "@/api/@tanstack/react-query.gen"
import type { RemoteOptionsFetch } from "@/components/provider-settings-form"
import { REMOTE_LABEL_SUFFIX, stripRemoteLabels } from "@/lib/supplier-constants"
import { getErrorMessage } from "@/lib/utils"

/** 供应商插件列表（含字段声明与能力），按 id 建索引 */
export function useSupplierPlugins(enabled = true) {
  const query = useQuery({ ...getAdminSupplierPluginsOptions(), enabled })
  const plugins = useMemo<ServiceSupplierPluginItem[]>(() => query.data?.data ?? [], [query.data])
  const pluginMap = useMemo(() => new Map(plugins.map((p) => [p.id ?? "", p])), [plugins])
  return { plugins, pluginMap, loading: query.isPending && enabled }
}

/** 插件是否声明了某能力 */
export function hasCapability(plugin: ServiceSupplierPluginItem | undefined, capability: string) {
  return !!plugin?.capabilities?.includes(capability)
}

/** 供应商连接字典（供筛选与下拉选择，连接数量通常很少，取首页 100 条） */
export function useSupplierConnectionList() {
  const query = useQuery(getAdminSupplierConnectionsOptions({ query: { page: 1, page_size: 100 } }))
  const connections = useMemo(() => query.data?.data?.items ?? [], [query.data])
  const options = useMemo(
    () => connections.map((c) => ({ label: c.name ?? `连接 ${c.id}`, value: String(c.id) })),
    [connections],
  )
  return { connections, options, loading: query.isPending }
}

/** 模块商品字典（供服务列表筛选） */
export function useSupplierProductList() {
  const query = useQuery(getAdminSupplierProductsOptions({ query: { page: 1, page_size: 100 } }))
  const products = useMemo(() => query.data?.data?.items ?? [], [query.data])
  const options = useMemo(
    () => products.map((p) => ({ label: p.name ?? `商品 ${p.id}`, value: String(p.id) })),
    [products],
  )
  return { products, options }
}

/**
 * 插件动态字段（连接配置 / 商品配置 / 操作参数）的本地状态：值与错误。
 * 远程选项字段选中后同时写入 `<key>__label` 保存显示名，便于编辑回显。
 */
export function useSupplierDynamicConfig() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const change = useCallback((f: ProviderField, v: string, label?: string) => {
    const key = f.key ?? ""
    setConfig((prev) => {
      const next = { ...prev, [key]: v }
      if (f.options_remote) next[key + REMOTE_LABEL_SUFFIX] = v ? label || v : ""
      return next
    })
    setErrors((prev) => {
      if (!prev[key]) return prev
      const n = { ...prev }
      delete n[key]
      return n
    })
  }, [])

  return { config, setConfig, errors, setErrors, change }
}

/**
 * 供应商插件远程选项：按连接调用上游分页加载下拉选项，并缓存已加载选项的显示名，
 * 供表单在选中后写入 `<key>__label` 以便编辑回显。
 * values 为当前已填写的值（会作为上游查询参数），需为引用稳定的状态对象。
 */
export function useSupplierRemoteOptions(
  connectionId: number | undefined,
  scope: "connection" | "product",
  values: Record<string, string>,
) {
  const labelCache = useRef(new Map<string, string>())

  const remoteFetch = useCallback<RemoteOptionsFetch>(
    async (field, page, keyword) => {
      if (!connectionId || !field.key) return { items: [], hasMore: false }
      try {
        const { data: res } = await postAdminSupplierConnectionsByIdOptions({
          path: { id: connectionId },
          body: { field: field.key, scope, values: stripRemoteLabels(values), page, keyword: keyword || undefined },
        })
        const items = (res?.data?.items ?? []).map((o) => ({
          id: o.value ?? "",
          label: o.label || o.value || "",
          description: o.description,
        }))
        for (const item of items) labelCache.current.set(`${field.key}\u0000${item.id}`, item.label)
        return { items, hasMore: !!res?.data?.has_more }
      } catch (err) {
        toast.error(getErrorMessage(err, `加载「${field.label ?? field.key}」选项失败`))
        return { items: [], hasMore: false }
      }
    },
    [connectionId, scope, values],
  )

  /** 已加载选项的显示名，未命中时返回空串 */
  const labelOf = useCallback(
    (field: ProviderField, value: string) => labelCache.current.get(`${field.key}\u0000${value}`) ?? "",
    [],
  )

  return { remoteFetch, labelOf }
}
