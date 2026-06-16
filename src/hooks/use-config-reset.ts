import type { UseFormReturn } from "react-hook-form"
import { incusConfigDefaults, type IncusConfigFormValues } from "@/types/incus-config"

export function useConfigReset(form: UseFormReturn<IncusConfigFormValues>) {
  return (key: keyof IncusConfigFormValues) =>
    () => form.setValue(key, incusConfigDefaults[key])
}
