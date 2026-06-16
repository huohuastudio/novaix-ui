import { useCallback } from "react"
import type { UseFormReturn } from "react-hook-form"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function AdvancedSection({ form }: AdvancedSectionProps) {
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
                placeholder={'{\n  "raw.idmap": "both 1000 1000",\n  "limits.cpu.allowance": "50%"\n}'}
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
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </ConfigSection>
  )
}
