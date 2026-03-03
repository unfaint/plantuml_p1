import { useEffect, useRef } from 'react'
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { plantuml } from './plantuml/plantuml.ts'
import { lightEditorTheme, darkEditorTheme } from './themes.ts'

interface UseCodeMirrorOptions {
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
}

function buildExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    foldGutter(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    history(),
    autocompletion(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...completionKeymap,
      ...searchKeymap,
      ...lintKeymap,
      indentWithTab,
    ]),
    EditorView.lineWrapping,
    plantuml(),
  ]
}

export function useCodeMirror({ value, onChange, theme }: UseCodeMirrorOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartment = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current || viewRef.current) return

    const themeExt: Extension = theme === 'dark' ? darkEditorTheme : lightEditorTheme

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        buildExtensions(),
        themeCompartment.current.of(themeExt),
        updateListener,
      ],
    })

    viewRef.current = new EditorView({ state, parent: containerRef.current })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value changes (e.g. initial load from DB)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  // Reconfigure theme without re-creating the editor
  useEffect(() => {
    if (!viewRef.current) return
    const themeExt: Extension = theme === 'dark' ? darkEditorTheme : lightEditorTheme
    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(themeExt),
    })
  }, [theme])

  return containerRef
}
