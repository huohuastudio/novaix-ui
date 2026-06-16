export const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "待处理", variant: "destructive" },
  replied: { label: "已回复", variant: "default" },
  user_reply: { label: "用户回复", variant: "secondary" },
  closed: { label: "已关闭", variant: "outline" },
}

export const priorityMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  0: { label: "低", variant: "outline" },
  1: { label: "中", variant: "secondary" },
  2: { label: "高", variant: "destructive" },
}
