import { useMemo, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SortableList } from "@/components/sortable-list"
import { SettingSkeleton } from "./setting-skeleton"
import { Plus, Trash2 } from "lucide-react"
import { parseJSON, updateAt } from "@/lib/utils"
import type {
  HeroConfig, StatItem, FeatureItem, StepItem,
  FaqItemConfig, CtaConfig, FooterConfig, FeatureIcon,
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
const defaultFooter: FooterConfig = { sections: [], copyright: "" }

export function HomepageSection() {
  const { data: raw, loading, saving, save } = useSettings("homepage")

  const initial = useMemo(() => ({
    hero: parseJSON<HeroConfig>(raw.homepage_hero, defaultHero),
    stats: parseJSON<StatItem[]>(raw.homepage_stats, []),
    features: parseJSON<FeatureItem[]>(raw.homepage_features, []),
    steps: parseJSON<StepItem[]>(raw.homepage_steps, []),
    faq: parseJSON<FaqItemConfig[]>(raw.homepage_faq, []),
    cta: parseJSON<CtaConfig>(raw.homepage_cta, defaultCta),
    footer: parseJSON<FooterConfig>(raw.homepage_footer, defaultFooter),
  }), [raw])

  const [hero, setHero] = useState<HeroConfig>(defaultHero)
  const [stats, setStats] = useState<StatItem[]>([])
  const [features, setFeatures] = useState<FeatureItem[]>([])
  const [steps, setSteps] = useState<StepItem[]>([])
  const [faq, setFaq] = useState<FaqItemConfig[]>([])
  const [cta, setCta] = useState<CtaConfig>(defaultCta)
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter)
  const [initialized, setInitialized] = useState(false)

  if (!loading && !initialized) {
    setHero(initial.hero)
    setStats(initial.stats)
    setFeatures(initial.features)
    setSteps(initial.steps)
    setFaq(initial.faq)
    setCta(initial.cta)
    setFooter(initial.footer)
    setInitialized(true)
  }

  const handleSave = () => {
    save({
      homepage_hero: JSON.stringify(hero),
      homepage_stats: JSON.stringify(stats),
      homepage_features: JSON.stringify(features),
      homepage_steps: JSON.stringify(steps),
      homepage_faq: JSON.stringify(faq),
      homepage_cta: JSON.stringify(cta),
      homepage_footer: JSON.stringify(footer),
    })
  }

  if (loading) return <SettingSkeleton rows={6} />

  return (
    <div className="space-y-6">
      <Tabs defaultValue="main" className="space-y-6">
        <TabsList variant="line" className="w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar justify-start">
          <TabsTrigger value="main">页面主体</TabsTrigger>
          <TabsTrigger value="faq">常见问题</TabsTrigger>
          <TabsTrigger value="footer">底部区域</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <SectionTitle title="常见问题" desc="FAQ 折叠面板。拖拽排序" />
          <SortableList
            items={faq}
            onChange={setFaq}
            renderItem={(f, i) => (
              <ItemCard onRemove={() => setFaq(faq.filter((_, j) => j !== i))}>
                <div className="space-y-2">
                  <Input value={f.question} onChange={(e) => setFaq(updateAt(faq, i, { question: e.target.value }))} placeholder="问题" />
                  <Textarea value={f.answer} onChange={(e) => setFaq(updateAt(faq, i, { answer: e.target.value }))} placeholder="回答" rows={2} />
                </div>
              </ItemCard>
            )}
          />
          <AddButton onClick={() => setFaq([...faq, { question: "", answer: "" }])} label="添加问题" />
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <SectionTitle title="行动号召 (CTA)" desc="页面底部的号召性用语区域" />
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

          <SectionTitle title="页脚" desc="底部链接分组和版权信息。拖拽排序" />
          <SortableList
            items={footer.sections}
            onChange={(sections) => setFooter({ ...footer, sections })}
            renderItem={(section, i) => (
              <ItemCard onRemove={() => setFooter({ ...footer, sections: footer.sections.filter((_, j) => j !== i) })}>
                <div className="space-y-1">
                  <Label className="text-xs">分组标题</Label>
                  <Input
                    value={section.title}
                    onChange={(e) => setFooter({ ...footer, sections: updateAt(footer.sections, i, { title: e.target.value }) })}
                    placeholder="产品"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">链接</Label>
                  {section.links.map((link, j) => (
                    <div key={j} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const links = updateAt(section.links, j, { label: e.target.value })
                          setFooter({ ...footer, sections: updateAt(footer.sections, i, { links }) })
                        }}
                        placeholder="链接文字"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const links = updateAt(section.links, j, { url: e.target.value })
                          setFooter({ ...footer, sections: updateAt(footer.sections, i, { links }) })
                        }}
                        placeholder="/path 或 https://..."
                      />
                      <Button
                        type="button" variant="ghost" size="icon" className="shrink-0"
                        onClick={() => {
                          setFooter({ ...footer, sections: updateAt(footer.sections, i, { links: section.links.filter((_, k) => k !== j) }) })
                        }}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button" variant="ghost" className="gap-1"
                    onClick={() => {
                      setFooter({ ...footer, sections: updateAt(footer.sections, i, { links: [...section.links, { label: "", url: "" }] }) })
                    }}
                  >
                    <Plus className="size-3" /> 添加链接
                  </Button>
                </div>
              </ItemCard>
            )}
          />
          <AddButton
            onClick={() => setFooter({ ...footer, sections: [...footer.sections, { title: "", links: [{ label: "", url: "" }] }] })}
            label="添加分组"
          />
          <div className="max-w-2xl space-y-2 pt-2">
            <Label>版权信息</Label>
            <Input value={footer.copyright} onChange={(e) => setFooter({ ...footer, copyright: e.target.value })} placeholder="All rights reserved." />
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
