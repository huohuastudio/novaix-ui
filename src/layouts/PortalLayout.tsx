import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import {
  Menu,
  X,
  LogOut,
  User,
  Wallet,
  ChevronDown,
  Bell,
  Settings,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useSiteSettings, useAdminPath } from '@/hooks/use-site-settings'
import { getUser, logout } from '@/lib/auth'
import { getPortalNotificationsUnreadCount } from '@/api'

const CURRENT_YEAR = new Date().getFullYear()

const baseNavItems = [
  { to: '/portal', label: '控制台', end: true },
  { to: '/portal/servers', label: '云服务器' },
  { to: '/portal/vpcs', label: '私有网络' },
  { to: '/portal/orders', label: '费用订单' },
  { to: '/portal/tickets', label: '工单' },
]

const desktopBase = 'relative flex items-center px-3 text-sm transition-colors h-full'
const desktopActive = `${desktopBase} text-foreground font-medium`
const desktopInactive = `${desktopBase} text-muted-foreground hover:text-foreground`
const mobileBase = 'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
const mobileActive = `${mobileBase} bg-accent text-foreground`
const mobileInactive = `${mobileBase} text-muted-foreground hover:bg-accent hover:text-foreground`

function useNavItems() {
  const user = getUser()
  if (user?.role === 'agent') {
    return [...baseNavItems, { to: '/portal/agent', label: '代理中心' }]
  }
  return baseNavItems
}

function NavLinks({ mobile, onClick }: { mobile?: boolean; onClick?: () => void }) {
  const navItems = useNavItems()
  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClick}
          className={({ isActive }) =>
            mobile
              ? (isActive ? mobileActive : mobileInactive)
              : (isActive ? desktopActive : desktopInactive)
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              {!mobile && isActive && (
                <span className="absolute inset-x-1 bottom-0 h-[2px] bg-primary rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </>
  )
}

function NotificationBell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const { data: res } = await getPortalNotificationsUnreadCount()
      if (res?.code === 0) setUnreadCount((res.data as { count: number })?.count ?? 0)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
    fetchCount()
  }, [fetchCount, location.pathname])

  useEffect(() => {
    const timer = setInterval(fetchCount, 60_000)
    return () => clearInterval(timer)
  }, [fetchCount])

  return (
    <Button variant="ghost" size="icon" className="relative size-8" onClick={() => navigate('/portal/notifications')}>
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  )
}

function UserMenu() {
  const user = getUser()
  const navigate = useNavigate()
  const adminPath = useAdminPath()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="hidden sm:inline max-w-[100px] truncate">{user?.username || '用户'}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 shadow-sm ring-0">
        <div className="px-2 py-2 border-b mb-1">
          <p className="text-sm font-medium">{user?.username || '用户'}</p>
          <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
        </div>
        <DropdownMenuItem onClick={() => navigate('/portal/profile')}>
          <User className="size-4" />
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/portal/wallet')}>
          <Wallet className="size-4" />
          我的钱包
        </DropdownMenuItem>
        {user?.role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(adminPath)}>
              <Settings className="size-4" />
              管理后台
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function PortalLayout() {
  const { site_name: siteName, site_logo: logo, tos_url: tosUrl, privacy_url: privacyUrl } = useSiteSettings()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-secondary" style={{ marginTop: 'var(--demo-banner-height)' }}>
      <header className="sticky top-[var(--demo-banner-height)] z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-8 h-full">
              <Link to="/portal" className="flex items-center gap-2.5 shrink-0">
                {logo ? (
                  <img src={logo} alt={siteName} className="h-6" />
                ) : (
                  <span className="font-semibold text-base tracking-tight">{siteName}</span>
                )}
              </Link>
              <nav className="hidden md:flex items-center gap-1 h-full">
                <NavLinks />
              </nav>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
              <div className="mx-1 h-4 w-px bg-border hidden sm:block" />
              <UserMenu />
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <nav className="md:hidden border-t bg-background px-2 py-3">
            <NavLinks mobile onClick={() => setMobileOpen(false)} />
          </nav>
        )}
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>&copy; {CURRENT_YEAR} {siteName}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {tosUrl && (
                <a href={tosUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  服务条款
                </a>
              )}
              {privacyUrl && (
                <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  隐私政策
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
