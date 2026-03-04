import * as Y from 'yjs'
import type { CollabAwareness } from './useCollabCodeMirror.ts'
import { useCollabCodeMirror } from './useCollabCodeMirror.ts'

interface CollabEditorProps {
  ytext: Y.Text
  awareness: CollabAwareness
  undoManager: Y.UndoManager
  theme: 'light' | 'dark'
}

export function CollabEditor({ ytext, awareness, undoManager, theme }: CollabEditorProps) {
  const containerRef = useCollabCodeMirror({ ytext, awareness, undoManager, theme })

  return (
    <div
      ref={containerRef}
      className="h-full"
      style={{ fontSize: 13 }}
    />
  )
}
