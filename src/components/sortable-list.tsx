import { useRef, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

interface SortableListProps<T extends object> {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, index: number) => React.ReactNode
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <div className="group relative">
        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors z-10"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="pl-7">{children}</div>
      </div>
    </div>
  )
}

export function SortableList<T extends object>({ items, onChange, renderItem }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const idMapRef = useRef(new WeakMap<T, string>())
  const counterRef = useRef(0)

  // eslint-disable-next-line react-hooks/refs -- 稳定 ID 映射需要在渲染阶段读取 ref
  const ids = items.map((item) => {
    let id = idMapRef.current.get(item)
    if (!id) { id = `s-${++counterRef.current}`; idMapRef.current.set(item, id) }
    return id
  })

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex(item => idMapRef.current.get(item) === String(active.id))
        const newIndex = items.findIndex(item => idMapRef.current.get(item) === String(over.id))
        if (oldIndex !== -1 && newIndex !== -1) onChange(arrayMove(items, oldIndex, newIndex))
      }
    },
    [items, onChange],
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item, i) => (
            <SortableItem key={ids[i]} id={ids[i]}>
              {renderItem(item, i)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
