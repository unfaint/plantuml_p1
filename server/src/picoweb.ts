import { createHash } from 'crypto'
import { redis } from './redis.js'
import { PLANTUML_URL } from './env.js'

const CACHE_TTL = 60 * 60 * 24 // 24 hours

export async function renderSvg(source: string): Promise<string> {
  const hash = createHash('sha256').update(source).digest('hex')
  const cacheKey = `svg:${hash}`

  const cached = await redis.get(cacheKey)
  if (cached) return cached

  // PicoWeb only supports GET with source encoded in the path: /plantuml/svg/~h<hex>
  const encoded = '~h' + Buffer.from(source, 'utf8').toString('hex')
  const response = await fetch(`${PLANTUML_URL}/plantuml/svg/${encoded}`)

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok && !contentType.includes('svg')) {
    throw new Error(`PicoWeb error: ${response.status} ${response.statusText}`)
  }

  const svg = await response.text()
  await redis.set(cacheKey, svg, 'EX', CACHE_TTL)
  return svg
}
