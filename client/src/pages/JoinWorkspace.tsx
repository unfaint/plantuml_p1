import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../trpc.ts'

export default function JoinWorkspace() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const acceptMutation = trpc.workspaces.acceptInvite.useMutation({
    onSuccess: ({ workspace_id }) => {
      navigate(`/?workspace=${workspace_id}`)
    },
    onError: (err) => {
      alert(err.message)
      navigate('/')
    },
  })

  useEffect(() => {
    if (token) acceptMutation.mutate({ token })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
      Joining workspace…
    </div>
  )
}
