import { createHash } from 'crypto'
import { redis } from './redis.js'
import { PLANTUML_URL } from './env.js'

const CACHE_TTL = 60 * 60 * 24 // 24 hours

export type RenderResult = { svg: string; error: string | null }

function extractPlantUmlError(svg: string): string | null {
  if (!svg.includes('Syntax Error')) return null
  // PlantUML renders error details as <text> elements inside the error SVG
  const texts: string[] = []
  const re = /<text\b[^>]*>([^<]+)<\/text>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg)) !== null) {
    // Decode XML character references (&#160; → NBSP → trims away; &#123; → '{' etc.)
    const t = m[1]
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n)))
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .trim()
    if (t) texts.push(t)
  }
  return texts.length > 0 ? texts.join('\n') : 'Syntax Error in diagram'
}

export async function renderSvg(source: string): Promise<RenderResult> {
  const hash = createHash('sha256').update(source).digest('hex')
  const cacheKey = `svg:${hash}`

  const cached = await redis.get(cacheKey)
  // Only non-error SVGs are cached, so cached values always have error: null
  if (cached) return { svg: cached, error: null }

  // PicoWeb only supports GET with source encoded in the path: /plantuml/svg/~h<hex>
  const encoded = '~h' + Buffer.from(source, 'utf8').toString('hex')
  const response = await fetch(`${PLANTUML_URL}/plantuml/svg/${encoded}`)

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok && !contentType.includes('svg')) {
    throw new Error(`PicoWeb error: ${response.status} ${response.statusText}`)
  }

  const svg = await response.text()
  const error = extractPlantUmlError(svg)
  // Only cache successful renders — errors are cheap to re-render and shouldn't persist
  if (!error) await redis.set(cacheKey, svg, 'EX', CACHE_TTL)
  return { svg, error }
}
