import { createContext, useContext } from "react"
import type {
  ServiceNavMenuTreeNode,
  PublicPublicLinkItem,
  PublicPublicPartnerItem,
  PublicPublicBannerItem,
  PublicPublicTestimonialItem,
  PublicPublicDataCenterItem,
  PublicPublicFaqItem,
} from "@/api"

export interface BootstrapData {
  headerMenus: ServiceNavMenuTreeNode[]
  footerMenus: ServiceNavMenuTreeNode[]
  links: PublicPublicLinkItem[]
  partners: PublicPublicPartnerItem[]
  banners: PublicPublicBannerItem[]
  testimonials: PublicPublicTestimonialItem[]
  dataCenters: PublicPublicDataCenterItem[]
  faqs: PublicPublicFaqItem[]
  homeReady: boolean
}

export const EMPTY_BOOTSTRAP: BootstrapData = {
  headerMenus: [], footerMenus: [], links: [], partners: [],
  banners: [], testimonials: [], dataCenters: [], faqs: [],
  homeReady: false,
}

export const BootstrapContext = createContext<BootstrapData>(EMPTY_BOOTSTRAP)

export function useBootstrapData() {
  return useContext(BootstrapContext)
}
