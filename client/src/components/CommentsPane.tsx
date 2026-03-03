interface CommentsPaneProps {
  collapsed: boolean
  onToggle: () => void
}

export default function CommentsPane({ collapsed, onToggle }: CommentsPaneProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-3 border-l border-gray-100 bg-white shrink-0" style={{ width: 52 }}>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 text-xs font-mono px-1"
          title="Expand comments"
        >
          &lt;&lt;
        </button>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 p-1"
          title="Expand comments"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-100 bg-white shrink-0" style={{ width: 320 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 text-xs font-mono px-1"
          title="Collapse comments"
        >
          &gt;&gt;
        </button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pruning Shears</span>
      </div>

      {/* Body — placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-gray-400">Comments coming in Phase 2</span>
      </div>
    </div>
  )
}
