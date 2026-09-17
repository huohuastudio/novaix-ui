const svOpts: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}

/**
 * RFC3339 UTC → datetime-local（系统时区）
 * "2026-09-12T12:49:00Z" + "Asia/Shanghai" → "2026-09-12T20:49"
 */
export function serverToDatetimeLocal(serverStr: string | undefined | null, tz: string): string {
  if (!serverStr) return ""
  const d = new Date(serverStr)
  if (isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("sv-SE", { ...svOpts, timeZone: tz })
    .format(d)
    .replace(" ", "T")
}

/**
 * datetime-local（系统时区）→ 后端接受的 UTC 字符串
 * "2026-09-12T20:49" + "Asia/Shanghai" → "2026-09-12 12:49:00"
 */
export function datetimeLocalToServer(localStr: string | undefined | null, tz: string): string | undefined {
  if (!localStr) return undefined
  const target = new Date(localStr + ":00Z")
  if (isNaN(target.getTime())) return undefined

  const fmt = new Intl.DateTimeFormat("sv-SE", { ...svOpts, second: "2-digit", timeZone: tz })
  let guess = new Date(target.getTime())
  for (let i = 0; i < 2; i++) {
    const inTZ = fmt.format(guess)
    const diff = new Date(inTZ.replace(" ", "T") + "Z").getTime() - target.getTime()
    guess = new Date(guess.getTime() - diff)
  }

  return guess.toISOString().slice(0, 19).replace("T", " ")
}
