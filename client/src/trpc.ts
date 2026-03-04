import type { AppRouter } from '@demo/server/trpc/router'
import { createTRPCReact } from '@trpc/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'

export const trpc = createTRPCReact<AppRouter>()

// Vanilla client for use outside React hooks (e.g. ytext observer closures)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })],
})
