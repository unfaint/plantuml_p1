import { useCodeMirror } from '../editor/useCodeMirror.ts'

interface CodeEditorProps {
  source: string
  onChange: (value: string) => void
}

export default function CodeEditor({ source, onChange }: CodeEditorProps) {
  const containerRef = useCodeMirror({ value: source, onChange, theme: 'dark' })

  return (
    <div
      ref={containerRef}
      className="h-full"
      style={{ fontSize: 13 }}
    />
  )
}
