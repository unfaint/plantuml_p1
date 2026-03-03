import { useEffect } from 'react'
import { trpc } from '../trpc.ts'

interface SvgPreviewProps {
  source: string
}

export default function SvgPreview({ source }: SvgPreviewProps) {
  const renderMutation = trpc.render.svg.useMutation()

  useEffect(() => {
    if (!source.trim()) return
    const t = setTimeout(() => {
      renderMutation.mutate({ source })
    }, 400)
    return () => clearTimeout(t)
  }, [source])

  if (!source.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
        Start typing PlantUML to see the preview
      </div>
    )
  }

  if (renderMutation.isPending) {
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

  return (
    <div
      className="flex-1 overflow-auto p-4 bg-gray-50 flex items-start justify-center"
      dangerouslySetInnerHTML={{ __html: renderMutation.data?.svg ?? '' }}
    />
  )
}
