import * as Y from 'yjs'
import type { CollabAwareness } from './useCollabCodeMirror.ts'
import { useCollabCodeMirror } from './useCollabCodeMirror.ts'

interface CollabEditorProps {
  ytext: Y.Text
  awareness: CollabAwareness
  undoManager: Y.UndoManager
  theme: 'light' | 'dark'
  errorLine?: number | null
}

export function CollabEditor({ ytext, awareness, undoManager, theme, errorLine }: CollabEditorProps) {
  const containerRef = useCollabCodeMirror({ ytext, awareness, undoManager, theme, errorLine })

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-hidden"
      style={{ fontSize: 13 }}
    />
  )
}
