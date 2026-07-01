import { useEffect, useMemo, useRef, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Menu, X, ChevronDown, ExternalLink, LayoutDashboard, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useSiteSettings, useAdminPath } from "@/hooks/use-site-settings"
import { BootstrapContext, EMPTY_BOOTSTRAP } from "@/hooks/use-bootstrap"
import type { BootstrapData } from "@/hooks/use-bootstrap"
import { isAuthenticated, getUser } from "@/lib/auth"
import { getPublicCmsBootstrap } from "@/api"
import type { ServiceNavMenuTreeNode, PublicPublicLinkItem } from "@/api"

const CURRENT_YEAR = new Date().getFullYear()
const IMMERSIVE_LINK = "text-white/80 hover:text-white"
const IMMERSIVE_BTN = "text-white/80 hover:text-white hover:bg-white/10"

function resolveUrl(url?: string): string {
  if (!url) return "/"
  if (url.startsWith("#")) return `/${url}`
  return url
}

function linkProps(url: string, targetOverride?: string) {
  const isExternal = url.startsWith("http")
  const target = targetOverride || (isExternal ? "_blank" : undefined)
  const rel = target === "_blank" ? "noopener noreferrer" : undefined
  return { isExternal, target, rel }
}

function SmartLink({ url, target: targetOverride, className, onClick, children }: {
  url: string; target?: string; className?: string; onClick?: () => void; children: React.ReactNode
}) {
  const { isExternal, target, rel } = linkProps(url, targetOverride)
  if (isExternal) {
    return <a href={url} target={target} rel={rel} className={className} onClick={onClick}>{children}</a>
  }
  return <Link to={url} target={target} rel={rel} className={className} onClick={onClick}>{children}</Link>
}

function NavLink({ item, immersive }: { item: ServiceNavMenuTreeNode; immersive?: boolean }) {
  return (
    <SmartLink
      url={resolveUrl(item.url)}
      target={item.target}
      className={`text-sm transition-colors ${immersive ? IMMERSIVE_LINK : "text-muted-foreground hover:text-foreground"}`}
    >
      {item.title}
    </SmartLink>
  )
}

function DesktopNavItem({ item, immersive }: { item: ServiceNavMenuTreeNode; immersive?: boolean }) {
  const [open, setOpen] = useState(false)
  const hasChildren = (item.children?.length ?? 0) > 0

  if (!hasChildren) {
    return (
      <div className="flex items-center h-full">
        <NavLink item={item} immersive={immersive} />
      </div>
    )
  }

  return (
    <div
      className="relative flex items-center h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`flex items-center gap-1 text-sm transition-colors cursor-pointer ${immersive ? IMMERSIVE_LINK : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setOpen(!open)}
      >
        {item.title}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
          <div className={`rounded-md py-1 shadow-sm min-w-[140px] ${immersive ? "bg-white/15 backdrop-blur-md border border-white/20" : "bg-popover border border-border"}`}>
            {item.children!.map((child) => {
              const url = resolveUrl(child.url)
              const { isExternal } = linkProps(url, child.target)

              return (
                <SmartLink key={child.id} url={url} target={child.target} className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${immersive ? IMMERSIVE_BTN : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} onClick={() => setOpen(false)}>
                  {child.title}
                  {isExternal && <ExternalLink className="size-3 ml-auto opacity-50" />}
                </SmartLink>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MobileNavItem({ item, onClose }: { item: ServiceNavMenuTreeNode; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const hasChildren = (item.children?.length ?? 0) > 0

  if (!hasChildren) {
    return (
      <SmartLink
        url={resolveUrl(item.url)}
        target={item.target}
        className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={onClose}
      >
        {item.title}
      </SmartLink>
    )
  }

  return (
    <div>
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {item.title}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pl-4">
          {item.children!.map((child) => (
            <SmartLink
              key={child.id}
              url={resolveUrl(child.url)}
              target={child.target}
              className="block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              {child.title}
            </SmartLink>
          ))}
        </div>
      )}
    </div>
  )
}

interface FooterLinkGroup {
  name: string
  links: PublicPublicLinkItem[]
}

function groupLinks(links: PublicPublicLinkItem[]): FooterLinkGroup[] {
  const map = new Map<string, PublicPublicLinkItem[]>()
  for (const link of links) {
    const group = link.group_name || ""
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(link)
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, links: items }))
}

export default function PublicLayout() {
  const { site_name: siteName, site_logo: logo, site_copyright: copyright, tos_url: tosUrl, privacy_url: privacyUrl, edition } = useSiteSettings()
  const adminPath = useAdminPath()
  const { pathname, hash } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const [data, setData] = useState<BootstrapData>(EMPTY_BOOTSTRAP)

  const authed = isAuthenticated()
  const user = getUser()
  const isAdmin = user?.role === "admin"

  const isHome = pathname === "/"

  const homeLoaded = useRef(false)

  useEffect(() => {
    const needHome = isHome && !homeLoaded.current
    getPublicCmsBootstrap({ query: needHome ? { scene: "home" } : {} }).then(({ data: res }) => {
      const d = res?.data
      if (!d) return
      if (needHome) homeLoaded.current = true
      setData((prev) => ({
        headerMenus: d.header_menus ?? prev.headerMenus,
        footerMenus: d.footer_menus ?? prev.footerMenus,
        links: d.links ?? prev.links,
        partners: d.partners ?? prev.partners,
        banners: d.banners ?? prev.banners,
        testimonials: d.testimonials ?? prev.testimonials,
        dataCenters: d.data_centers ?? prev.dataCenters,
        faqs: d.faqs ?? prev.faqs,
        homeReady: needHome || prev.homeReady,
      }))
    }).catch(() => {
      if (needHome) {
        setData((prev) => ({ ...prev, homeReady: true }))
      }
    })
  }, [isHome])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!hash) return
    let cancelled = false
    const id = decodeURIComponent(hash.slice(1))
    const tryScroll = (attempts = 0) => {
      if (cancelled) return
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 100)
      }
    }
    requestAnimationFrame(() => tryScroll())
    return () => { cancelled = true }
  }, [hash, pathname, data.homeReady])

  useEffect(() => {
    const fn = () => {
      const next = window.scrollY > 20
      setScrolled((prev) => (prev === next ? prev : next))
    }
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const { headerMenus, footerMenus, links, partners } = data
  const linkGroups = useMemo(() => groupLinks(links), [links])
  const hasFooterContent = footerMenus.length > 0 || links.length > 0
  const immersive = isHome && !scrolled && !mobileOpen && data.homeReady && data.banners.length > 0

  return (
    <BootstrapContext.Provider value={data}>
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased" style={{ marginTop: "var(--demo-banner-height)" }}>
      {/* Header */}
      <nav
        className={`fixed top-[var(--demo-banner-height)] left-0 right-0 z-50 w-full transition-[background-color,border-color,backdrop-filter,color] duration-300 ${
          immersive
            ? "bg-transparent border-b border-transparent"
            : mobileOpen
              ? "bg-background border-b border-border/60"
              : "bg-background/80 backdrop-blur-sm border-b border-border/60"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-8 h-full">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              {logo ? (
                <img src={logo} alt={siteName} className={`h-6 transition-[filter] duration-300 ${immersive ? "brightness-0 invert" : ""}`} />
              ) : (
                <span className={`text-base font-bold tracking-tight transition-colors duration-300 ${immersive ? "text-white" : ""}`}>{siteName}</span>
              )}
            </Link>
            {headerMenus.length > 0 && (
              <div className="hidden md:flex items-center gap-6 h-full">
                {headerMenus.map((item) => (
                  <DesktopNavItem key={item.id} item={item} immersive={immersive} />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className={immersive ? IMMERSIVE_BTN : ""} />
            {authed ? (
              <>
                <Button variant={isAdmin ? "ghost" : "default"} size="sm" className={`hidden md:inline-flex ${immersive && isAdmin ? IMMERSIVE_BTN : ""}`} asChild>
                  <Link to="/portal">控制台</Link>
                </Button>
                <Button variant="ghost" size="icon" className={`md:hidden ${immersive ? IMMERSIVE_BTN : ""}`} asChild>
                  <Link to="/portal" aria-label="控制台"><LayoutDashboard className="size-4" /></Link>
                </Button>
                {isAdmin && (
                  <>
                    <Button size="sm" className="hidden md:inline-flex" asChild>
                      <Link to={adminPath}>管理后台</Link>
                    </Button>
                    <Button size="icon" className="md:hidden" asChild>
                      <Link to={adminPath} aria-label="管理后台"><Settings className="size-4" /></Link>
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className={immersive ? IMMERSIVE_BTN : ""} asChild>
                  <Link to="/login">登录</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">注册</Link>
                </Button>
              </>
            )}
            {headerMenus.length > 0 && (
              <button
                className={`md:hidden p-2 transition-colors ${immersive ? IMMERSIVE_LINK : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
          </div>
        </div>
        {mobileOpen && headerMenus.length > 0 && (
          <div className="md:hidden border-t bg-background px-2 py-3">
            {headerMenus.map((item) => (
              <MobileNavItem key={item.id} item={item} onClose={() => setMobileOpen(false)} />
            ))}
          </div>
        )}
      </nav>

      {/* Content */}
      <main className={`flex-1 ${isHome ? "" : "pt-16"}`}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6">
          {/* 导航菜单链接列 */}
          {hasFooterContent && (
            <div className="py-12 sm:py-16">
              {footerMenus.length > 0 && (
                <div
                  className={`grid grid-cols-2 gap-8 ${
                    { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[footerMenus.length] ?? "sm:grid-cols-4"
                  }`}
                >
                  {footerMenus.map((menu) => {
                    const menuUrl = resolveUrl(menu.url)
                    const hasChildren = (menu.children?.length ?? 0) > 0

                    return (
                    <div key={menu.id}>
                      {hasChildren ? (
                        <h4 className="text-sm font-semibold text-foreground mb-4">{menu.title}</h4>
                      ) : (
                        <SmartLink url={menuUrl} target={menu.target || "_blank"} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">{menu.title}</SmartLink>
                      )}
                      {hasChildren && (
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                          {menu.children!.map((child) => (
                            <li key={child.id}>
                              <SmartLink url={resolveUrl(child.url)} target={child.target} className="hover:text-foreground transition-colors">
                                {child.title}
                              </SmartLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}

              {/* 友情链接 */}
              {linkGroups.length > 0 && (
                <div className={footerMenus.length > 0 ? "mt-10 pt-6 border-t border-border/50" : ""}>
                  {linkGroups.map((group) => (
                    <div key={group.name} className="mb-4 last:mb-0">
                      {group.name && (
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{group.name}</h4>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                        {group.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                          >
                            {link.logo ? (
                              <img src={link.logo} alt={link.name} className="h-4 inline-block mr-1 opacity-70" />
                            ) : null}
                            {link.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 合作伙伴 Logo */}
          {partners.length > 0 && (
            <div className="py-6 border-t border-border/50">
              <div className="flex flex-wrap items-center justify-center gap-8">
                {partners.map((partner) =>
                  partner.logo ? (
                    <a
                      key={partner.id}
                      href={partner.url || undefined}
                      target={partner.url ? "_blank" : undefined}
                      rel={partner.url ? "noopener noreferrer" : undefined}
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      title={partner.name}
                    >
                      <img src={partner.logo} alt={partner.name} className="h-6 max-w-[120px] object-contain" />
                    </a>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* 版权 + 法律链接 */}
          <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{copyright || `© ${CURRENT_YEAR} ${siteName}`}</span>
              {edition !== "paid" && (
                <span className="text-xs">
                  Powered by{" "}
                  <a href="https://novaix.cc" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Novaix</a>
                </span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <SmartLink url={tosUrl || "/legal/tos"} className="hover:text-foreground transition-colors">服务条款</SmartLink>
              <SmartLink url={privacyUrl || "/legal/privacy"} className="hover:text-foreground transition-colors">隐私政策</SmartLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </BootstrapContext.Provider>
  )
}
