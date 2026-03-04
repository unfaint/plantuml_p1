import { createContext, useContext, useState } from 'react'

interface WorkspaceContextValue {
  selectedWorkspaceId: string | null
  setSelectedWorkspaceId: (id: string | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  selectedWorkspaceId: null,
  setSelectedWorkspaceId: () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  return (
    <WorkspaceContext.Provider value={{ selectedWorkspaceId, setSelectedWorkspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
