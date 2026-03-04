const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]!
}

const CONN_COLORS = {
  connected:    'text-green-600',
  connecting:   'text-amber-500',
  disconnected: 'text-red-500',
}

const DOT_COLORS = {
  connected:    'bg-green-500',
  connecting:   'bg-amber-400',
  disconnected: 'bg-red-500',
}

interface HeaderProps {
  userName: string
  userId: string
  userImageUrl?: string
  onSignOut: () => void
  connStatus: 'connecting' | 'connected' | 'disconnected' | null
}

export default function Header({ userName, userId, userImageUrl, onSignOut, connStatus }: HeaderProps) {
  const color = colorFromId(userId)

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌱</span>
        <span className="font-bold text-gray-800 text-lg tracking-tight">PlantUML.dev</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* User avatar + name */}
        <div className="flex items-center gap-2">
          {userImageUrl
            ? <img
                src={userImageUrl}
                alt={userName}
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: color }}
              />
            : <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: color }}
              >
                {userName.slice(0, 2).toUpperCase()}
              </div>
          }
          <span className="text-sm font-medium text-gray-700">{userName}</span>
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Sign out
        </button>

        {/* WebSocket connection status — only shown when a diagram is open */}
        {connStatus && (
          <div className={`flex items-center gap-1.5 text-sm ${CONN_COLORS[connStatus]}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${DOT_COLORS[connStatus]}`} />
            <span className="capitalize">{connStatus}</span>
          </div>
        )}
      </div>
    </header>
  )
}
