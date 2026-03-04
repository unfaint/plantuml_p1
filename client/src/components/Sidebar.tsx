import { useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { trpc } from '../trpc.ts'
import { useWorkspace } from '../context/WorkspaceContext.tsx'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedId: string | null
  onSelect: (id: string) => void
  onWorkspaceChange: (id: string | null) => void
  onOpenWorkspaceSettings: () => void
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

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  )
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function CreateWorkspaceInline({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const utils = trpc.useUtils()
  const createWsMutation = trpc.workspaces.create.useMutation({
    onSuccess: (ws) => {
      void utils.workspaces.list.invalidate()
      setOpen(false)
      setName('')
      onCreated(ws.id)
    },
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-xs text-gray-400 hover:text-green-600 py-1.5 text-left px-1 transition-colors"
      >
        + New Workspace
      </button>
    )
  }

  return (
    <div className="flex gap-1 mt-1">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) createWsMutation.mutate({ name: name.trim() })
          if (e.key === 'Escape') { setOpen(false); setName('') }
        }}
        placeholder="Workspace name"
        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-300"
      />
      <button
        onClick={() => { if (name.trim()) createWsMutation.mutate({ name: name.trim() }) }}
        disabled={!name.trim() || createWsMutation.isPending}
        className="text-xs bg-green-600 disabled:opacity-50 text-white px-2 rounded"
      >
        ✓
      </button>
    </div>
  )
}

export default function Sidebar({ collapsed, onToggle, selectedId, onSelect, onWorkspaceChange, onOpenWorkspaceSettings }: SidebarProps) {
  const { selectedWorkspaceId } = useWorkspace()
  const { data: workspaceList = [] } = trpc.workspaces.list.useQuery()
  const { data: diagrams = [], isLoading } = trpc.diagrams.list.useQuery(
    { workspace_id: selectedWorkspaceId }
  )
  const utils = trpc.useUtils()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const renameMutation = trpc.diagrams.save.useMutation({
    onSuccess: () => void utils.diagrams.list.invalidate(),
  })

  function startRename(id: string, currentTitle: string, e: ReactMouseEvent) {
    e.stopPropagation()
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  function commitRename(id: string) {
    const trimmed = editingTitle.trim()
    if (trimmed) renameMutation.mutate({ id, title: trimmed })
    setEditingId(null)
  }

  const createMutation = trpc.diagrams.create.useMutation({
    onSuccess: (diagram) => {
      void utils.diagrams.list.invalidate()
      onSelect(diagram.id)
    },
  })

  function handleCreate() {
    createMutation.mutate(selectedWorkspaceId ? { workspace_id: selectedWorkspaceId } : {})
  }

  const currentRole = workspaceList.find(w => w.id === selectedWorkspaceId)?.role ?? null

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center py-3 gap-4 border-r border-gray-100 bg-white shrink-0" style={{ width: 52 }}>
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 text-xs font-mono px-1" title="Expand sidebar">
          &gt;&gt;
        </button>
        <button title="Diagrams" className="text-gray-400 hover:text-gray-700 p-1">
          <DocIcon />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCreate}
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
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 text-xs font-mono px-1" title="Collapse sidebar">
          &lt;&lt;
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <select
            value={selectedWorkspaceId ?? ''}
            onChange={e => onWorkspaceChange(e.target.value || null)}
            className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-300"
          >
            <option value="">Personal</option>
            {workspaceList.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          {selectedWorkspaceId && (
            <button
              onClick={onOpenWorkspaceSettings}
              className="text-gray-400 hover:text-gray-700 p-1 rounded"
              title="Workspace settings"
            >
              <GearIcon />
            </button>
          )}
        </div>
        {selectedWorkspaceId && currentRole && (
          <span className="text-xs text-gray-400 pl-1 mt-0.5 block capitalize">{currentRole}</span>
        )}
      </div>

      {/* Diagram list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading && <div className="text-xs text-gray-400 px-1 py-2">Loading…</div>}
        {!isLoading && diagrams.length === 0 && (
          <div className="text-xs text-gray-400 px-1 py-4 text-center">
            No diagrams yet. Sprout one!
          </div>
        )}
        {diagrams.map(diagram => (
          <div
            key={diagram.id}
            onClick={() => { if (editingId !== diagram.id) onSelect(diagram.id) }}
            onDoubleClick={e => startRename(diagram.id, diagram.title, e)}
            className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
              selectedId === diagram.id
                ? 'bg-green-50 text-green-800 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DocIcon />
            {editingId === diagram.id ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename(diagram.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onBlur={() => commitRename(diagram.id)}
                className="flex-1 min-w-0 text-sm bg-white border border-green-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            ) : (
              <>
                <span className="flex-1 truncate">{diagram.title}</span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(diagram.updated_at)}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-gray-100 flex flex-col gap-2">
        <button
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <SproutIcon />
          {createMutation.isPending ? 'Creating…' : 'Sprout New Diagram'}
        </button>
        {!selectedWorkspaceId && (
          <CreateWorkspaceInline onCreated={id => onWorkspaceChange(id)} />
        )}
      </div>
    </aside>
  )
}
