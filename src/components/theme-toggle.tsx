import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/use-theme"

const cycle = ["light", "dark", "system"] as const
const labels = { light: "浅色", dark: "深色", system: "跟随系统" } as const

export function ThemeToggle({ className }: { className?: string } = {}) {
  const { theme, setTheme } = useTheme()

  function toggle() {
    const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length]
    setTheme(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={className} onClick={toggle}>
          {theme === "light" && <Sun className="size-4" />}
          {theme === "dark" && <Moon className="size-4" />}
          {theme === "system" && <Monitor className="size-4" />}
          <span className="sr-only">切换主题</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{labels[theme]}</TooltipContent>
    </Tooltip>
  )
}
