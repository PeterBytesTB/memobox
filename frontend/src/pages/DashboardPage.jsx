import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

function DashboardPage() {
  const { user, logout } = useContext(AuthContext)

  if (!user) return <p>Carregando...</p>

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Bem-vindo, {user.name || user.email}!</h2>
      <p>Email: {user.email}</p>

      <button
        onClick={() => (window.location.href = '/chat')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#00a884',
          color: 'white',
          border: 'none',
          borderRadius: 5,
          marginRight: 10,
          cursor: 'pointer',
        }}
      >
        Ir para Chat
      </button>

      <button
        onClick={logout}
        style={{
          padding: '10px 20px',
          backgroundColor: '#cc4444',
          color: 'white',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  )
}

export default DashboardPage
