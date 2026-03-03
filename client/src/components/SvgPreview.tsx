import { useEffect, useRef, useState, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { trpc } from '../trpc.ts'

interface SvgPreviewProps {
  source: string
}

const MIN_SCALE = 0.1
const MAX_SCALE = 10
const INIT = { x: 16, y: 16, scale: 1 }

export default function SvgPreview({ source }: SvgPreviewProps) {
  const renderMutation = trpc.render.svg.useMutation()

  useEffect(() => {
    if (!source.trim()) return
    const t = setTimeout(() => { renderMutation.mutate({ source }) }, 400)
    return () => clearTimeout(t)
  }, [source])

  // Zoom/pan state — all positioning goes through the CSS transform
  const [transform, setTransform] = useState(INIT)
  const transformRef = useRef(transform)
  useEffect(() => { transformRef.current = transform }, [transform])

  const containerRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

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

  if (!source.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
        Start typing PlantUML to see the preview
      </div>
    )
  }

  if (renderMutation.isPending && !renderMutation.data) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
        Rendering…
      </div>
    )
  }

  if (renderMutation.isError) {
    return (
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <pre className="text-red-500 text-xs whitespace-pre-wrap">{renderMutation.error.message}</pre>
      </div>
    )
  }

  // Strip explicit pixel width/height so the SVG sizes from its viewBox naturally
  const svg = (renderMutation.data?.svg ?? '')
    .replace(/(<svg[^>]*)\s+width="[^"]*"/, '$1')
    .replace(/(<svg[^>]*)\s+height="[^"]*"/, '$1')

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gray-50 relative overflow-hidden"
      style={{ cursor: 'grab' }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none select-none">
        Scroll to zoom · Drag to pan · Double-click to reset
      </div>
    </div>
  )
}
