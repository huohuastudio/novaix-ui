import { useMemo, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { SortableList } from "@/components/sortable-list"
import { SettingSkeleton } from "./setting-skeleton"
import { Plus, Trash2 } from "lucide-react"
import { parseJSON, updateAt } from "@/lib/utils"
import type {
  HeroConfig, StatItem, FeatureItem, StepItem,
  CtaConfig, FeatureIcon,
} from "@/types/homepage"

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
    </div>
  )
}

function ItemCard({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="relative rounded-md border p-4 space-y-3">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
      >
        <Trash2 className="size-4" />
      </button>
      {children}
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="gap-1.5">
      <Plus className="size-3.5" /> {label}
    </Button>
  )
}

const defaultHero: HeroConfig = { title: "", subtitle: "", description: "" }
const defaultCta: CtaConfig = { title: "", subtitle: "", button_text: "" }

export function HomepageSection() {
  const { data: raw, loading, saving, save } = useSettings("homepage")

  const initial = useMemo(() => ({
    hero: parseJSON<HeroConfig>(raw.homepage_hero, defaultHero),
    stats: parseJSON<StatItem[]>(raw.homepage_stats, []),
    features: parseJSON<FeatureItem[]>(raw.homepage_features, []),
    steps: parseJSON<StepItem[]>(raw.homepage_steps, []),
    cta: parseJSON<CtaConfig>(raw.homepage_cta, defaultCta),
  }), [raw])

  const [hero, setHero] = useState<HeroConfig>(defaultHero)
  const [stats, setStats] = useState<StatItem[]>([])
  const [features, setFeatures] = useState<FeatureItem[]>([])
  const [steps, setSteps] = useState<StepItem[]>([])
  const [cta, setCta] = useState<CtaConfig>(defaultCta)
  const [initialized, setInitialized] = useState(false)

  if (!loading && !initialized) {
    setHero(initial.hero)
    setStats(initial.stats)
    setFeatures(initial.features)
    setSteps(initial.steps)
    setCta(initial.cta)
    setInitialized(true)
  }

  const handleSave = () => {
    save({
      homepage_hero: JSON.stringify(hero),
      homepage_stats: JSON.stringify(stats),
      homepage_features: JSON.stringify(features),
      homepage_steps: JSON.stringify(steps),
      homepage_cta: JSON.stringify(cta),
    })
  }

  if (loading) return <SettingSkeleton rows={6} />

  return (
    <div className="space-y-6">
      <SectionTitle title="Hero 区域" desc="首页顶部的主标题和描述" />
      <div className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <Label>主标题</Label>
          <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} placeholder="高性能云服务器" />
        </div>
        <div className="space-y-2">
          <Label>副标题</Label>
          <Input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} placeholder="秒级交付" />
        </div>
        <div className="space-y-2">
          <Label>描述</Label>
          <Textarea value={hero.description} onChange={(e) => setHero({ ...hero, description: e.target.value })} rows={2} />
        </div>
      </div>

      <Separator />

      <SectionTitle title="信任指标" desc="Hero 下方的数字统计，建议 4 个。拖拽排序" />
      <SortableList
        items={stats}
        onChange={setStats}
        renderItem={(s, i) => (
          <ItemCard onRemove={() => setStats(stats.filter((_, j) => j !== i))}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">数值</Label>
                <Input value={s.value} onChange={(e) => setStats(updateAt(stats, i, { value: e.target.value }))} placeholder="99.99%" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">标签</Label>
                <Input value={s.label} onChange={(e) => setStats(updateAt(stats, i, { label: e.target.value }))} placeholder="服务可用性保障" />
              </div>
            </div>
          </ItemCard>
        )}
      />
      <AddButton onClick={() => setStats([...stats, { value: "", label: "" }])} label="添加指标" />

      <Separator />

      <SectionTitle title="功能亮点" desc="交替布局的功能展示区块。拖拽排序" />
      <SortableList
        items={features}
        onChange={setFeatures}
        renderItem={(f, i) => (
          <ItemCard onRemove={() => setFeatures(features.filter((_, j) => j !== i))}>
            <div className="grid sm:grid-cols-[120px_1fr] gap-3">
              <div className="space-y-1">
                <Label className="text-xs">图标</Label>
                <Input value={f.icon} onChange={(e) => setFeatures(updateAt(features, i, { icon: e.target.value as FeatureIcon }))} placeholder="zap" />
                <p className="text-[10px] text-muted-foreground">可选: zap, globe, shield, cpu</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">标题</Label>
                <Input value={f.title} onChange={(e) => setFeatures(updateAt(features, i, { title: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">描述</Label>
              <Textarea value={f.description} onChange={(e) => setFeatures(updateAt(features, i, { description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">要点列表</Label>
              {f.items.map((item, j) => (
                <div key={j} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const items = [...f.items]
                      items[j] = e.target.value
                      setFeatures(updateAt(features, i, { items }))
                    }}
                  />
                  <Button
                    type="button" variant="ghost" size="icon" className="shrink-0"
                    onClick={() => setFeatures(updateAt(features, i, { items: f.items.filter((_, k) => k !== j) }))}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button
                type="button" variant="ghost" className="gap-1"
                onClick={() => setFeatures(updateAt(features, i, { items: [...f.items, ""] }))}
              >
                <Plus className="size-3" /> 添加要点
              </Button>
            </div>
          </ItemCard>
        )}
      />
      <AddButton
        onClick={() => setFeatures([...features, { icon: "zap" as FeatureIcon, title: "", description: "", items: [""] }])}
        label="添加功能区块"
      />

      <Separator />

      <SectionTitle title="工作流程" desc="引导用户的步骤说明。拖拽排序" />
      <SortableList
        items={steps}
        onChange={setSteps}
        renderItem={(s, i) => (
          <ItemCard onRemove={() => setSteps(steps.filter((_, j) => j !== i))}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary/30 shrink-0 w-8">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 space-y-2">
                <Input value={s.title} onChange={(e) => setSteps(updateAt(steps, i, { title: e.target.value }))} placeholder="步骤标题" />
                <Input value={s.description} onChange={(e) => setSteps(updateAt(steps, i, { description: e.target.value }))} placeholder="步骤描述" />
              </div>
            </div>
          </ItemCard>
        )}
      />
      <AddButton onClick={() => setSteps([...steps, { title: "", description: "" }])} label="添加步骤" />

      <Separator />

      <SectionTitle title="行动号召 (CTA)" desc="定价区域下方的号召性用语" />
      <div className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <Label>标题</Label>
          <Input value={cta.title} onChange={(e) => setCta({ ...cta, title: e.target.value })} placeholder="准备好了吗？" />
        </div>
        <div className="space-y-2">
          <Label>副标题</Label>
          <Input value={cta.subtitle} onChange={(e) => setCta({ ...cta, subtitle: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>按钮文字</Label>
          <Input value={cta.button_text} onChange={(e) => setCta({ ...cta, button_text: e.target.value })} placeholder="免费注册" />
        </div>
      </div>

      <Separator />

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
