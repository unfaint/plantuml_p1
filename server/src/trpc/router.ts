import { router } from './init.js'
import { diagramsRouter } from './diagrams.js'
import { renderRouter } from './render.js'

export const appRouter = router({
  diagrams: diagramsRouter,
  render:   renderRouter,
})

export type AppRouter = typeof appRouter
