import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { deletePortalExtensionsByIdBinding, postPortalExtensionsByIdBindingCode, type ServicePluginConnection } from '@/api'
import { getPortalExtensionsOptions, getPortalExtensionsQueryKey } from '@/api/@tanstack/react-query.gen'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealOnceDialog } from '@/components/reveal-once-dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { getErrorMessage } from '@/lib/utils'

const permissions: Record<string, string> = {
  accounts: '绑定外部账号',
  'instances:read': '查询您的服务器',
  'instances:operate': '启动、停止和重启您的服务器',
}

export function PluginConnections() {
  const queryClient = useQueryClient()
  const query = useQuery(getPortalExtensionsOptions())
  const [authorize, setAuthorize] = useState<ServicePluginConnection | null>(null)
  const [revoke, setRevoke] = useState<ServicePluginConnection | null>(null)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [codeOpen, setCodeOpen] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: getPortalExtensionsQueryKey() })

  async function issueCode() {
    if (!authorize?.id) return
    setBusy(true)
    try {
      const { data } = await postPortalExtensionsByIdBindingCode({ path: { id: authorize.id }, body: { permissions: authorize.permissions ?? [] } })
      if (data?.code !== 0 || !data.data?.code) throw new Error(data?.message || '生成配对码失败')
      setCode(data.data.code)
      setCodeOpen(true)
      setAuthorize(null)
    } catch (err) { toast.error(getErrorMessage(err, '生成配对码失败')) }
    finally { setBusy(false) }
  }

  async function revokeBinding() {
    if (!revoke?.id) return
    setBusy(true)
    try {
      const { data } = await deletePortalExtensionsByIdBinding({ path: { id: revoke.id } })
      if (data?.code !== 0) throw new Error(data?.message || '解除绑定失败')
      toast.success('已解除绑定，未使用的配对码也已失效')
      setRevoke(null)
      await refresh()
    } catch (err) { toast.error(getErrorMessage(err, '解除绑定失败')) }
    finally { setBusy(false) }
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">扩展连接</h3>
        <p className="text-sm text-muted-foreground">将外部账号与本站绑定，可随时撤销授权。绑定完成后点击刷新查看状态。</p>
      </div>
      {query.isLoading ? <Skeleton className="h-24 w-full" /> : query.isError ? (
        <Button variant="outline" onClick={() => void query.refetch()}>加载失败，点击重试</Button>
      ) : (
        <>
          {(query.data?.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">暂无可连接的扩展</p>}
          {(query.data?.data ?? []).map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{item.name}{!item.enabled && '（已停用）'}</p>
                <p className="text-sm text-muted-foreground break-words">{item.external_id ? `已绑定：${item.external_id}` : item.description}</p>
                <p className="text-sm text-muted-foreground">授权范围：{item.permissions?.map((p) => permissions[p]).filter(Boolean).join('、')}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {item.external_id ? <Button variant="outline" onClick={() => setRevoke(item)}>解除绑定</Button> : <>
                  <Button disabled={!item.enabled} onClick={() => setAuthorize(item)}>生成配对码</Button>
                  <Button variant="ghost" onClick={() => setRevoke(item)}>撤销配对码</Button>
                </>}
              </div>
            </div>
          ))}
          <Button variant="outline" disabled={query.isFetching} onClick={() => void refresh()}>刷新绑定状态</Button>
        </>
      )}
      <AlertDialog open={!!authorize} onOpenChange={(open) => { if (!open && !busy) setAuthorize(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>授权连接 {authorize?.name}</AlertDialogTitle>
            <AlertDialogDescription>绑定后，此扩展可以{authorize?.permissions?.map((p) => permissions[p]).filter(Boolean).join('、')}。仅将配对码发送给您信任的对应服务。配对码五分钟内有效，重新生成会使旧码失效。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void issueCode() }}>{busy && <Loader2 className="size-4 animate-spin" />}确认并生成</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!revoke} onOpenChange={(open) => { if (!open && !busy) setRevoke(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>撤销 {revoke?.name} 的授权</AlertDialogTitle><AlertDialogDescription>解除绑定并使尚未使用的配对码失效，外部服务将无法继续访问您的服务器。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void revokeBinding() }}>确认撤销</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RevealOnceDialog open={codeOpen} onOpenChange={(open) => { setCodeOpen(open); if (!open) setCode('') }} title="扩展配对码" description="配对码五分钟内有效，仅可使用一次。请按对应扩展的说明完成绑定。" value={code} />
    </section>
  )
}
