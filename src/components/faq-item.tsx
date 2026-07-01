import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { sanitizeHtml } from "@/lib/sanitize"

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-[15px] font-medium text-foreground cursor-pointer"
      >
        {q}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="pb-5 text-sm text-muted-foreground leading-relaxed markdown-body [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(a) }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
