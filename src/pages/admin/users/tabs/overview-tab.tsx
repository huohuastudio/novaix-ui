import type { UserUserSummaryResponse } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { roleMap } from "@/lib/user-constants"

export function OverviewTab({
  summary,
  onTabChange,
}: {
  summary: UserUserSummaryResponse
  onTabChange: (tab: string) => void
}) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const user = summary.user!

  return (
    <div className="space-y-0">
      {/* 基本信息 */}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">基本信息</h3>
          <p className="text-sm text-muted-foreground mt-1">用户的账户信息</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
          <div>
            <div className="text-muted-foreground">用户名</div>
            <div className="font-medium mt-0.5">{user.username || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">邮箱</div>
            <div className="font-medium mt-0.5">{user.email || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">手机号</div>
            <div className="font-medium mt-0.5">{user.phone || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">角色</div>
            <div className="mt-0.5">{roleMap[user.role ?? ""]?.label ?? user.role}</div>
          </div>
          <div>
            <div className="text-muted-foreground">状态</div>
            <div className="mt-1">
              <Badge variant={user.status === 1 ? "default" : "secondary"}>
                {user.status === 1 ? "正常" : "禁用"}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">两步验证</div>
            <div className="mt-1">
              <Badge variant={user.totp_enabled ? "default" : "outline"}>
                {user.totp_enabled ? "已开启" : "未开启"}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">注册时间</div>
            <div className="font-medium mt-0.5">{formatDate(user.created_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">更新时间</div>
            <div className="font-medium mt-0.5">{formatDate(user.updated_at)}</div>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* 实名认证 */}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">实名认证</h3>
          <p className="text-sm text-muted-foreground mt-1">用户的身份认证信息</p>
        </div>
        {user.kyc_status === "verified" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
            <div>
              <div className="text-muted-foreground">认证状态</div>
              <div className="mt-1">
                <Badge variant="default" className="bg-emerald-600">已认证</Badge>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">真实姓名</div>
              <div className="font-medium mt-0.5">{user.kyc_real_name || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">证件号码</div>
              <div className="font-medium font-mono mt-0.5">{user.kyc_id_number || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">认证渠道</div>
              <div className="font-medium mt-0.5">{user.kyc_provider || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">认证时间</div>
              <div className="font-medium mt-0.5">{formatDate(user.kyc_verified_at)}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">该用户尚未完成实名认证</p>
        )}
      </section>

      <Separator className="my-8" />

      {/* 财务摘要 */}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">财务摘要</h3>
          <p className="text-sm text-muted-foreground mt-1">用户的财务概况</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">余额</div>
            <div className="text-2xl font-bold tabular-nums">{formatAmount(user.balance ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">总收入</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{formatAmount(summary.total_income ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">总支出</div>
            <div className="text-2xl font-bold tabular-nums text-red-500">{formatAmount(summary.total_expense ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">总佣金</div>
            <div className="text-2xl font-bold tabular-nums">{formatAmount(user.total_commission ?? 0)}</div>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* 数据统计 */}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">数据统计</h3>
          <p className="text-sm text-muted-foreground mt-1">用户关联数据概览，点击可查看详情</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl">
          <button
            type="button"
            className="flex flex-col items-start rounded-md border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => onTabChange("instances")}
          >
            <div className="text-sm text-muted-foreground">实例</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{summary.instance_count ?? 0}</div>
          </button>
          <button
            type="button"
            className="flex flex-col items-start rounded-md border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => onTabChange("orders")}
          >
            <div className="text-sm text-muted-foreground">订单</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{summary.order_count ?? 0}</div>
          </button>
          <button
            type="button"
            className="flex flex-col items-start rounded-md border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => onTabChange("payments")}
          >
            <div className="text-sm text-muted-foreground">支付记录</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{summary.payment_count ?? 0}</div>
          </button>
          <button
            type="button"
            className="flex flex-col items-start rounded-md border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => onTabChange("tickets")}
          >
            <div className="text-sm text-muted-foreground">工单</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tabular-nums">{summary.ticket_count ?? 0}</span>
              {(summary.open_ticket_count ?? 0) > 0 && (
                <span className="text-xs font-medium text-amber-600">{summary.open_ticket_count} 待处理</span>
              )}
            </div>
          </button>
          <button
            type="button"
            className="flex flex-col items-start rounded-md border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => onTabChange("instances")}
          >
            <div className="text-sm text-muted-foreground">即将到期</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tabular-nums">{summary.expiring_instance_count ?? 0}</span>
              {summary.nearest_expire_at && (
                <span className="text-xs text-muted-foreground">最近 {formatDate(summary.nearest_expire_at)}</span>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* 代理信息（仅代理角色或有上级时显示） */}
      {(user.role === "agent" || user.parent_id) && (
        <>
          <Separator className="my-8" />
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">代理信息</h3>
              <p className="text-sm text-muted-foreground mt-1">代理相关配置和统计</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
              <div>
                <div className="text-muted-foreground">上级用户</div>
                <div className="font-medium mt-0.5">{summary.parent_username || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">代理分组</div>
                <div className="font-medium mt-0.5">{summary.agent_group_name || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">下级用户数</div>
                <div className="font-medium mt-0.5">{summary.sub_user_count ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">首单返佣比例</div>
                <div className="font-medium mt-0.5">{user.commission_rate ?? 0}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">续费返佣比例</div>
                <div className="font-medium mt-0.5">{user.commission_rate_recurring ?? 0}%</div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
