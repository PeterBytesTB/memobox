import { useEffect, useState } from 'react'

function PerfilPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:8080/api/user', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar perfil')
        return res.json()
      })
      .then((data) => {
        setUser(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <p>Carregando perfil...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Perfil do Usuário</h2>
      <p>
        <strong>Nome:</strong> {user.name || 'Não informado'}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      {/* Se quiser mostrar foto de perfil: */}
      {user.avatarUrl && (
        <img
          src={user.avatarUrl}
          alt="Avatar"
          style={{
            width: 150,
            height: 150,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      )}
      {/* Aqui pode ter botões para editar perfil, trocar senha, etc */}
    </div>
  )
}

export default PerfilPage
