import type { FastifyRequest } from 'fastify'
import { verifyToken } from '@clerk/backend'
import { db } from '../db/client.js'
import { redis } from '../redis.js'
import { CLERK_SECRET_KEY } from '../env.js'

export interface Context {
  db: typeof db
  redis: typeof redis
  userId: string | null
}

export async function createContext({ req }: { req: FastifyRequest }): Promise<Context> {
  const auth = req.headers.authorization
  let userId: string | null = null
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = await verifyToken(auth.slice(7), { secretKey: CLERK_SECRET_KEY })
      userId = payload.sub
    } catch { /* invalid/expired token */ }
  }
  return { db, redis, userId }
}
