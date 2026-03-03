import { useState, useEffect } from 'react'

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]!
}

interface HeaderProps {
  userName: string
  userId: string
  userImageUrl?: string
  onSignOut: () => void
}

export default function Header({ userName, userId, userImageUrl, onSignOut }: HeaderProps) {
  const color = colorFromId(userId)
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

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

        {/* Online/offline badge */}
        <div className={`flex items-center gap-1.5 text-sm ${online ? 'text-gray-500' : 'text-red-500'}`}>
          <span className={`w-2 h-2 rounded-full inline-block ${online ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{online ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
    </header>
  )
}
