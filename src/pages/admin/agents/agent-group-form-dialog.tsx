import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminAgentGroups, putAdminAgentGroupsById } from "@/api"
import type { AgentGroupItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { FormSheet } from "@/components/form-sheet"

const schema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  commission_rate_first: z.coerce.number().int().min(0).max(100).default(10),
  commission_rate_recurring: z.coerce.number().int().min(0).max(100).default(0),
  discount_rate: z.coerce.number().int().min(0).max(100).default(0),
  description: z.string().max(512).default(""),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  name: "",
  commission_rate_first: 10,
  commission_rate_recurring: 0,
  discount_rate: 0,
  description: "",
}

const fieldNames = Object.keys(defaultValues)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: AgentGroupItem
  onSuccess: () => void
}

export default function AgentGroupFormDialog({ open, onOpenChange, group, onSuccess }: Props) {
  const isEdit = !!group
  const [serverError, setServerError] = useState("")

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerError("")
    if (group) {
      form.reset({
        name: group.name ?? "",
        commission_rate_first: group.commission_rate_first ?? 10,
        commission_rate_recurring: group.commission_rate_recurring ?? 0,
        discount_rate: group.discount_rate ?? 0,
        description: group.description ?? "",
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, group, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const body = {
        name: values.name,
        commission_rate_first: values.commission_rate_first,
        commission_rate_recurring: values.commission_rate_recurring,
        discount_rate: values.discount_rate,
        description: values.description,
      }
      const { data: res } = isEdit
        ? await putAdminAgentGroupsById({ path: { id: group!.id! }, body })
        : await postAdminAgentGroups({ body })
      if (res?.code !== 0) {
        handleServerErrors<FormValues>(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "编辑代理分组" : "添加代理分组"}
      description={isEdit ? "修改分组的返佣比例与分销折扣" : "创建一个代理分组，统一管理返佣与分销策略"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="agent-group-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "提交中..." : isEdit ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="agent-group-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <section>
            <h3 className="text-sm font-medium">基础信息</h3>
            <p className="text-xs text-muted-foreground mt-1">分组名称与说明</p>
            <div className="mt-4 flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>名称</FormLabel>
                    <FormControl><Input placeholder="金牌代理" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl><Textarea placeholder="长期合作代理，享更高返佣" rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium">返佣比例（AFF）</h3>
            <p className="text-xs text-muted-foreground mt-1">下级用户消费时给代理的提成比例</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commission_rate_first"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>首单返佣 (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} placeholder="20" {...field} /></FormControl>
                    <FormDescription>下级首次消费的提成比例</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commission_rate_recurring"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>后续返佣 (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} placeholder="5" {...field} /></FormControl>
                    <FormDescription>后续消费提成，0 表示关闭</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium">分销拿货折扣</h3>
            <p className="text-xs text-muted-foreground mt-1">
              大于 0 时该组代理为分销商：下级下单时按折扣价从代理预存余额扣款，差价为代理利润，此模式下不再发放上方返佣
            </p>
            <div className="mt-4 max-w-xs">
              <FormField
                control={form.control}
                name="discount_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>拿货折扣 (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} placeholder="0" {...field} /></FormControl>
                    <FormDescription>代理实付比例，如 70 表示按 7 折拿货；0 表示不启用分销</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
