import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="size-10 text-muted-foreground/30 mb-3" />
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button asChild variant="outline" className="mt-4">
            <Link to={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
