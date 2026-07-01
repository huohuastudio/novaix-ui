import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadExport, type ExportFormat } from "@/lib/export"

interface ExportButtonProps {
  endpoint: string
  params?: Record<string, string>
  disabled?: boolean
}

export function ExportButton({ endpoint, params, disabled }: ExportButtonProps) {
  const handleExport = (format: ExportFormat) => {
    downloadExport(endpoint, format, params)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download data-icon="inline-start" className="size-4" />
          导出
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          导出为 CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          导出为 Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
