export type FeatureIcon = 'zap' | 'globe' | 'shield' | 'cpu'

export interface HeroConfig { title: string; subtitle: string; description: string }
export interface StatItem { value: string; label: string }
export interface FeatureItem { icon: FeatureIcon; title: string; description: string; items: string[] }
export interface StepItem { title: string; description: string }
export interface FaqItemConfig { question: string; answer: string }
export interface CtaConfig { title: string; subtitle: string; button_text: string }
export interface FooterLink { label: string; url: string }
export interface FooterSection { title: string; links: FooterLink[] }
export interface FooterConfig { sections: FooterSection[]; copyright: string }

export interface HomepageConfig {
  hero: HeroConfig
  stats: StatItem[]
  features: FeatureItem[]
  steps: StepItem[]
  faq: FaqItemConfig[]
  cta: CtaConfig
  footer: FooterConfig
}
