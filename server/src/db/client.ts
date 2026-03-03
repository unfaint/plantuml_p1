import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.js'
import { DATABASE_URL } from '../env.js'

const sql = postgres(DATABASE_URL)
export const db = drizzle(sql, { schema })
export type DB = typeof db
