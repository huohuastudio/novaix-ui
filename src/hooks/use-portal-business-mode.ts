import { useSiteSettings } from "@/hooks/use-site-settings"
import { useFeatureAllowed } from "@/hooks/use-edition"

/**
 * 用户端经营模式：决定"云服务器""我的服务"入口与服务选购是否可用。
 * - services："我的服务"入口，站点开启服务选购时为 true；授权失效不影响已购服务的查看、续费与操作
 * - shop：可以选购新服务，需授权允许且站点开启服务选购
 * - cloud：站点未关闭自营资源时为 true，与后端新购校验一致（两种模式都关闭时用户无法购买任何产品）
 */
export function usePortalBusinessMode() {
  const { self_hosted_enabled, supplier_resale_enabled } = useSiteSettings()
  const resaleAllowed = useFeatureAllowed("supplier_resale")
  const services = supplier_resale_enabled === "true"
  const shop = resaleAllowed && services
  const cloud = self_hosted_enabled !== "false"
  return { cloud, services, shop }
}
