import { createContext, useState, useEffect } from 'react'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('http://localhost:8080/dados-usuario', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Não autorizado')
          return res.json()
        })
        .then((data) => {
          setUser(data)
        })
        .catch(() => {
          setUser(null)
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, senha) => {
    try {
      const res = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      if (!res.ok) {
        // Lê mensagem de erro do backend (se tiver)
        const errorData = await res.json()
        return {
          success: false,
          message: errorData.message || 'Falha no login',
        }
      }

      const data = await res.json()

      if (data.token) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return { success: true }
      }

      return { success: false, message: 'Resposta inesperada do servidor' }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, message: 'Erro ao conectar com o servidor' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
