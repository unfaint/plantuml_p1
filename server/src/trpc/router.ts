import { router } from './init.js'
import { diagramsRouter } from './diagrams.js'
import { renderRouter } from './render.js'
import { workspacesRouter } from './workspaces.js'

export const appRouter = router({
  diagrams:   diagramsRouter,
  render:     renderRouter,
  workspaces: workspacesRouter,
})

export type AppRouter = typeof appRouter
