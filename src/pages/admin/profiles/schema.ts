import { z } from "zod"
import {
  incusConfigSchema,
  incusConfigDefaults,
  buildConfigAndDevices,
  configToFormValues,
} from "@/types/incus-config"

export const profileFormSchema = incusConfigSchema.extend({
  name: z
    .string()
    .min(1, "请输入配置文件名称")
    .max(128, "名称不能超过 128 个字符"),
  description: z.string().optional().default(""),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>

export const fieldNames = Object.keys(profileFormSchema.shape) as Array<keyof ProfileFormValues>

export const defaultValues: ProfileFormValues = {
  ...incusConfigDefaults,
  name: "",
  description: "",
}

export function buildProfileBody(values: ProfileFormValues) {
  const { config, devices } = buildConfigAndDevices(values)
  return {
    name: values.name,
    description: values.description || "",
    config: Object.keys(config).length > 0 ? config : {},
    devices: Object.keys(devices).length > 0 ? devices : {},
  }
}

export function profileToFormValues(profile: {
  name?: string
  description?: string
  config?: Record<string, string>
  devices?: Record<string, Record<string, string>>
}): ProfileFormValues {
  const configFields = configToFormValues(profile.config, profile.devices)

  return {
    ...defaultValues,
    ...configFields,
    name: profile.name ?? "",
    description: profile.description ?? "",
  }
}
