import { useState } from 'react'
import { trpc } from '../trpc.ts'

interface WorkspaceSettingsModalProps {
  workspaceId: string
  onClose: () => void
  onDeleted: () => void
  onLeft: () => void
}

export default function WorkspaceSettingsModal({ workspaceId, onClose, onDeleted, onLeft }: WorkspaceSettingsModalProps) {
  const utils = trpc.useUtils()

  const { data: wsInfo } = trpc.workspaces.list.useQuery()
  const ws = wsInfo?.find(w => w.id === workspaceId)
  const myRole = ws?.role ?? 'member'
  const isOwner = myRole === 'owner'
  const canManage = myRole === 'owner' || myRole === 'admin'

  const { data: members = [] } = trpc.workspaces.listMembers.useQuery({ workspace_id: workspaceId })

  const [newName, setNewName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const renameMutation = trpc.workspaces.rename.useMutation({
    onSuccess: () => { void utils.workspaces.list.invalidate(); setNewName('') },
  })
  const deleteMutation = trpc.workspaces.delete.useMutation({ onSuccess: onDeleted })
  const leaveMutation  = trpc.workspaces.leave.useMutation({ onSuccess: onLeft })

  const inviteMutation = trpc.workspaces.invite.useMutation({
    onSuccess: ({ token }) => { setInviteToken(token); setInviteEmail('') },
  })
  const removeMember = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => void utils.workspaces.listMembers.invalidate({ workspace_id: workspaceId }),
  })
  const updateRole = trpc.workspaces.updateRole.useMutation({
    onSuccess: () => void utils.workspaces.listMembers.invalidate({ workspace_id: workspaceId }),
  })

  function handleCopyInvite() {
    if (!inviteToken) return
    const url = `${window.location.origin}/join/${inviteToken}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Workspace Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">

          {/* Rename (owner only) */}
          {isOwner && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rename</h3>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={ws?.name ?? 'Workspace name'}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-300"
                />
                <button
                  onClick={() => { if (newName.trim()) renameMutation.mutate({ workspace_id: workspaceId, name: newName.trim() }) }}
                  disabled={!newName.trim() || renameMutation.isPending}
                  className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </section>
          )}

          {/* Members */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Members</h3>
            <div className="flex flex-col gap-1">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                  <span className="flex-1 text-sm text-gray-700 font-mono truncate" title={m.user_id}>
                    {m.user_id.slice(0, 16)}…
                  </span>
                  {canManage && m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      onChange={e => updateRole.mutate({ workspace_id: workspaceId, target_user_id: m.user_id, role: e.target.value as 'admin' | 'member' })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none"
                    >
                      <option value="member">member</option>
                      {isOwner && <option value="admin">admin</option>}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                  )}
                  {canManage && m.role !== 'owner' && !(myRole === 'admin' && m.role === 'admin') && (
                    <button
                      onClick={() => removeMember.mutate({ workspace_id: workspaceId, target_user_id: m.user_id })}
                      className="text-xs text-red-400 hover:text-red-600 px-1"
                      title="Remove member"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Invite (owner/admin) */}
          {canManage && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invite</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-300"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'member' | 'admin')}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                >
                  <option value="member">member</option>
                  {isOwner && <option value="admin">admin</option>}
                </select>
                <button
                  onClick={() => { if (inviteEmail.trim()) inviteMutation.mutate({ workspace_id: workspaceId, email: inviteEmail.trim(), role: inviteRole }) }}
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  className="text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Invite
                </button>
              </div>

              {inviteToken && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs">
                  <p className="text-gray-500 mb-1.5">Share this link with your invitee:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-green-700 truncate">
                      {window.location.origin}/join/{inviteToken}
                    </code>
                    <button
                      onClick={handleCopyInvite}
                      className="shrink-0 text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Danger zone */}
          <section className="border-t border-gray-100 pt-4">
            {isOwner ? (
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${ws?.name}"? All diagrams will become personal. This cannot be undone.`)) {
                    deleteMutation.mutate({ workspace_id: workspaceId })
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Delete workspace
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm('Leave this workspace?')) {
                    leaveMutation.mutate({ workspace_id: workspaceId })
                  }
                }}
                disabled={leaveMutation.isPending}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Leave workspace
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
