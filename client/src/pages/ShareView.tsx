import { useState, useEffect, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { trpc } from '../trpc.ts'

export default function ShareView() {
  const { id } = useParams<{ id: string }>()

  const { data: diagram, isLoading, error } = trpc.diagrams.get.useQuery(
    { id: id! },
    { enabled: !!id, retry: false }
  )

  const renderMutation = trpc.render.svg.useMutation()
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    if (!diagram) return
    const latestSource = diagram.versions[0]?.source ?? ''
    if (latestSource) {
      renderMutation.mutate({ source: latestSource }, {
        onSuccess: ({ svg }) => setSvg(svg),
      })
    }
  }, [diagram])

  if (isLoading) return <div style={styles.center}>Loading…</div>
  if (error) return <div style={styles.center}>{error.message}</div>
  if (!diagram) return <div style={styles.center}>Diagram not found.</div>

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.brand}>🌱 DiagramCollab</span>
          <span style={styles.sep}>/</span>
          <span style={styles.title}>{diagram.title}</span>
          <span style={styles.badge}>Public</span>
        </div>
        <span style={styles.hint}>Read-only · {diagram.versions.length} version{diagram.versions.length !== 1 ? 's' : ''}</span>
      </header>

      <main style={styles.main}>
        {renderMutation.isPending && <div style={styles.loading}>Rendering…</div>}
        {svg
          ? <div style={styles.svgWrap} dangerouslySetInnerHTML={{ __html: svg }} />
          : !renderMutation.isPending && (
              <div style={styles.loading}>No diagram content yet.</div>
            )
        }
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page:      { minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' },
  center:    { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  headerLeft:{ display: 'flex', alignItems: 'center', gap: 8 },
  brand:     { fontWeight: 700, fontSize: 16, color: '#166534' },
  sep:       { color: '#9ca3af' },
  title:     { fontWeight: 600, fontSize: 15 },
  badge:     { background: '#dcfce7', color: '#166534', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600 },
  hint:      { fontSize: 12, color: '#9ca3af' },
  main:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, background: '#f9fafb' },
  loading:   { color: '#9ca3af', marginTop: 48 },
  svgWrap:   { maxWidth: '100%', overflow: 'auto' },
}
