import { useCallback } from "react"
import type { IncusConfigForm } from "@/types/incus-config"
import { ConfigSection } from "@/components/config-table"
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"

const extensions = [json()]

interface AdvancedSectionProps {
  form: IncusConfigForm
  mode?: "instance" | "profile"
}

export function AdvancedSection({ form, mode = "instance" }: AdvancedSectionProps) {
  const handleChange = useCallback(
    (value: string) => {
      form.setValue("raw_incus_config", value)
    },
    [form]
  )

  return (
    <ConfigSection
      title="高级配置"
      description="直接编辑原始配置项（JSON 格式），这些配置将与其他节的配置合并"
    >
      <FormField
        control={form.control}
        name="raw_incus_config"
        render={({ field }) => (
          <FormItem>
            <FormLabel>原始配置</FormLabel>
            <div className="rounded-md border overflow-hidden">
              <CodeMirror
                value={field.value}
                onChange={handleChange}
                extensions={extensions}
                height="280px"
                placeholder={'{\n  "raw.idmap": "both 1000 1000",\n  "security.nesting": "true"\n}'}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  bracketMatching: true,
                  autocompletion: false,
                }}
              />
            </div>
            <FormDescription>
              以 JSON 格式输入额外的配置项，键值格式如 {`{"key": "value"}`}
              {mode === "instance" && "。数字格式的 limits.cpu / limits.memory 由资源配置字段托管；CPU 绑定等非数字格式在此处管理，系统会自动同步资源统计值"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </ConfigSection>
  )
}
