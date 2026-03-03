import { useState } from 'react'
import { useAuth, useUser, useClerk, SignIn } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { trpc } from './trpc.ts'
import ShareView from './pages/ShareView.tsx'
import Header from './components/Header.tsx'
import Sidebar from './components/Sidebar.tsx'
import EditorPane from './components/EditorPane.tsx'
import CommentsPane from './components/CommentsPane.tsx'

// ─── Root: ShareView gets its own public tRPC client; everything else is auth-gated ───

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:id" element={<ShareViewShell />} />
        <Route path="/*" element={<AuthGate />} />
      </Routes>
    </BrowserRouter>
  )
}

// ShareView: public procedures only; no auth needed
function ShareViewShell() {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: '/trpc' })] })
  )
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ShareView />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <SignIn />
      </div>
    )
  }

  return <AuthenticatedShell />
}

// ─── Authenticated shell ──────────────────────────────────────────────────────

function AuthenticatedShell() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()

  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({
        url: '/trpc',
        headers: async () => {
          const token = await getToken()
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      })],
    })
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commentsCollapsed, setCommentsCollapsed] = useState(false)

  const userName = user!.fullName ?? user!.firstName ?? user!.primaryEmailAddress?.emailAddress ?? 'User'

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-white">
          <Header
            userName={userName}
            userId={user!.id}
            userImageUrl={user!.imageUrl}
            onSignOut={() => void signOut()}
          />
          <div className="flex flex-1 min-h-0">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(c => !c)}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              {selectedId
                ? <EditorPane key={selectedId} id={selectedId} onDelete={() => setSelectedId(null)} />
                : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    Select a diagram from the sidebar, or sprout a new one.
                  </div>
                )
              }
            </div>
            <CommentsPane
              collapsed={commentsCollapsed}
              onToggle={() => setCommentsCollapsed(c => !c)}
            />
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
