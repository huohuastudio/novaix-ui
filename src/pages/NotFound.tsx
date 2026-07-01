import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

function Illustration() {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[280px] h-[200px] text-foreground"
      aria-hidden
    >
      {/* 断开的网线左半 */}
      <path
        d="M40 120 Q70 120 90 105 Q110 90 120 90"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* 左侧插头 */}
      <rect x="112" y="82" width="18" height="16" rx="2" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="currentColor" fillOpacity="0.04" />
      <rect x="116" y="87" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="121" y="87" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="126" y="87" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />

      {/* 断开间隙 — 小闪电/火花 */}
      <path d="M133 88 L136 85 L134 90 L137 87" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* 右侧插头 */}
      <rect x="150" y="82" width="18" height="16" rx="2" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="currentColor" fillOpacity="0.04" />
      <rect x="152" y="87" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="157" y="87" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="162" y="87" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />

      {/* 断开的网线右半 */}
      <path
        d="M168 90 Q178 90 190 105 Q210 120 240 120"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* 左侧小服务器 */}
      <rect x="20" y="108" width="28" height="24" rx="4" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" fill="currentColor" fillOpacity="0.03" />
      <circle cx="30" cy="118" r="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="36" y1="118" x2="42" y2="118" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="125" r="2" fill="currentColor" fillOpacity="0.1" />
      <line x1="36" y1="125" x2="42" y2="125" stroke="currentColor" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" />

      {/* 右侧小服务器 */}
      <rect x="232" y="108" width="28" height="24" rx="4" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" fill="currentColor" fillOpacity="0.03" />
      <circle cx="242" cy="118" r="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="248" y1="118" x2="254" y2="118" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="242" cy="125" r="2" fill="currentColor" fillOpacity="0.1" />
      <line x1="248" y1="125" x2="254" y2="125" stroke="currentColor" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" />

      {/* 大字 404 */}
      <text
        x="140"
        y="62"
        textAnchor="middle"
        fontSize="56"
        fontWeight="800"
        letterSpacing="-3"
        fill="currentColor"
        fillOpacity="0.07"
        fontFamily="var(--font-sans)"
      >
        404
      </text>
    </svg>
  )
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <Illustration />

        <h1 className="text-base font-medium mt-4 mb-1">
          页面未找到
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          你访问的页面不存在或已被移除
        </p>

        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <ArrowLeft />
            返回首页
          </Link>
        </Button>
      </div>
    </div>
  )
}
