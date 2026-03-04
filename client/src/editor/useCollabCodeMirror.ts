import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import { buildCoreExtensions } from './extensions.ts'
import { lightEditorTheme, darkEditorTheme } from './themes.ts'

export type CollabAwareness = Parameters<typeof yCollab>[1]

interface UseCollabCodeMirrorOptions {
  ytext: Y.Text
  awareness: CollabAwareness
  undoManager: Y.UndoManager
  theme: 'light' | 'dark'
}

export function useCollabCodeMirror({ ytext, awareness, undoManager, theme }: UseCollabCodeMirrorOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartment = useRef(new Compartment())

  // Create the editor once on mount — no `doc:` field; yCollab initializes content from ytext
  useEffect(() => {
    if (!containerRef.current || viewRef.current) return

    const themeExt: Extension = theme === 'dark' ? darkEditorTheme : lightEditorTheme

    const state = EditorState.create({
      extensions: [
        buildCoreExtensions(),
        themeCompartment.current.of(themeExt),
        EditorView.lineWrapping,
        yCollab(ytext, awareness, { undoManager }),
      ],
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reconfigure theme via Compartment — no editor re-creation, no flicker
  useEffect(() => {
    if (!viewRef.current) return
    const themeExt: Extension = theme === 'dark' ? darkEditorTheme : lightEditorTheme
    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(themeExt),
    })
  }, [theme])

  return containerRef
}
