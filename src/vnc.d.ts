declare module "@novnc/novnc" {
  export default class RFB {
    constructor(target: HTMLElement, url: string | URL, options?: {
      shared?: boolean
      credentials?: { password?: string; target?: string; username?: string }
      repeaterID?: string
      wsProtocols?: string[]
    })
    viewOnly: boolean
    focusOnClick: boolean
    clipViewport: boolean
    dragViewport: boolean
    scaleViewport: boolean
    resizeSession: boolean
    showDotCursor: boolean
    qualityLevel: number
    compressionLevel: number
    disconnect(): void
    sendCredentials(credentials: { password?: string; target?: string; username?: string }): void
    sendKey(keysym: number, code: string | null, down?: boolean): void
    sendCtrlAltDel(): void
    focus(): void
    blur(): void
    machineShutdown(): void
    machineReboot(): void
    machineReset(): void
    clipboardPasteFrom(text: string): void
    addEventListener(type: string, listener: (e: CustomEvent) => void): void
    removeEventListener(type: string, listener: (e: CustomEvent) => void): void
  }
}
