import { useMaintenanceGuard } from "@/hooks/use-maintenance"

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { active, message } = useMaintenanceGuard()

  if (active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-bold mb-2">系统维护中</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
