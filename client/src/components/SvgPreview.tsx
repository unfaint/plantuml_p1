import { useEffect, useRef, useState, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

interface PreviewCursor { x: number; y: number }

interface RemoteUser {
  name: string
  color: string
  previewCursor: PreviewCursor | null
}

interface SvgPreviewProps {
  svgContent: string
  remoteUsers?: RemoteUser[]
  onCursorMove?: (x: number, y: number) => void
  onCursorLeave?: () => void
}

function CursorMarker({ user, cursor }: { user: RemoteUser; cursor: PreviewCursor }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${cursor.x * 100}%`,
        top: `${cursor.y * 100}%`,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4,
      }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M1 1 L1 13 L4 10 L6 16 L8 15 L6 9 L10 9 Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          background: user.color,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          padding: '2px 6px',
          borderRadius: 9999,
          whiteSpace: 'nowrap',
          lineHeight: '16px',
          marginTop: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      >
        {user.name}
      </div>
    </div>
  )
}

const MIN_SCALE = 0.1
const MAX_SCALE = 10
const INIT = { x: 16, y: 16, scale: 1 }

export default function SvgPreview({ svgContent, remoteUsers, onCursorMove, onCursorLeave }: SvgPreviewProps) {
  const [transform, setTransform] = useState(INIT)
  const transformRef = useRef(transform)
  useEffect(() => { transformRef.current = transform }, [transform])

  const containerRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const throttleRef = useRef(0)

  // Wheel zoom — must be non-passive so we can preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setTransform(prev => {
        const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
        const r = s / prev.scale
        return { x: mx - (mx - prev.x) * r, y: my - (my - prev.y) * r, scale: s }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    panStart.current = {
      x: e.clientX, y: e.clientY,
      tx: transformRef.current.x, ty: transformRef.current.y,
    }
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      setTransform(prev => ({
        ...prev,
        x: panStart.current.tx + ev.clientX - panStart.current.x,
        y: panStart.current.ty + ev.clientY - panStart.current.y,
      }))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const onDoubleClick = useCallback(() => setTransform(INIT), [])

  // Throttled cursor broadcast — normalize against the SVG element's screen bounds
  const onMouseMove = useCallback((e: ReactMouseEvent) => {
    if (!onCursorMove) return
    const now = Date.now()
    if (now - throttleRef.current < 50) return  // ~20 fps
    throttleRef.current = now
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    onCursorMove(x, y)
  }, [onCursorMove])

  const onMouseLeave = useCallback(() => {
    onCursorLeave?.()
  }, [onCursorLeave])

  if (!svgContent) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
        Start typing PlantUML to see the preview
      </div>
    )
  }

  const activeCursors = remoteUsers?.filter(u => u.previewCursor !== null) ?? []

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gray-50 relative overflow-hidden"
      style={{ cursor: 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onDoubleClick={onDoubleClick}
    >
      {/* Transformed layer — cursor markers live here so they zoom/pan with the SVG */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {/* inline-block so it sizes to the SVG; markers use percentage coords against it */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
          {activeCursors.map((u, i) => (
            <CursorMarker key={i} user={u} cursor={u.previewCursor!} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none select-none">
        Scroll to zoom · Drag to pan · Double-click to reset
      </div>
    </div>
  )
}
