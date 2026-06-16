import { Link } from "react-router-dom"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import InstanceTable from "./instance-table"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath } from "@/hooks/use-site-settings"

export default function Instances() {
  const adminPath = useAdminPath()
  useBreadcrumb([{ label: "实例管理" }])
  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">实例管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理所有节点上的 VPS 实例</p>
      </div>
      <InstanceTable
        toolbar={
          <Button asChild>
            <Link to={`${adminPath}/instances/create`}>
              <Plus className="size-4" />
              创建实例
            </Link>
          </Button>
        }
      />
    </div>
  )
}
