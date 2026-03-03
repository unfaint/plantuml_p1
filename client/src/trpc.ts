import type { AppRouter } from '@demo/server/trpc/router'
import { createTRPCReact } from '@trpc/react-query'

export const trpc = createTRPCReact<AppRouter>()
