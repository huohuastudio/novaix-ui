import { Link, Outlet } from 'react-router-dom'
import { ExternalLink, Settings, ShieldAlert } from 'lucide-react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { BreadcrumbProvider, useBreadcrumbItems } from '@/hooks/use-breadcrumb'
import { TaskProvider } from '@/hooks/use-tasks'
import { TaskTrigger } from '@/components/task-panel'
import { useSiteName, useAdminPath } from '@/hooks/use-site-settings'
import { requires2FASetup } from '@/lib/auth'
import { useDocumentTitle } from '@uidotdev/usehooks'

function PageTitle() {
  const siteName = useSiteName()
  const items = useBreadcrumbItems()
  const last = items[items.length - 1]
  useDocumentTitle(last ? `${last.label} - ${siteName}` : siteName)
  return null
}

export default function AdminLayout() {
  const adminPath = useAdminPath()
  return (
    <TaskProvider>
      <BreadcrumbProvider>
        <PageTitle />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <BreadcrumbNav />
              </div>
              <div className="flex items-center gap-1">
                <TaskTrigger />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to="/portal" target="_blank">
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>前台门户</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`${adminPath}/settings`}>
                        <Settings className="size-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>系统设置</TooltipContent>
                </Tooltip>
                <ThemeToggle />
              </div>
            </header>
            {requires2FASetup() && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
                <ShieldAlert className="size-4 shrink-0" />
                <span>系统要求管理员开启二次验证，请前往</span>
                <Link to="/portal/profile" target="_blank" className="font-medium underline">个人资料</Link>
                <span>页面设置</span>
              </div>
            )}
            <div className="flex flex-col flex-1 min-h-0 overflow-auto">
              <Outlet />
              <div className="shrink-0 h-6" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </BreadcrumbProvider>
    </TaskProvider>
  )
}
