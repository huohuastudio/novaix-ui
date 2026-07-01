import { CircleHelp, GraduationCap, Check, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useGuidedTour } from "@/hooks/use-guided-tour"

const DROPDOWN_CLOSE_DELAY = 100

function TourMenu({ context, buttonClassName }: { context: "admin" | "portal"; buttonClassName?: string }) {
  const { getAvailableTours, startTour, navigateAndStartTour } = useGuidedTour()
  const navigate = useNavigate()
  const tours = getAvailableTours(context)

  if (context === "portal" && tours.length === 0) return null

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={buttonClassName} data-tour="tour-menu">
              <CircleHelp className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>新手教程</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <GraduationCap className="size-4" />
          新手教程
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tours.map((tour) => (
          <DropdownMenuItem
            key={tour.id}
            onClick={() => {
              if (tour.available) {
                setTimeout(() => startTour(tour.id), DROPDOWN_CLOSE_DELAY)
              } else {
                navigateAndStartTour(tour.id, navigate)
              }
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{tour.title}</span>
                {tour.done && <Check className="size-3 text-emerald-500 shrink-0" />}
                {!tour.available && <ExternalLink className="size-3 text-muted-foreground shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{tour.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminTourMenu() {
  return <TourMenu context="admin" />
}

export function PortalTourMenu() {
  return <TourMenu context="portal" buttonClassName="size-8" />
}

export function PortalTourMenuItem() {
  const { getAvailableTours, startTour, navigateAndStartTour } = useGuidedTour()
  const navigate = useNavigate()
  const tours = getAvailableTours("portal")

  if (tours.length === 0) return null

  const currentTour = tours.find((t) => t.available) ?? tours[0]

  return (
    <DropdownMenuItem
      onClick={() => {
        if (currentTour.available) {
          setTimeout(() => startTour(currentTour.id), DROPDOWN_CLOSE_DELAY)
        } else {
          navigateAndStartTour(currentTour.id, navigate)
        }
      }}
    >
      <GraduationCap className="size-4" />
      新手教程
    </DropdownMenuItem>
  )
}
