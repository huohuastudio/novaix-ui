import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"
import { Plus, Minus, LocateFixed } from "lucide-react"
import worldData from "@/assets/world-110m.json"

interface RegionPoint {
  region_id?: number
  display_name?: string
  latitude?: number
  longitude?: number
  node_count?: number
  online_count?: number
  cpu_usage?: number
  mem_usage?: number
  disk_usage?: number
}

interface RegionMapProps {
  regions: RegionPoint[]
}

const REGION_LABELS: Array<{ name: string; lat: number; lng: number; sea?: boolean }> = [
  { name: "中国", lat: 35, lng: 105 },
  { name: "俄罗斯", lat: 62, lng: 95 },
  { name: "美国", lat: 40, lng: -100 },
  { name: "加拿大", lat: 56, lng: -96 },
  { name: "巴西", lat: -10, lng: -55 },
  { name: "澳大利亚", lat: -25, lng: 135 },
  { name: "印度", lat: 22, lng: 80 },
  { name: "日本", lat: 37, lng: 140 },
  { name: "印度尼西亚", lat: -3, lng: 118 },
  { name: "德国", lat: 51, lng: 10 },
  { name: "英国", lat: 54, lng: -2 },
  { name: "韩国", lat: 36, lng: 128 },
  { name: "泰国", lat: 15, lng: 101 },
  { name: "新加坡", lat: 1.3, lng: 104 },
  { name: "阿根廷", lat: -35, lng: -64 },
  { name: "南非", lat: -30, lng: 25 },
  { name: "埃及", lat: 27, lng: 30 },
  { name: "沙特阿拉伯", lat: 24, lng: 45 },
  { name: "墨西哥", lat: 23, lng: -102 },
  { name: "太平洋", lat: 0, lng: -150, sea: true },
  { name: "大西洋", lat: 15, lng: -35, sea: true },
  { name: "印度洋", lat: -20, lng: 75, sea: true },
]

const INITIAL_SCALE = 140
const MIN_SCALE = 80
const MAX_SCALE = 600
const VB_W = 960
const VB_H = 480

export function RegionMap({ regions }: RegionMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionPoint | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(INITIAL_SCALE)
  const [translate, setTranslate] = useState<[number, number]>([VB_W / 2, VB_H / 1.7])
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null)
  const translateRef = useRef(translate)
  useEffect(() => { translateRef.current = translate }, [translate])
  const svgRef = useRef<SVGSVGElement>(null)

  const countries = useMemo(() => {
    const topo = worldData as unknown as Topology<{ countries: GeometryCollection }>
    return feature(topo, topo.objects.countries)
  }, [])

  const { projection, pathGenerator } = useMemo(() => {
    const proj = geoMercator().scale(scale).translate(translate)
    return { projection: proj, pathGenerator: geoPath(proj) }
  }, [scale, translate])

  const validRegions = useMemo(
    () => regions.filter(r => r.latitude != null && r.longitude != null && !(r.latitude === 0 && r.longitude === 0)),
    [regions],
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - e.deltaY * 0.3)))
    }
    svg.addEventListener("wheel", handler, { passive: false })
    return () => svg.removeEventListener("wheel", handler)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-node-dot]")) return
    const svg = svgRef.current
    if (!svg) return
    svg.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTx: translateRef.current[0], startTy: translateRef.current[1] }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const ratioX = VB_W / rect.width
    const ratioY = VB_H / rect.height
    const dx = (e.clientX - dragRef.current.startX) * ratioX
    const dy = (e.clientY - dragRef.current.startY) * ratioY
    setTranslate([dragRef.current.startTx + dx, dragRef.current.startTy + dy])
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const handleZoom = useCallback((dir: 1 | -1) => {
    setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + dir * 40)))
  }, [])

  const handleReset = useCallback(() => {
    setScale(INITIAL_SCALE)
    setTranslate([VB_W / 2, VB_H / 1.7])
  }, [])

  return (
    <div className="relative select-none overflow-hidden rounded-lg">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto cursor-grab active:cursor-grabbing"
        style={{ maxHeight: 380 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      >
        <defs>
          <style>{`
            @keyframes map-pulse {
              0% { r: 7; opacity: 0.45; }
              100% { r: 18; opacity: 0; }
            }
          `}</style>
        </defs>

        {("features" in countries ? (countries as GeoJSON.FeatureCollection).features : [countries as GeoJSON.Feature]).map((f, i) => (
          <path
            key={i}
            d={pathGenerator(f) ?? ""}
            fill="#d1d5db"
            stroke="#fff"
            className="dark:fill-[#374151] dark:stroke-[#1f2937]"
            strokeWidth={0.5}
          />
        ))}

        {REGION_LABELS.map(label => {
          const coords = projection([label.lng, label.lat])
          if (!coords) return null
          return (
            <text
              key={label.name}
              x={coords[0]}
              y={coords[1]}
              textAnchor="middle"
              className={`select-none pointer-events-none ${label.sea ? "fill-muted-foreground/30" : "fill-muted-foreground/70"}`}
              style={{ fontSize: label.sea ? 12 : 10, fontStyle: label.sea ? "italic" : "normal" }}
            >
              {label.name}
            </text>
          )
        })}

        {validRegions.map(region => {
          const coords = projection([region.longitude!, region.latitude!])
          if (!coords) return null
          const hasOnline = (region.online_count ?? 0) > 0
          const color = hasOnline ? "#22c55e" : "var(--color-muted-foreground)"
          return (
            <g key={region.region_id ?? `${region.latitude}-${region.longitude}`} data-node-dot>
              {hasOnline && (
                <circle
                  cx={coords[0]}
                  cy={coords[1]}
                  fill={color}
                  style={{ animation: "map-pulse 2s ease-out infinite" }}
                />
              )}
              <circle
                cx={coords[0]}
                cy={coords[1]}
                r={6}
                fill={color}
                stroke="var(--color-card)"
                strokeWidth={2}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  if (!svgRef.current) return
                  const svgRect = svgRef.current.getBoundingClientRect()
                  setHoveredRegion(region)
                  setTooltipPos({
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                  })
                }}
                onMouseLeave={() => setHoveredRegion(null)}
              />
            </g>
          )
        })}
      </svg>

      {/* 缩放控件 */}
      <div className="absolute right-2.5 bottom-2.5 flex flex-col gap-0.5">
        {([
          { icon: Plus, action: () => handleZoom(1) },
          { icon: Minus, action: () => handleZoom(-1) },
          { icon: LocateFixed, action: handleReset },
        ] as const).map(({ icon: Icon, action }, i) => (
          <button
            key={i}
            onClick={action}
            className="flex size-7 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>

      {hoveredRegion && (
        <div
          className="absolute z-10 pointer-events-none rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 12,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium">{hoveredRegion.display_name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: (hoveredRegion.online_count ?? 0) > 0 ? "#22c55e" : "var(--color-muted-foreground)" }}
            />
            <span>节点 {hoveredRegion.online_count ?? 0}/{hoveredRegion.node_count ?? 0} 在线</span>
          </div>
          {(hoveredRegion.online_count ?? 0) > 0 && hoveredRegion.cpu_usage !== undefined && (
            <div className="mt-1 text-muted-foreground tabular-nums">
              CPU {hoveredRegion.cpu_usage.toFixed(0)}% · 内存 {hoveredRegion.mem_usage?.toFixed(0)}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}
