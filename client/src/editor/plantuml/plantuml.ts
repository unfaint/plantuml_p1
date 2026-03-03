import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { autocompletion } from '@codemirror/autocomplete'
import { parser } from './plantuml.grammar'
import { plantUMLHighlight } from './highlight'
import { plantumlCompletions } from './autocomplete'

export const plantumlLanguage = LRLanguage.define({
  name: 'plantuml',
  parser: parser.configure({
    props: [plantUMLHighlight],
  }),
  languageData: {
    commentTokens: { line: "'" },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    indentOnInput: /^\s*(end|else)\b/,
  },
})

export function plantuml(): LanguageSupport {
  return new LanguageSupport(plantumlLanguage, [
    autocompletion({ override: [plantumlCompletions] }),
  ])
}
