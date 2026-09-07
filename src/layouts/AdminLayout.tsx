import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ExternalLink, Settings, ShieldAlert, EllipsisVertical, Sun, Moon, Monitor, Megaphone, Crown, GraduationCap, Check } from 'lucide-react'
import type { Theme } from '@/hooks/use-theme'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppSidebar } from '@/components/app-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { ActivationTrigger, ActivationDialog } from '@/components/activation-dialog'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { BreadcrumbProvider, useBreadcrumbItems } from '@/hooks/use-breadcrumb'
import { TaskProvider } from '@/hooks/use-tasks'
import { HelpDocProvider } from '@/components/help-doc'
import { TaskTrigger } from '@/components/task-panel'
import { AdminTourMenu } from '@/components/tour-menu'
import { BroadcastDialog } from '@/components/broadcast-dialog'
import { ErrorBoundary } from '@/components/error-boundary'
import { useSiteName, useAdminPath } from '@/hooks/use-site-settings'
import { useEdition } from '@/hooks/use-edition'
import { requires2FASetup, getUser } from '@/lib/auth'
import { useDocumentTitle, useMediaQuery } from '@uidotdev/usehooks'
import { useAdminEvents } from '@/hooks/use-admin-events'
import { useTheme, themeLabels } from '@/hooks/use-theme'
import { useGuidedTour } from '@/hooks/use-guided-tour'

function AdminEventSubscriber() {
  useAdminEvents()
  return null
}

function PageTitle() {
  const siteName = useSiteName()
  const items = useBreadcrumbItems()
  const last = items[items.length - 1]
  useDocumentTitle(last ? `${last.label} - ${siteName}` : siteName)
  return null
}

const themeIconMap: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }

function HeaderMoreMenu() {
  const adminPath = useAdminPath()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const ThemeIcon = themeIconMap[theme]
  const edition = useEdition()
  const user = getUser()
  const showActivation = user?.role === "admin" && edition !== "paid"
  const { getAvailableTours, startTour, navigateAndStartTour } = useGuidedTour()
  const tours = getAvailableTours("admin")

  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <GraduationCap className="size-4" />
              新手教程
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {tours.map((tour) => (
                <DropdownMenuItem
                  key={tour.id}
                  onClick={() => {
                    if (tour.available) {
                      setTimeout(() => startTour(tour.id), 100)
                    } else {
                      navigateAndStartTour(tour.id, navigate)
                    }
                  }}
                >
                  <span className="flex-1">{tour.title}</span>
                  {tour.done && <Check className="size-3 text-emerald-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.open('/portal', '_blank')}>
            <ExternalLink className="size-4" />
            前台门户
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`${adminPath}/settings`)}>
            <Settings className="size-4" />
            系统设置
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setBroadcastOpen(true)}>
            <Megaphone className="size-4" />
            广播通知
          </DropdownMenuItem>
          {showActivation && (
            <DropdownMenuItem onClick={() => setActivationOpen(true)}>
              <Crown className="size-4 text-amber-500" />
              激活授权
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleTheme}>
            <ThemeIcon className="size-4" />
            {themeLabels[theme]}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} showTrigger={false} />
      {showActivation && <ActivationDialog open={activationOpen} onOpenChange={setActivationOpen} />}
    </>
  )
}

export default function AdminLayout() {
  const adminPath = useAdminPath()
  const { pathname, search } = useLocation()
  const isMobile = useMediaQuery("(max-width: 767px)") ?? false
  return (
    <TaskProvider>
      <AdminEventSubscriber />
      <HelpDocProvider>
      <BreadcrumbProvider>
        <PageTitle />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
                <BreadcrumbNav />
              </div>
              <div className="flex items-center gap-1 shrink-0" data-tour="header-toolbar">
                {isMobile ? (
                  <>
                    <TaskTrigger />
                    <HeaderMoreMenu />
                  </>
                ) : (
                  <>
                    <AdminTourMenu />
                    <TaskTrigger />
                    <BroadcastDialog />
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
                    <ActivationTrigger />
                    <ThemeToggle />
                  </>
                )}
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
              <ErrorBoundary resetKeys={[pathname, search]}>
                <Outlet />
              </ErrorBoundary>
              <div className="shrink-0 h-6" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </BreadcrumbProvider>
      </HelpDocProvider>
    </TaskProvider>
  )
}
