import { completeFromList } from '@codemirror/autocomplete'

const KEYWORDS = [
  // Diagram delimiters
  '@startuml', '@enduml',
  '@startmindmap', '@endmindmap',
  '@startwbs', '@endwbs',
  '@startgantt', '@endgantt',

  // Participant types
  'participant', 'actor', 'boundary', 'control',
  'entity', 'database', 'collections', 'queue',

  // Class keywords
  'class', 'interface', 'abstract', 'enum',
  'extends', 'implements',

  // Sequence control
  'as', 'group', 'loop', 'alt', 'else', 'opt', 'par', 'break', 'end',
  'activate', 'deactivate', 'destroy',
  'autonumber',

  // Notes
  'note', 'hnote', 'rnote', 'endnote',
  'note left', 'note right', 'note over',

  // Styling
  'skinparam', 'title', 'header', 'footer',
  'hide', 'show',

  // Preprocessor
  '!include', '!define', '!undef', '!if', '!endif',
  '!function', '!return',

  // Arrows (as snippet triggers)
  '->', '-->', '->>', '-->>',
  '<-', '<--',
]

export const plantumlCompletions = completeFromList(
  KEYWORDS.map(label => ({ label, type: label.startsWith('@') || label.startsWith('!') ? 'keyword' : 'keyword' }))
)
