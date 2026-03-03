import { styleTags, tags as t } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'

export const plantUMLHighlight = styleTags({
  // Diagram delimiters
  'StartMarker EndMarker': t.moduleKeyword,

  // Participant-type keywords
  'participant actor boundary control entity database collections queue': t.definitionKeyword,

  // Class diagram keywords
  'class interface abstract enum': t.keyword,
  'extends implements': t.keyword,

  // Alias keyword
  'as': t.definitionKeyword,

  // Control flow
  'group loop alt else opt par break end': t.controlKeyword,

  // Note keywords
  'note hnote rnote endnote': t.keyword,

  // Note position
  'over left right': t.modifier,

  // Other keywords
  'skinparam title header footer': t.keyword,

  // Preprocessor
  'PreprocKeyword': t.processingInstruction,

  // Punctuation / operators
  'Arrow': t.operator,
  'ColonOp': t.punctuation,

  // Literals
  'String': t.string,

  // Comments
  'LineComment BlockComment': t.comment,

  // Identifiers
  'Identifier': t.variableName,
})

// ── Light theme highlight style ─────────────────────────────────────────────
export const lightHighlight = HighlightStyle.define([
  { tag: t.moduleKeyword,        color: '#7c3aed', fontWeight: 'bold' },
  { tag: t.definitionKeyword,    color: '#7c3aed', fontWeight: 'bold' },
  { tag: t.keyword,              color: '#7c3aed' },
  { tag: t.controlKeyword,       color: '#db2777', fontWeight: 'bold' },
  { tag: t.modifier,             color: '#0891b2' },
  { tag: t.processingInstruction,color: '#ca8a04' },
  { tag: t.operator,             color: '#dc2626', fontWeight: 'bold' },
  { tag: t.punctuation,          color: '#374151' },
  { tag: t.string,               color: '#16a34a' },
  { tag: t.comment,              color: '#9ca3af', fontStyle: 'italic' },
  { tag: t.variableName,         color: '#1e40af' },
])

// ── Dark theme highlight style ──────────────────────────────────────────────
export const darkHighlight = HighlightStyle.define([
  { tag: t.moduleKeyword,        color: '#c084fc', fontWeight: 'bold' },
  { tag: t.definitionKeyword,    color: '#c084fc', fontWeight: 'bold' },
  { tag: t.keyword,              color: '#c084fc' },
  { tag: t.controlKeyword,       color: '#f472b6', fontWeight: 'bold' },
  { tag: t.modifier,             color: '#38bdf8' },
  { tag: t.processingInstruction,color: '#fbbf24' },
  { tag: t.operator,             color: '#f87171', fontWeight: 'bold' },
  { tag: t.punctuation,          color: '#d1d5db' },
  { tag: t.string,               color: '#4ade80' },
  { tag: t.comment,              color: '#6b7280', fontStyle: 'italic' },
  { tag: t.variableName,         color: '#93c5fd' },
])

export const lightHighlightExtension = syntaxHighlighting(lightHighlight)
export const darkHighlightExtension  = syntaxHighlighting(darkHighlight)
