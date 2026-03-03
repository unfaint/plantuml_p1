import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import { runMigrations } from './db/migrate.js'
import { redis } from './redis.js'
import { appRouter } from './trpc/router.js'
import { createContext } from './trpc/context.js'
import { PORT } from './env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = Fastify({ logger: true })

await runMigrations()
await redis.connect()

await app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
  },
})

const publicDir = path.join(__dirname, '../../public')
await app.register(fastifyStatic, {
  root: publicDir,
  wildcard: false,
})

app.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html')
})

await app.listen({ port: PORT, host: '0.0.0.0' })
