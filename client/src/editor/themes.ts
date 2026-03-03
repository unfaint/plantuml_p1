import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { lightHighlightExtension, darkHighlightExtension } from './plantuml/highlight.ts'

const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#1f2937', height: '100%' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-content': { caretColor: '#1f2937' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#1f2937' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#bfdbfe',
    },
    '.cm-activeLine': { backgroundColor: '#f3f4f6' },
    '.cm-gutters': {
      backgroundColor: '#f9fafb',
      color: '#6b7280',
      border: 'none',
      borderRight: '1px solid #e5e7eb',
    },
    '.cm-activeLineGutter': { backgroundColor: '#e5e7eb' },
    '.cm-foldGutter span': { color: '#9ca3af' },
    '.cm-matchingBracket': { backgroundColor: '#bbf7d0', outline: 'none' },
    '.cm-searchMatch': { backgroundColor: '#fef08a' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#fdba74' },
    '.cm-selectionMatch': { backgroundColor: '#e0f2fe' },
  },
  { dark: false }
)

const darkTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#1e1e2e', color: '#cdd6f4', height: '100%' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-content': { caretColor: '#cdd6f4' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#cdd6f4' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#313244',
    },
    '.cm-activeLine': { backgroundColor: '#313244' },
    '.cm-gutters': {
      backgroundColor: '#181825',
      color: '#6c7086',
      border: 'none',
      borderRight: '1px solid #313244',
    },
    '.cm-activeLineGutter': { backgroundColor: '#313244' },
    '.cm-foldGutter span': { color: '#6c7086' },
    '.cm-matchingBracket': { backgroundColor: '#45475a', outline: 'none' },
    '.cm-searchMatch': { backgroundColor: '#f9e2af44' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#f9e2af88' },
    '.cm-selectionMatch': { backgroundColor: '#45475a' },
  },
  { dark: true }
)

export const lightEditorTheme: Extension = [lightTheme, lightHighlightExtension]
export const darkEditorTheme:  Extension = [darkTheme,  darkHighlightExtension]
