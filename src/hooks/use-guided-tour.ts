import { useCallback, useEffect, useMemo, useRef } from "react"
import { useLocation } from "react-router-dom"
import { useLocalStorage } from "@uidotdev/usehooks"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { buildAdminTours, portalTours, type TourDefinition } from "@/lib/tours"
import { useAdminPath } from "@/hooks/use-site-settings"

const STORAGE_KEY = "novaix-tours-completed"
const PENDING_TOUR_KEY = "novaix-tour-pending"
function matchesPath(tour: TourDefinition, pathname: string) {
  return typeof tour.pathPattern === "function"
    ? tour.pathPattern(pathname)
    : pathname === tour.pathPattern || pathname.startsWith(tour.pathPattern + "/")
}

function closeOpenDialogs() {
  const dialog = document.querySelector<HTMLElement>("[role='dialog']:not(.driver-popover)")
  if (dialog) {
    const closeBtn = dialog.querySelector<HTMLElement>("button[aria-label]")
    closeBtn?.click()
  }
}

function launchDriver(tour: TourDefinition, onComplete: () => void) {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayColor: "black",
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: "novaix-tour-popover",
    progressText: "{{current}} / {{total}}",
    nextBtnText: "下一步",
    prevBtnText: "上一步",
    doneBtnText: "完成",
    onDestroyStarted: () => {
      closeOpenDialogs()
      driverObj.destroy()
      onComplete()
    },
    steps: tour.steps,
  })
  driverObj.drive()
}

export function useGuidedTour() {
  const location = useLocation()
  const adminPath = useAdminPath()
  const [completed, setCompleted] = useLocalStorage<string[]>(STORAGE_KEY, [])

  const allTours = useMemo(
    () => [...buildAdminTours(adminPath), ...portalTours],
    [adminPath],
  )
  const allToursRef = useRef(allTours)
  // eslint-disable-next-line react-hooks/refs -- ref 仅在 effect 中读取，渲染时同步更新确保不会读到过期值
  allToursRef.current = allTours

  const markCompleted = useCallback(
    (tourId: string) => {
      setCompleted((prev) => prev.includes(tourId) ? prev : [...prev, tourId])
    },
    [setCompleted],
  )

  useEffect(() => {
    const pendingId = sessionStorage.getItem(PENDING_TOUR_KEY)
    if (!pendingId) return

    const tour = allToursRef.current.find((t) => t.id === pendingId)
    if (!tour || !matchesPath(tour, location.pathname)) return

    sessionStorage.removeItem(PENDING_TOUR_KEY)
    const timer = setTimeout(() => {
      launchDriver(tour, () => markCompleted(pendingId))
    }, 500)
    return () => clearTimeout(timer)
  }, [location.pathname, markCompleted])

  const getAvailableTours = useCallback(
    (scope: "admin" | "portal") => {
      const tours = scope === "admin"
        ? allTours.filter((t) => t.id.startsWith("admin-"))
        : portalTours
      return tours.map((tour) => ({
        ...tour,
        available: matchesPath(tour, location.pathname),
        done: completed.includes(tour.id),
      }))
    },
    [allTours, location.pathname, completed],
  )

  const startTour = useCallback(
    (tourId: string) => {
      const tour = allTours.find((t) => t.id === tourId)
      if (!tour) return
      launchDriver(tour, () => markCompleted(tourId))
    },
    [allTours, markCompleted],
  )

  const navigateAndStartTour = useCallback(
    (tourId: string, navigate: (path: string) => void) => {
      const tour = allTours.find((t) => t.id === tourId)
      if (!tour) return

      const targetPath =
        typeof tour.navigateTo === "function"
          ? tour.navigateTo(adminPath)
          : tour.navigateTo

      if (targetPath) {
        sessionStorage.setItem(PENDING_TOUR_KEY, tourId)
        navigate(targetPath)
      }
    },
    [allTours, adminPath],
  )

  return {
    getAvailableTours,
    startTour,
    navigateAndStartTour,
  }
}
