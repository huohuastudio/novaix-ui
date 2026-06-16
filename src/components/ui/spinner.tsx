import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <svg
      className={cn(sizeMap[size], "animate-spinner-fade", className)}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="12"
          y1="2"
          x2="12"
          y2="6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={0.125 + i * 0.125}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  )
}
