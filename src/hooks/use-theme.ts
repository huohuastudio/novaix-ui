import { useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

const themeCycle: Theme[] = ["light", "dark", "system"]
export const themeIcons = { light: "Sun", dark: "Moon", system: "Monitor" } as const
export const themeLabels = { light: "浅色", dark: "深色", system: "跟随系统" } as const

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system"
  })

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  function setTheme(t: Theme) {
    localStorage.setItem("theme", t)
    setThemeState(t)
  }

  function toggleTheme() {
    setTheme(themeCycle[(themeCycle.indexOf(theme) + 1) % themeCycle.length])
  }

  return { theme, setTheme, toggleTheme }
}
