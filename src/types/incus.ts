export interface IncusStoragePool {
  name: string
  driver: string
  description: string
  status: string
}

export interface IncusNetwork {
  name: string
  type: string
  description: string
  status: string
  managed: boolean
}

export interface IncusProfile {
  name: string
  description: string
  config: Record<string, string>
  devices: Record<string, Record<string, string>>
  used_by?: string[]
}

export interface IncusStoragePoolDetail {
  name: string
  driver: string
  description: string
  status: string
  config: Record<string, string>
  used_by?: string[]
}

export interface IncusStorageVolume {
  name: string
  type: string
  description: string
  content_type: string
  config: Record<string, string>
  location: string
  used_by?: string[]
  created_at: string
}

export interface IncusNetworkDetail {
  name: string
  type: string
  description: string
  status: string
  managed: boolean
  config: Record<string, string>
  used_by?: string[]
}

export interface IncusImage {
  fingerprint: string
  architecture: string
  type: string
  filename: string
  size: number
  properties: Record<string, string>
  aliases: { name: string; description: string }[]
  cached: boolean
  auto_update: boolean
  public: boolean
  created_at: string
  uploaded_at: string
  last_used_at: string
  expires_at: string
}
