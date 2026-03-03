import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { trpc } from '../trpc.ts'
import CodeEditor from './CodeEditor.tsx'
import SvgPreview from './SvgPreview.tsx'

interface EditorPaneProps {
  id: string
  onDelete: () => void
}

const MIN_PCT = 20
const MAX_PCT = 80

export default function EditorPane({ id, onDelete }: EditorPaneProps) {
  const { data: diagram, isLoading } = trpc.diagrams.get.useQuery({ id })
  const utils = trpc.useUtils()

  const saveMutation        = trpc.diagrams.save.useMutation({ onSuccess: () => void utils.diagrams.list.invalidate() })
  const deleteMutation      = trpc.diagrams.delete.useMutation({ onSuccess: onDelete })
  const togglePublicMutation = trpc.diagrams.togglePublic.useMutation({ onSuccess: () => void utils.diagrams.get.invalidate({ id }) })

  const [source, setSource] = useState('')
  const [title, setTitle]   = useState('')
  const [saved, setSaved]   = useState(false)
  const [copied, setCopied] = useState(false)

  // Resizable split
  const [splitPct, setSplitPct] = useState(45)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Initialize title/source from DB once on first load; local state is authoritative after that
  const initialized = useRef(false)
  useEffect(() => {
    if (!diagram || initialized.current) return
    initialized.current = true
    setTitle(diagram.title)
    setSource(diagram.versions[0]?.source ?? '')
  }, [diagram])

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplitPct(Math.min(MAX_PCT, Math.max(MIN_PCT, pct)))
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  function handleSave() {
    saveMutation.mutate(
      { id, title, source },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      }
    )
  }

  function handleTitleBlur() {
    if (diagram && title !== diagram.title && title.trim()) {
      saveMutation.mutate({ id, title })
    }
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    deleteMutation.mutate({ id })
  }

  function handleTogglePublic() {
    if (!diagram) return
    togglePublicMutation.mutate({ id, is_public: !diagram.is_public })
  }

  function handleCopyShareLink() {
    const url = `${window.location.origin}/share/${id}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  const isPublic = diagram?.is_public ?? false

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white shrink-0">
        {/* Editable title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="flex-1 min-w-0 text-sm font-semibold text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 focus:ring-1 focus:ring-green-300 rounded px-2 py-1"
          placeholder="Diagram title"
        />

        {/* Public toggle */}
        <button
          onClick={handleTogglePublic}
          disabled={togglePublicMutation.isPending}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            isPublic
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isPublic ? 'Public' : 'Private'}
        </button>

        {/* Share link (only when public) */}
        {isPublic && (
          <button
            onClick={handleCopyShareLink}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Share Link'}
          </button>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {saveMutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Split: editor | preview */}
      <div ref={containerRef} className="flex flex-1 min-h-0 relative">
        {/* Code panel */}
        <div className="min-h-0 overflow-hidden flex flex-col" style={{ width: `${splitPct}%` }}>
          <CodeEditor source={source} onChange={setSource} />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="relative z-20 flex items-center justify-center shrink-0 cursor-col-resize group"
          style={{ width: 8, background: 'transparent' }}
        >
          <div className="w-px h-full bg-gray-200 group-hover:bg-green-400 transition-colors" />
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <SvgPreview source={source} />
        </div>
      </div>
    </div>
  )
}
