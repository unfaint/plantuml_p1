import { useState, useEffect } from 'react'
import { useAuth, useUser, useClerk, SignIn } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { trpc } from './trpc.ts'
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext.tsx'
import ShareView from './pages/ShareView.tsx'
import JoinWorkspace from './pages/JoinWorkspace.tsx'
import Header from './components/Header.tsx'
import Sidebar from './components/Sidebar.tsx'
import EditorPane from './components/EditorPane.tsx'
import CommentsPane from './components/CommentsPane.tsx'
import WorkspaceSettingsModal from './components/WorkspaceSettingsModal.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:id" element={<ShareViewShell />} />
        <Route path="/join/:token" element={<AuthGate><JoinWorkspaceShell /></AuthGate>} />
        <Route path="/*" element={<AuthGate><AuthenticatedShell /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  )
}

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

// Auth-gates its children — shows spinner/SignIn if not authenticated
function AuthGate({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>
}

// JoinWorkspace needs its own tRPC provider (with auth headers)
function JoinWorkspaceShell() {
  const { getToken } = useAuth()
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
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <JoinWorkspace />
      </QueryClientProvider>
    </trpc.Provider>
  )
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

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>
          <AuthenticatedApp user={user!} onSignOut={() => void signOut()} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

interface AuthenticatedAppProps {
  user: NonNullable<ReturnType<typeof useUser>['user']>
  onSignOut: () => void
}

function AuthenticatedApp({ user, onSignOut }: AuthenticatedAppProps) {
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspace()
  const [searchParams] = useSearchParams()

  // Pick up ?workspace=<id> from join redirects
  useEffect(() => {
    const wsId = searchParams.get('workspace')
    if (wsId) setSelectedWorkspaceId(wsId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commentsCollapsed, setCommentsCollapsed] = useState(true)
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'disconnected' | null>(null)
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false)

  // Workspace list needed here to compute effectiveRole for EditorPane
  const { data: workspaceList = [] } = trpc.workspaces.list.useQuery()

  const effectiveRole = (() => {
    if (!selectedWorkspaceId) return 'personal-owner' as const
    const ws = workspaceList.find(w => w.id === selectedWorkspaceId)
    return (ws?.role ?? 'member') as 'owner' | 'admin' | 'member'
  })()

  function handleWorkspaceChange(id: string | null) {
    setSelectedWorkspaceId(id)
    setSelectedId(null)
    setConnStatus(null)
  }

  const userName = user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? 'User'

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white">
      <Header
        userName={userName}
        userId={user.id}
        userImageUrl={user.imageUrl}
        onSignOut={onSignOut}
        connStatus={connStatus}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onWorkspaceChange={handleWorkspaceChange}
          onOpenWorkspaceSettings={() => setWorkspaceSettingsOpen(true)}
        />
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {selectedId
            ? (
              <EditorPane
                key={selectedId}
                id={selectedId}
                onDelete={() => { setSelectedId(null); setConnStatus(null) }}
                onConnStatusChange={setConnStatus}
                effectiveRole={effectiveRole}
              />
            )
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

      {workspaceSettingsOpen && selectedWorkspaceId && (
        <WorkspaceSettingsModal
          workspaceId={selectedWorkspaceId}
          onClose={() => setWorkspaceSettingsOpen(false)}
          onDeleted={() => { handleWorkspaceChange(null); setWorkspaceSettingsOpen(false) }}
          onLeft={() => { handleWorkspaceChange(null); setWorkspaceSettingsOpen(false) }}
        />
      )}
    </div>
  )
}
