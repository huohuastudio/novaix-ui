import { createContext, useContext } from "react"
import type {
  ServiceNavMenuTreeNode,
  PublicPublicLinkItem,
  PublicPublicPartnerItem,
  PublicPublicBannerItem,
  PublicPublicTestimonialItem,
  PublicPublicRegionItem,
  PublicPublicFaqItem,
} from "@/api"

export interface BootstrapData {
  headerMenus: ServiceNavMenuTreeNode[]
  footerMenus: ServiceNavMenuTreeNode[]
  links: PublicPublicLinkItem[]
  partners: PublicPublicPartnerItem[]
  banners: PublicPublicBannerItem[]
  testimonials: PublicPublicTestimonialItem[]
  regions: PublicPublicRegionItem[]
  faqs: PublicPublicFaqItem[]
  homeReady: boolean
}

export const EMPTY_BOOTSTRAP: BootstrapData = {
  headerMenus: [], footerMenus: [], links: [], partners: [],
  banners: [], testimonials: [], regions: [], faqs: [],
  homeReady: false,
}

export const BootstrapContext = createContext<BootstrapData>(EMPTY_BOOTSTRAP)

export function useBootstrapData() {
  return useContext(BootstrapContext)
}
