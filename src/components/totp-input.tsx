import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export function TOTPInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <InputOTP maxLength={6} value={value} onChange={onChange} autoFocus={autoFocus}>
      <InputOTPGroup>
        {Array.from({ length: 6 }).map((_, i) => (
          <InputOTPSlot key={i} index={i} className="size-10 text-base" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
