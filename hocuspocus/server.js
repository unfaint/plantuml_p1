import { Server } from '@hocuspocus/server'
import { verifyToken } from '@clerk/backend'
import postgres from 'postgres'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
if (!CLERK_SECRET_KEY) { console.error('CLERK_SECRET_KEY is required'); process.exit(1) }

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/phase1')
const saveTimers = new Map()

const server = new Server({
  port: parseInt(process.env.PORT ?? '1234'),

  async onAuthenticate({ token }) {
    if (!token) throw new Error('No token provided')
    try {
      await verifyToken(token, { secretKey: CLERK_SECRET_KEY })
    } catch {
      throw new Error('Authentication failed')
    }
  },

  async onLoadDocument({ documentName, document }) {
    const id = documentName.replace(/^diagram-/, '')
    const [row] = await sql`
      SELECT source FROM diagram_versions
      WHERE diagram_id = ${id}
      ORDER BY version DESC
      LIMIT 1
    `
    const ytext = document.getText('plantuml-source')
    if (ytext.length === 0 && row) {
      ytext.insert(0, row.source || '')
    }
  },

  async onChange({ documentName, document }) {
    if (saveTimers.has(documentName)) clearTimeout(saveTimers.get(documentName))
    saveTimers.set(documentName, setTimeout(async () => {
      saveTimers.delete(documentName)
      const id = documentName.replace(/^diagram-/, '')
      const source = document.getText('plantuml-source').toString()
      await sql`
        UPDATE diagram_versions
        SET source = ${source}
        WHERE id = (
          SELECT id FROM diagram_versions
          WHERE diagram_id = ${id}
          ORDER BY version DESC
          LIMIT 1
        )
      `
    }, 2000))
  },
})

server.listen().then(() => console.log(`Hocuspocus listening on ws://0.0.0.0:${process.env.PORT ?? 1234}`))
