import { incusConfigDefaults, type IncusConfigForm, type IncusConfigFormValues } from "@/types/incus-config"

// 将基础配置字段重置为默认值（仅允许重置基础 schema 中的字段）
export function useConfigReset(form: IncusConfigForm) {
  return (key: keyof IncusConfigFormValues) =>
    () => form.setValue(key, incusConfigDefaults[key])
}
