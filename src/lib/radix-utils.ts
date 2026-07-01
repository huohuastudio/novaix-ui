export function isOutsideIgnoredEvent(e: Event) {
  const originalEvent = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent
  const target = (originalEvent?.target ?? e.target) as HTMLElement | null
  return !!target?.closest?.("[data-outside-ignore]")
}
