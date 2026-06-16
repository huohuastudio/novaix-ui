import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, ChevronDown, Cpu, Globe, Shield, Zap,
  Server, Activity, Clock, Gauge, Network, Terminal as TerminalIcon, MousePointerClick,
  type LucideIcon,
} from 'lucide-react'
import { motion, useInView, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/theme-toggle'
import { getPlansPublic, getSettingsHomepage } from '@/api'
import type { PublicPublicPlanGroup, PublicPublicPlanItem } from '@/api'
import { useSiteName, useFormatAmount, useAdminPath } from '@/hooks/use-site-settings'
import { isAuthenticated, getUser } from '@/lib/auth'
import { formatMemory, parseJSON } from '@/lib/utils'
import type { HomepageConfig, HeroConfig, StatItem, FeatureItem, StepItem, FaqItemConfig, CtaConfig, FooterConfig, FeatureIcon } from '@/types/homepage'

const iconMap: Record<FeatureIcon, LucideIcon> = { zap: Zap, globe: Globe, shield: Shield, cpu: Cpu }

function parseHomepageConfig(raw: Record<string, string>): HomepageConfig {
  return {
    hero: parseJSON<HeroConfig>(raw.homepage_hero, { title: '', subtitle: '', description: '' }),
    stats: parseJSON<StatItem[]>(raw.homepage_stats, []),
    features: parseJSON<FeatureItem[]>(raw.homepage_features, []),
    steps: parseJSON<StepItem[]>(raw.homepage_steps, []),
    faq: parseJSON<FaqItemConfig[]>(raw.homepage_faq, []),
    cta: parseJSON<CtaConfig>(raw.homepage_cta, { title: '', subtitle: '', button_text: '' }),
    footer: parseJSON<FooterConfig>(raw.homepage_footer, { sections: [], copyright: '' }),
  }
}

/* ================================================================
   Canvas 粒子点阵背景
   ================================================================ */

function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number, width = 0, height = 0, running = true
    let dark = document.documentElement.classList.contains('dark')
    const gap = 32, baseR = 1.2, mouse = { x: -1000, y: -1000 }

    function resize() {
      const dpr = window.devicePixelRatio || 1
      width = canvas!.clientWidth; height = canvas!.clientHeight
      canvas!.width = width * dpr; canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      dark = document.documentElement.classList.contains('dark')
    }
    function draw(t: number) {
      if (!running) return
      ctx!.clearRect(0, 0, width, height)
      const cols = Math.ceil(width / gap) + 1, rows = Math.ceil(height / gap) + 1
      const ox = (width - (cols - 1) * gap) / 2, oy = (height - (rows - 1) * gap) / 2
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = ox + col * gap, y = oy + row * gap
          const dx = mouse.x - x, dy = mouse.y - y
          const inf = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 160)
          const wave = Math.sin(col * 0.3 + t * 0.001) * Math.cos(row * 0.3 + t * 0.0008) * 0.4
          const alpha = 0.1 + wave * 0.06 + inf * 0.5
          ctx!.beginPath()
          ctx!.arc(x, y, baseR + inf * 2.5, 0, Math.PI * 2)
          ctx!.fillStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 0.5})`
          ctx!.fill()
        }
      }
      animId = requestAnimationFrame(draw)
    }
    const onMove = (e: MouseEvent) => { const r = canvas!.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top }
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000 }
    const onVisibility = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(animId) }
      else { running = true; dark = document.documentElement.classList.contains('dark'); animId = requestAnimationFrame(draw) }
    }
    resize(); animId = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { running = false; cancelAnimationFrame(animId); window.removeEventListener('resize', resize); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }} />
}

/* ================================================================
   动画工具
   ================================================================ */

function BlurIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ================================================================
   计数器动画
   ================================================================ */

function AnimatedValue({ value }: { value: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const parsed = useRef(value.match(/^([\d.]+)(%?)$/))
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const m = parsed.current
    if (!inView || !m) return
    const target = parseFloat(m[1])
    const suffix = m[2]
    const isFloat = m[1].includes('.')
    const duration = 1500
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const current = isFloat ? (eased * target).toFixed(2) : Math.round(eased * target)
      setDisplay(`${current}${suffix}`)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView])

  return <span ref={ref}>{display}</span>
}

/* ================================================================
   鼠标跟随 Border 光效卡片
   ================================================================ */

function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        ref.current!.style.setProperty('--gx', `${e.clientX - r.left}px`)
        ref.current!.style.setProperty('--gy', `${e.clientY - r.top}px`)
        ref.current!.style.setProperty('--go', '1')
      }}
      onMouseLeave={() => ref.current!.style.setProperty('--go', '0')}
      className={`relative rounded-xl p-px bg-border/50 ${className ?? ''}`}
    >
      <div
        className="absolute inset-0 rounded-xl transition-opacity duration-500"
        style={{ opacity: 'var(--go,0)', background: 'radial-gradient(250px circle at var(--gx,0) var(--gy,0),hsl(var(--primary)/.2),transparent 40%)' }}
      />
      <div className="relative rounded-[calc(0.75rem-1px)] bg-card h-full">{children}</div>
    </div>
  )
}

/* ================================================================
   控制台大预览
   ================================================================ */

function DashboardPreview() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  const instances = [
    { name: 'Web-Prod-01', status: 'running', region: '香港', cpu: '2 核', mem: '4 GB', ip: '103.116.•••.89' },
    { name: 'DB-Prod-01', status: 'running', region: '东京', cpu: '4 核', mem: '8 GB', ip: '45.76.•••.12' },
    { name: 'Cache-01', status: 'running', region: '新加坡', cpu: '2 核', mem: '4 GB', ip: '139.180.•••.55' },
    { name: 'App-Staging', status: 'stopped', region: '洛杉矶', cpu: '1 核', mem: '2 GB', ip: '207.148.•••.33' },
  ]

  const resources = [
    { label: 'CPU', value: 34, color: 'bg-blue-500' },
    { label: '内存', value: 67, color: 'bg-violet-500' },
    { label: '磁盘', value: 45, color: 'bg-amber-500' },
    { label: '网络 I/O', value: 23, color: 'bg-emerald-500' },
  ]

  return (
    <div ref={ref} className="w-full max-w-5xl mx-auto">
      <div className="relative rounded-2xl p-[2px] shadow-xl shadow-black/[0.03] dark:shadow-black/20">
        <div className="absolute inset-0 rounded-2xl animate-border-rotate opacity-60" />
        <div className="absolute inset-0 rounded-2xl bg-border/30" />
        <div className="relative rounded-[14px] bg-muted/20 p-1.5 sm:p-2">
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center border-b border-border/50 bg-muted/20 overflow-x-auto">
            <div className="flex items-center gap-1.5 border-b-2 border-foreground px-4 py-2.5 text-xs font-medium text-foreground whitespace-nowrap">
              <Server className="size-3.5 shrink-0" />实例列表
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <Activity className="size-3.5 shrink-0" />监控面板
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <Clock className="size-3.5 shrink-0" />操作日志
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <TerminalIcon className="size-3.5 shrink-0" />控制台
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_280px] divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="p-3 sm:p-4">
              <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_140px] gap-2 px-3 pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>名称</span><span>CPU</span><span>内存</span><span>地域</span><span className="text-right">IP 地址</span>
              </div>
              <div className="space-y-1.5">
                {instances.map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={inView ? { opacity: 1, x: 0 } : undefined}
                    transition={{ duration: 0.35, delay: 0.3 + i * 0.08 }}
                    className="grid sm:grid-cols-[1fr_80px_80px_80px_140px] gap-2 items-center rounded-lg border border-border/30 px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`size-1.5 rounded-full shrink-0 ${s.status === 'running' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <span className="font-medium text-foreground truncate">{s.name}</span>
                    </div>
                    <span className="text-muted-foreground hidden sm:block">{s.cpu}</span>
                    <span className="text-muted-foreground hidden sm:block">{s.mem}</span>
                    <span className="text-muted-foreground hidden sm:block">{s.region}</span>
                    <span className="text-muted-foreground font-mono text-right hidden sm:block">{s.ip}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Web-Prod-01 · 资源</div>
              {resources.map((r, i) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    <motion.span
                      className="font-mono text-[11px] font-medium text-foreground"
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : undefined}
                      transition={{ delay: 0.7 + i * 0.08 }}
                    >{r.value}%</motion.span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <motion.div
                      className={`h-full rounded-full ${r.color}`}
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${r.value}%` } : undefined}
                      transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">网络流量 (Mbps)</div>
                <svg viewBox="0 0 200 48" className="w-full h-12">
                  <defs>
                    <linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M0,38 C12,36 20,30 35,26 S55,32 70,28 S90,16 110,20 S130,30 150,22 S175,12 200,18"
                    fill="none" className="stroke-primary/50" strokeWidth="1.5" strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : undefined}
                    transition={{ duration: 1.5, delay: 1, ease: 'easeOut' }}
                  />
                  <motion.path
                    d="M0,38 C12,36 20,30 35,26 S55,32 70,28 S90,16 110,20 S130,30 150,22 S175,12 200,18 V48 H0Z"
                    fill="url(#tf)"
                    initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : undefined}
                    transition={{ duration: 0.5, delay: 2 }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   功能深度展示 (交替布局)
   ================================================================ */

function FeatureSection({ icon: Icon, title, description, items, visual, reverse }: {
  icon: React.ElementType; title: string; description: string
  items: string[]; visual: React.ReactNode; reverse?: boolean
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? 'lg:[direction:rtl] *:lg:[direction:ltr]' : ''}`}>
      <Reveal>
        <div>
          <div className="inline-flex items-center justify-center size-10 rounded-xl bg-primary/10 mb-5">
            <Icon className="size-5 text-primary" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tighter">{title}</h3>
          <p className="mt-3 text-muted-foreground leading-relaxed">{description}</p>
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
      <Reveal delay={0.15}>{visual}</Reveal>
    </div>
  )
}

function PerfVisual() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const bars = [
    { label: '响应时间', value: 12, max: 100, unit: 'ms', color: 'bg-blue-500', spaced: true },
    { label: 'IOPS', value: 85, max: 100, unit: 'K', color: 'bg-violet-500', spaced: false },
    { label: '吞吐量', value: 92, max: 100, unit: '%', color: 'bg-emerald-500', spaced: false },
    { label: '网络延迟', value: 8, max: 100, unit: 'ms', color: 'bg-amber-500', spaced: true },
  ]
  return (
    <div ref={ref} className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">性能基准测试</div>
      {bars.map((b, i) => (
        <div key={b.label} className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-foreground font-medium">{b.label}</span>
            <motion.span
              className="text-muted-foreground font-mono text-xs"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : undefined}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              {b.spaced ? `${b.value} ${b.unit}` : `${b.value}${b.unit}`}
            </motion.span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${b.color}`}
              initial={{ width: 0 }}
              animate={inView ? { width: `${b.value}%` } : undefined}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function NetworkVisual() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const nodes = [
    { name: '香港', x: 156, y: 52, active: true },
    { name: '东京', x: 170, y: 35, active: true },
    { name: '新加坡', x: 144, y: 65, active: true },
    { name: '洛杉矶', x: 30, y: 40, active: true },
    { name: '法兰克福', x: 100, y: 30, active: true },
    { name: '圣保罗', x: 60, y: 75, active: false },
  ]
  return (
    <div ref={ref} className="rounded-xl border border-border/50 bg-card p-6">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">全球节点分布</div>
      <div className="relative aspect-[2/1] rounded-lg bg-muted/30 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
          {[20, 40, 60, 80].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="200" y2={y} className="stroke-border/30" strokeWidth="0.3" />
          ))}
          {[40, 80, 120, 160].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" className="stroke-border/30" strokeWidth="0.3" />
          ))}

          {nodes.slice(0, 5).map((n, i) => nodes.slice(i + 1, 5).map((n2, j) => (
            <g key={`line-${i}-${i + 1 + j}`}>
              <motion.line
                x1={n.x} y1={n.y} x2={n2.x} y2={n2.y}
                className="stroke-primary/15" strokeWidth="0.4"
                initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : undefined}
                transition={{ duration: 1, delay: 0.3 }}
              />
              {inView && (
                <circle r="1" className="fill-primary/60">
                  <animateMotion
                    dur={`${3 + j * 0.7}s`}
                    repeatCount="indefinite"
                    begin={`${1.5 + j * 0.4}s`}
                    path={`M${n.x},${n.y} L${n2.x},${n2.y}`}
                  />
                  <animate attributeName="opacity" values="0;1;1;0" dur={`${3 + j * 0.7}s`} repeatCount="indefinite" begin={`${1.5 + j * 0.4}s`} />
                </circle>
              )}
            </g>
          )))}

          {nodes.map((n, i) => (
            <motion.g
              key={n.name}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : undefined}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
            >
              {n.active && (
                <circle cx={n.x} cy={n.y} r="4" className="fill-emerald-500/30">
                  <animate attributeName="r" values="3;6;3" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={n.x} cy={n.y} r="3"
                className={n.active ? 'fill-emerald-500' : 'fill-muted-foreground/40'}
              />
              <text
                x={n.x} y={n.y + 7}
                textAnchor="middle"
                className="fill-muted-foreground text-[5px] font-medium"
              >{n.name}</text>
            </motion.g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function ManageVisual() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const actions = [
    { icon: MousePointerClick, label: '一键部署', desc: '选择配置，秒级创建实例' },
    { icon: Gauge, label: '实时监控', desc: 'CPU / 内存 / 磁盘 / 网络全维度' },
    { icon: TerminalIcon, label: '在线终端', desc: '浏览器内直接 SSH 访问' },
    { icon: Network, label: '网络管理', desc: 'RDNS、防火墙、快照一站式' },
  ]
  return (
    <div ref={ref} className="grid grid-cols-2 gap-3">
      {actions.map((a, i) => (
        <motion.div
          key={a.label}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
          className="rounded-xl border border-border/50 bg-card p-4"
        >
          <a.icon className="size-5 text-primary mb-2.5" />
          <div className="text-sm font-semibold text-foreground">{a.label}</div>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</div>
        </motion.div>
      ))}
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-[15px] font-medium text-foreground cursor-pointer"
      >
        {q}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================================================================
   价格
   ================================================================ */

const billingLabels: Record<string, string> = { monthly: '月付', quarterly: '季付', yearly: '年付' }

function PlanCard({ plan, cycle, formatAmount, index }: {
  plan: PublicPublicPlanItem; cycle: string; formatAmount: (v: number) => string; index: number
}) {
  const price = cycle === 'yearly' ? plan.price_yearly : cycle === 'quarterly' ? plan.price_quarterly : plan.price_monthly
  const specs = [
    { label: 'CPU', value: `${plan.cpu} 核` },
    { label: '内存', value: formatMemory(plan.memory ?? 0) },
    { label: '磁盘', value: `${plan.disk} GB SSD` },
    { label: '带宽', value: (plan.bandwidth ?? 0) > 0 ? `${plan.bandwidth} Mbps` : '不限' },
  ]
  if ((plan.traffic ?? 0) > 0) specs.push({ label: '流量', value: `${plan.traffic} GB/月` })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlowCard>
        <div className="p-6">
          <h3 className="font-semibold text-foreground">{plan.name}</h3>
          {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
          <div className="mt-5 mb-6">
            <span className="text-3xl font-bold tracking-tight text-foreground">{formatAmount(price ?? 0)}</span>
            <span className="text-sm text-muted-foreground ml-1.5">/ {billingLabels[cycle] ?? cycle}</span>
          </div>
          <div className="space-y-2.5 mb-6">
            {specs.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <Check className="size-3.5 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="ml-auto font-medium text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
          <Button className="w-full" variant="outline" asChild>
            <Link to={isAuthenticated() ? '/portal/purchase' : '/register'}>选择方案</Link>
          </Button>
        </div>
      </GlowCard>
    </motion.div>
  )
}

/* ================================================================
   主页
   ================================================================ */

const featureVisuals: Record<number, React.ReactNode> = {
  0: <PerfVisual />,
  1: <NetworkVisual />,
  2: <ManageVisual />,
}

export default function Home() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const adminPath = useAdminPath()
  const [groups, setGroups] = useState<PublicPublicPlanGroup[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [cfg, setCfg] = useState<HomepageConfig | null>(null)
  const [cycle, setCycle] = useState<string>('monthly')
  const [scrolled, setScrolled] = useState(false)

  const authed = isAuthenticated()
  const user = getUser()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    getSettingsHomepage()
      .then(({ data: res }) => {
        if (res?.data) setCfg(parseHomepageConfig(res.data as unknown as Record<string, string>))
      })
      .catch(() => {})
    getPlansPublic()
      .then(({ data: res }) => setGroups(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false))
  }, [])

  useEffect(() => {
    const fn = () => { const next = window.scrollY > 20; setScrolled(prev => prev === next ? prev : next) }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground antialiased" style={{ marginTop: 'var(--demo-banner-height)' }}>
      {/* ═══ 导航栏 ═══ */}
      <nav className={`sticky top-[var(--demo-banner-height)] z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-sm border-b border-border/60' : 'bg-background border-b border-transparent'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="text-base font-bold tracking-tight">{siteName}</Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {authed ? (
              <Button size="sm" asChild>
                <Link to={isAdmin ? adminPath : '/portal'}>{isAdmin ? '管理后台' : '控制台'}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">登录</Link></Button>
                <Button size="sm" asChild><Link to="/register">注册</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <DotGrid />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20 sm:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            <BlurIn>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-pretty leading-[1.08]">
                {cfg?.hero.title}
                <br />
                <span className="text-muted-foreground">{cfg?.hero.subtitle}</span>
              </h1>
            </BlurIn>
            <BlurIn delay={0.15}>
              <p className="mt-5 text-lg sm:text-xl tracking-tight text-balance text-muted-foreground max-w-2xl mx-auto">
                {cfg?.hero.description}
              </p>
            </BlurIn>
            <BlurIn delay={0.3} className="mt-8 sm:mt-10 flex items-center justify-center gap-3">
              <Button size="lg" className="h-12 gap-2.5 rounded-lg px-6 text-lg font-normal group/btn" asChild>
                <Link to={authed ? '/portal/purchase' : '/register'}>
                  开始使用
                  <ArrowRight className="size-4 transition-transform duration-150 ease-out group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 gap-2.5 rounded-lg px-6 text-lg font-normal" asChild>
                <a href="#pricing">查看方案</a>
              </Button>
            </BlurIn>
          </div>

          <BlurIn delay={0.5} className="mt-14 sm:mt-20">
            <DashboardPreview />
          </BlurIn>
        </div>
      </section>

      {/* ═══ 信任指标 ═══ */}
      {(cfg?.stats.length ?? 0) > 0 && <section className="border-t border-dashed border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {cfg!.stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold tracking-tighter"><AnimatedValue value={s.value} /></div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>}

      {/* ═══ 功能深度展示 ═══ */}
      {(cfg?.features.length ?? 0) > 0 && <section className="border-t border-dashed border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28 space-y-24 sm:space-y-32">
          {cfg!.features.map((f, i) => (
            <FeatureSection
              key={f.title}
              icon={iconMap[f.icon] ?? Zap}
              title={f.title}
              description={f.description}
              items={f.items}
              visual={featureVisuals[i] ?? <PerfVisual />}
              reverse={i % 2 === 1}
            />
          ))}
        </div>
      </section>}

      {/* ═══ 工作流程 ═══ */}
      {(cfg?.steps.length ?? 0) > 0 && <section className="border-t border-dashed border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-center text-pretty">
              {cfg!.steps.length === 3 ? '三步开始' : '快速开始'}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-center tracking-tight">
              从注册到上线，只需几分钟
            </p>
          </Reveal>
          <div className="mt-14 relative">
            <div className="hidden md:block absolute top-12 left-0 right-0 px-6">
              <div className="mx-auto max-w-[calc(100%-8rem)] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent relative overflow-hidden">
                <motion.div
                  className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                  animate={{ left: ['-10%', '110%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                />
              </div>
            </div>
            <div className={`grid gap-6 ${{ 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[cfg!.steps.length] ?? 'md:grid-cols-3'}`}>
              {cfg!.steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.1}>
                  <div className="rounded-xl border border-border/50 bg-card p-6 h-full relative">
                    <span className="text-3xl font-bold tracking-tighter text-primary/20">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {/* ═══ 定价 ═══ */}
      <section id="pricing" className="border-t border-dashed border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-center text-pretty">透明定价</h2>
            <p className="mt-4 text-lg text-muted-foreground text-center tracking-tight">没有隐藏费用，随时升降配</p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex justify-center mt-10 mb-12">
              <div className="inline-flex rounded-lg bg-muted/60 p-0.5 border border-border/50">
                {(['monthly', 'quarterly', 'yearly'] as const).map((c) => (
                  <button key={c} onClick={() => setCycle(c)}
                    className={`relative px-5 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${cycle === c ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {cycle === c && (
                      <motion.div layoutId="pill" className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/60"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }} />
                    )}
                    <span className="relative">{billingLabels[c]}</span>
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {loadingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <Skeleton className="h-5 w-28" /><Skeleton className="h-10 w-32" />
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}</div>
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无可用方案</p>
          ) : (
            <div className="space-y-16">
              {groups.map((g) => (
                <div key={g.name}>
                  {groups.length > 1 && <h3 className="text-lg font-semibold mb-6">{g.name}</h3>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(g.plans ?? []).map((p, i) => (
                      <PlanCard key={p.name} plan={p} cycle={cycle} formatAmount={formatAmount} index={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      {(cfg?.faq.length ?? 0) > 0 && <section className="border-t border-dashed border-border/60">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-center">常见问题</h2>
          </Reveal>
          <div className="mt-10">
            {cfg!.faq.map((f) => <FaqItem key={f.question} q={f.question} a={f.answer} />)}
          </div>
        </div>
      </section>}

      {/* ═══ CTA ═══ */}
      {cfg?.cta.title && <section className="border-t border-dashed border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <Reveal>
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-pretty">{cfg.cta.title}</h2>
              <p className="mt-4 text-lg text-muted-foreground tracking-tight max-w-md mx-auto text-balance">
                {cfg.cta.subtitle}
              </p>
              <div className="mt-8 sm:mt-10">
                <Button size="lg" className="h-12 gap-2.5 rounded-lg px-6 text-lg font-normal group/btn animate-glow-pulse" asChild>
                  <Link to={authed ? '/portal/purchase' : '/register'}>
                    {cfg.cta.button_text} <ArrowRight className="size-4 transition-transform duration-150 ease-out group-hover/btn:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>}

      {/* ═══ 页脚 ═══ */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
          {(cfg?.footer.sections.length ?? 0) > 0 && (
            <div className={`grid grid-cols-2 gap-8 ${{ 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cfg!.footer.sections.length] ?? 'sm:grid-cols-4'}`}>
              {cfg!.footer.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-semibold text-foreground mb-4">{section.title}</h4>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        {link.url.startsWith('http') ? (
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{link.label}</a>
                        ) : link.url.startsWith('#') ? (
                          <a href={link.url} className="hover:text-foreground transition-colors">{link.label}</a>
                        ) : (
                          <Link to={link.url} className="hover:text-foreground transition-colors">{link.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} {siteName}</span>
            <span className="text-xs">{cfg?.footer.copyright || 'All rights reserved.'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
