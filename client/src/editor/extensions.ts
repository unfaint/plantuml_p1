import {
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
} from '@codemirror/view'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  LanguageSupport,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import { plantuml } from './plantuml/plantuml.ts'

export function buildCoreExtensions(): Extension[] {
  const lang: LanguageSupport = plantuml()
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
      ...foldKeymap,
      ...completionKeymap,
      ...searchKeymap,
      ...lintKeymap,
      indentWithTab,
    ]),
    lang,
  ]
}
