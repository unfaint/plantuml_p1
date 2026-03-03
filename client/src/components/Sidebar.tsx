import { trpc } from '../trpc.ts'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedId: string | null
  onSelect: (id: string) => void
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" />
      <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" />
    </svg>
  )
}

function SproutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 14V8" />
      <path d="M8 8C8 5 5 3 2 3c0 3 2 5 6 5z" />
      <path d="M8 8c0-3 3-5 6-5 0 3-2 5-6 5z" />
    </svg>
  )
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Sidebar({ collapsed, onToggle, selectedId, onSelect }: SidebarProps) {
  const { data: diagrams = [], isLoading } = trpc.diagrams.list.useQuery()
  const utils = trpc.useUtils()
  const createMutation = trpc.diagrams.create.useMutation({
    onSuccess: (diagram) => {
      void utils.diagrams.list.invalidate()
      onSelect(diagram.id)
    },
  })

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center py-3 gap-4 border-r border-gray-100 bg-white shrink-0" style={{ width: 52 }}>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 text-xs font-mono px-1"
          title="Expand sidebar"
        >
          &gt;&gt;
        </button>
        <button title="Diagrams" className="text-gray-400 hover:text-gray-700 p-1">
          <DocIcon />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => createMutation.mutate()}
          title="Sprout New Diagram"
          className="text-green-600 p-1"
          disabled={createMutation.isPending}
        >
          <SproutIcon />
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col border-r border-gray-100 bg-white shrink-0" style={{ width: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Garden Patch</span>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 text-xs font-mono px-1"
          title="Collapse sidebar"
        >
          &lt;&lt;
        </button>
      </div>

      {/* Diagram list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading && (
          <div className="text-xs text-gray-400 px-1 py-2">Loading…</div>
        )}
        {!isLoading && diagrams.length === 0 && (
          <div className="text-xs text-gray-400 px-1 py-4 text-center">
            No diagrams yet. Sprout one!
          </div>
        )}
        {diagrams.map(diagram => (
          <button
            key={diagram.id}
            onClick={() => onSelect(diagram.id)}
            className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
              selectedId === diagram.id
                ? 'bg-green-50 text-green-800 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DocIcon />
            <span className="flex-1 truncate">{diagram.title}</span>
            <span className="text-xs text-gray-400 shrink-0">{formatDate(diagram.updated_at)}</span>
          </button>
        ))}
      </div>

      {/* Sprout button */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <SproutIcon />
          {createMutation.isPending ? 'Creating…' : 'Sprout New Diagram'}
        </button>
      </div>
    </aside>
  )
}
