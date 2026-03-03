export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/phase1'
export const REDIS_URL    = process.env.REDIS_URL    ?? 'redis://localhost:6379'
export const PLANTUML_URL = process.env.PLANTUML_URL ?? 'http://localhost:8080'
export const PORT         = parseInt(process.env.PORT ?? '3000', 10)
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? ''
