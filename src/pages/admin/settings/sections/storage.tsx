import { toast } from "sonner"
import { postAdminSettingsStorageTest } from "@/api"
import { ProviderSettingsForm } from "@/components/provider-settings-form"
import { getErrorMessage } from "@/lib/utils"

export function StorageSection() {
  return (
    <ProviderSettingsForm
      kind="storage"
      title="对象存储"
      description="将镜像、ISO 等大文件归档备份到远程对象存储；本地磁盘仍是主存储，文件丢失时可从对象存储自动恢复"
      enableLabel="启用对象存储归档"
      enableHint="启用后，镜像/ISO 会在下载或上传完成后异步备份到对象存储"
      selectPlaceholder="请选择存储服务"
      test={{
        label: "测试连接",
        inputless: true,
        send: async () => {
          try {
            const { data: res } = await postAdminSettingsStorageTest()
            if (res?.code === 0) {
              toast.success("对象存储连接成功")
              return true
            }
            toast.error(res?.message ?? "连接失败")
            return false
          } catch (err) {
            toast.error(getErrorMessage(err, "连接失败"))
            return false
          }
        },
      }}
    />
  )
}
