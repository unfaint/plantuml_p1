import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'url'
import path from 'path'
import { DATABASE_URL } from '../env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// __dirname = dist/db/ at runtime → ../../migrations = server/migrations/
const migrationsFolder = path.join(__dirname, '../../migrations')

export async function runMigrations(): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 })
  const db = drizzle(sql)
  await migrate(db, { migrationsFolder })
  await sql.end()
  console.log('Migrations complete')
}
