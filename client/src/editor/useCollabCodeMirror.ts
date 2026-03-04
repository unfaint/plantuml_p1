import { useEffect, useRef } from 'react'
import { EditorView, Decoration, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import { buildCoreExtensions } from './extensions.ts'
import { lightEditorTheme, darkEditorTheme } from './themes.ts'

export type CollabAwareness = Parameters<typeof yCollab>[1]

// ── Error-line highlight (module-level so instances are stable) ───────────────

const setErrorLine = StateEffect.define<number | null>()

const errorLineField = StateField.define<number | null>({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) if (e.is(setErrorLine)) return e.value
    return val
  },
})

const errorLinePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = this.build(view.state) }
    update(u: ViewUpdate) {
      if (u.docChanged || u.state.field(errorLineField) !== u.startState.field(errorLineField))
        this.decorations = this.build(u.state)
    }
    build(state: EditorState): DecorationSet {
      const line = state.field(errorLineField)
      if (!line || line > state.doc.lines) return Decoration.none
      const from = state.doc.line(line).from
      return Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(from)])
    }
  },
  { decorations: v => v.decorations },
)

const errorLineTheme = EditorView.baseTheme({
  '.cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderLeft: '2px solid rgba(239, 68, 68, 0.6)',
  },
})

// ─────────────────────────────────────────────────────────────────────────────

interface UseCollabCodeMirrorOptions {
  ytext: Y.Text
  awareness: CollabAwareness
  undoManager: Y.UndoManager
  theme: 'light' | 'dark'
  errorLine?: number | null
}

export function useCollabCodeMirror({ ytext, awareness, undoManager, theme, errorLine }: UseCollabCodeMirrorOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartment = useRef(new Compartment())

  // Create the editor once on mount.
  // doc: seeds content — yCollab's YSyncPluginValue only observes FUTURE changes and does
  // not read current ytext on init, so without this the editor would be blank if Hocuspocus
  // synced before the view was created.
  useEffect(() => {
    if (!containerRef.current || viewRef.current) return

    const themeExt: Extension = theme === 'dark' ? darkEditorTheme : lightEditorTheme

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        buildCoreExtensions(),
        themeCompartment.current.of(themeExt),
        EditorView.lineWrapping,
        yCollab(ytext, awareness, { undoManager }),
        errorLineField,
        errorLinePlugin,
        errorLineTheme,
      ],
    })

    viewRef.current = new EditorView({ state, parent: containerRef.current })

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
    viewRef.current.dispatch({ effects: themeCompartment.current.reconfigure(themeExt) })
  }, [theme])

  // Highlight error line
  useEffect(() => {
    if (!viewRef.current) return
    viewRef.current.dispatch({ effects: setErrorLine.of(errorLine ?? null) })
  }, [errorLine])

  return containerRef
}
