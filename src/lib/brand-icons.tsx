import type { SVGProps } from "react"

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

export function IconMicrosoft({ size = 24, color = "currentColor", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} {...props}>
      <path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" />
    </svg>
  )
}

export function IconDingtalk({ size = 24, color = "currentColor", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} {...props}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.561 12.263l-4.413 1.47-.595 2.622s-.147.464-.537.193c0 0-2.098-1.634-2.448-1.897a.255.255 0 01-.07-.283c.126-.353 2.87-2.628 2.87-2.628s.334-.298.327-.477c-.007-.18-.405-.13-.405-.13L7.86 13.825s-.717.404-1.528.025l-2.394-.85s-.575-.404.397-.826C4.335 12.174 19.253 6.5 19.253 6.5s.71-.257.71.4c0 0 .107.07-.036.637-.143.566-2.366 4.726-2.366 4.726z" />
    </svg>
  )
}

export function IconWecom({ size = 24, color = "currentColor", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} {...props}>
      <path d="M10.263 1.5C5.622 1.5 1.86 5.09 1.86 9.516c0 2.52 1.224 4.77 3.14 6.263l-.345 2.088a.466.466 0 00.67.495l2.39-1.228c.828.258 1.71.398 2.625.398.177 0 .352-.006.527-.017a6.378 6.378 0 01-.288-1.887c0-3.706 3.15-6.712 7.032-6.712.298 0 .59.018.879.052C18.028 4.769 14.499 1.5 10.263 1.5zm-3.14 6.36a1.125 1.125 0 110 2.25 1.125 1.125 0 010-2.25zm5.332 0a1.125 1.125 0 110 2.25 1.125 1.125 0 010-2.25zM17.61 10.5c-3.35 0-6.069 2.598-6.069 5.804 0 3.205 2.72 5.804 6.07 5.804.724 0 1.418-.118 2.066-.334l1.883.968a.4.4 0 00.575-.425l-.272-1.643c1.51-1.177 2.477-2.956 2.477-4.94 0-2.636-1.937-4.87-4.63-5.556a6.334 6.334 0 00-2.1-.248zM15.25 14.25a.937.937 0 110 1.875.937.937 0 010-1.875zm4.5 0a.937.937 0 110 1.875.937.937 0 010-1.875z" />
    </svg>
  )
}
