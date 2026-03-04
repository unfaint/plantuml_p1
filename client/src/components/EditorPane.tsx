import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { trpc, trpcClient } from '../trpc.ts'
import type { CollabAwareness } from '../editor/useCollabCodeMirror.ts'
import { CollabEditor } from '../editor/CollabEditor.tsx'
import SvgPreview from './SvgPreview.tsx'

type ConnStatus = 'connecting' | 'connected' | 'disconnected'
type EffectiveRole = 'personal-owner' | 'owner' | 'admin' | 'member'

interface EditorPaneProps {
  id: string
  onDelete: () => void
  onConnStatusChange?: (status: ConnStatus) => void
  effectiveRole: EffectiveRole
}

interface RemoteUser {
  name: string
  color: string
  previewCursor: { x: number; y: number } | null
}

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]!
}

const MIN_PCT = 20
const MAX_PCT = 80

export default function EditorPane({ id, onDelete, onConnStatusChange, effectiveRole }: EditorPaneProps) {
  const { getToken } = useAuth()
  const { user } = useUser()

  const { data: diagram, isLoading } = trpc.diagrams.get.useQuery({ id })
  const utils = trpc.useUtils()

  const deleteMutation       = trpc.diagrams.delete.useMutation({
    onSuccess: () => { void utils.diagrams.list.invalidate(); onDelete() },
  })
  const togglePublicMutation = trpc.diagrams.togglePublic.useMutation({
    onSuccess: () => void utils.diagrams.get.invalidate({ id }),
  })

  const [svgContent, setSvgContent] = useState('')
  const [renderError, setRenderError] = useState<string | null>(null)
  const [errorExpanded, setErrorExpanded] = useState(false)
  const renderErrorRef = useRef<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const [awareness, setAwareness]   = useState<CollabAwareness | null>(null)
  const awarenessRef = useRef<CollabAwareness | null>(null)

  // Resizable split
  const [splitPct, setSplitPct] = useState(45)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Stable Yjs refs — key={id} on EditorPane (in App.tsx) ensures remount per diagram
  const ydocRef        = useRef(new Y.Doc())
  const ytextRef       = useRef(ydocRef.current.getText('plantuml-source'))
  const undoManagerRef = useRef(new Y.UndoManager(ytextRef.current))
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // HocuspocusProvider — runs once per mount
  useEffect(() => {
    const userName  = user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? 'User'
    const userColor = user ? colorFromId(user.id) : '#60a5fa'

    const provider = new HocuspocusProvider({
      url: `ws://${window.location.hostname}:1234`,
      name: `diagram-${id}`,
      document: ydocRef.current,
      token: async () => (await getToken()) ?? '',
    })

    const aw = provider.awareness
    if (aw) {
      aw.setLocalStateField('user', { name: userName, color: userColor, colorLight: userColor + '33' })

      aw.on('change', () => {
        const states = [...aw.getStates().entries()]
        setRemoteUsers(
          states
            .filter(([cid]) => cid !== aw.clientID)
            .map(([, s]) => {
              type AwarenessState = { user?: { name: string; color: string }; previewCursor?: { x: number; y: number } | null }
              const state = s as AwarenessState
              if (!state.user) return null
              return { ...state.user, previewCursor: state.previewCursor ?? null } satisfies RemoteUser
            })
            .filter((u): u is RemoteUser => u !== null)
        )
      })

      awarenessRef.current = aw as unknown as CollabAwareness
      setAwareness(aw as unknown as CollabAwareness)
    }

    provider.on('status', ({ status }: { status: ConnStatus }) => {
      onConnStatusChange?.(status)
    })

    return () => provider.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ytext observer → debounced SVG render via vanilla trpcClient
  // Debounce is shorter (150ms) when already in error state for faster fix feedback
  useEffect(() => {
    const ytext = ytextRef.current
    const observer = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const delay = renderErrorRef.current !== null ? 1000 : 400
      debounceRef.current = setTimeout(async () => {
        const source = ytext.toString()
        if (!source.trim()) {
          setSvgContent('')
          setRenderError(null)
          renderErrorRef.current = null
          return
        }
        const { svg, error } = await trpcClient.render.svg.mutate({ source })
        renderErrorRef.current = error
        setRenderError(error)
        if (!error) {
          setSvgContent(svg.replace(/(<svg[^>]*)\s+width="[^"]*"/, '$1').replace(/(<svg[^>]*)\s+height="[^"]*"/, '$1'))
        }
        // on error: keep previous svgContent so the preview stays on the last good render
      }, delay)
    }
    ytext.observe(observer)
    // Fire immediately in case ytext was already populated before this observer registered
    if (ytext.length > 0) observer()
    return () => ytext.unobserve(observer)
  }, [])

  // Resizable split drag logic
  const onDividerMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!dragging.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
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

  const handlePreviewCursorMove = useCallback((x: number, y: number) => {
    awarenessRef.current?.setLocalStateField('previewCursor', { x, y })
  }, [])

  const handlePreviewCursorLeave = useCallback(() => {
    awarenessRef.current?.setLocalStateField('previewCursor', null)
  }, [])

  function handleDelete() {
    if (!window.confirm(`Delete this diagram? This cannot be undone.`)) return
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
  const canWrite = effectiveRole !== 'member'

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white shrink-0">
        {/* Remote user presence avatars */}
        {remoteUsers.length > 0 && (
          <div className="flex items-center gap-1">
            {remoteUsers.map((u, i) => (
              <div
                key={i}
                title={u.name}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
                style={{ background: u.color }}
              >
                {u.name.slice(0, 2)}
              </div>
            ))}
          </div>
        )}

        {/* Public toggle (owner/admin only) */}
        {canWrite && (
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
        )}

        {/* Share link (only when public) */}
        {isPublic && (
          <button
            onClick={handleCopyShareLink}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Share Link'}
          </button>
        )}

        {/* Delete (owner/admin only) */}
        {canWrite && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Split: editor | preview */}
      <div ref={splitContainerRef} className="flex flex-1 min-h-0 relative">
        {/* Code panel */}
        <div className="min-h-0 overflow-hidden flex flex-col" style={{ width: `${splitPct}%` }}>
          {renderError && (() => {
            const lineMatch = /\[From string \(line (\d+)\)\s*\]/i.exec(renderError)
            const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null
            const label = lineNum !== null ? `syntax error on line ${lineNum}` : 'syntax error'
            return (
              <div className="mx-2 my-1.5 shrink-0 rounded border border-red-500/30 bg-red-950/50 overflow-hidden">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-red-400 shrink-0">
                    <path d="M5 1L9.5 9H0.5L5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M5 4.5v1.5M5 7.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-[11px] font-mono text-red-300 flex-1">{label}</span>
                  <button
                    onClick={() => setErrorExpanded(e => !e)}
                    className="text-[10px] text-red-400/60 hover:text-red-300 transition-colors shrink-0 px-1"
                    title={errorExpanded ? 'Hide details' : 'Show details'}
                  >
                    {errorExpanded ? '▲' : '▼'}
                  </button>
                </div>
                {errorExpanded && (
                  <pre className="px-2.5 pb-2 pt-0 text-[11px] font-mono text-red-300/80 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all border-t border-red-500/20">
                    {renderError}
                  </pre>
                )}
              </div>
            )
          })()}
          {(() => {
            const lineMatch = renderError ? /\[From string \(line (\d+)\)\s*\]/i.exec(renderError) : null
            const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null
            return awareness && (
              <CollabEditor
                ytext={ytextRef.current}
                awareness={awareness}
                undoManager={undoManagerRef.current}
                theme="dark"
                errorLine={errorLine}
              />
            )
          })()}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDividerMouseDown}
          className="relative z-20 flex items-center justify-center shrink-0 cursor-col-resize group"
          style={{ width: 8, background: 'transparent' }}
        >
          <div className="w-px h-full bg-gray-200 group-hover:bg-green-400 transition-colors" />
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <SvgPreview
            svgContent={svgContent}
            remoteUsers={remoteUsers}
            onCursorMove={handlePreviewCursorMove}
            onCursorLeave={handlePreviewCursorLeave}
          />
        </div>
      </div>
    </div>
  )
}
