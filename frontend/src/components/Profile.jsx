import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { token, setToken } = useAuth()
  const [user, setUser] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [formName, setFormName] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar perfil')
        setUser(data)
        setFormName(data.name)
        setFormUsername(data.username)
        setFormEmail(data.email)
      } catch (error) {
        setMessage(error.message)
      }
    }
    loadProfile()
  }, [token])

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  function handleImageUpload(blob) {
    const formData = new FormData()
    formData.append('profile_image', blob, 'profile.jpg')

    fetch(`${import.meta.env.VITE_API_URL}/profile/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setUser((prev) => ({ ...prev, profile_image: data.imageUrl }))
      })
      .catch(() => alert('Erro ao enviar imagem'))
  }

  async function handleUpdate() {
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          username: formUsername,
          email: formEmail,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          name: formName,
          username: formUsername,
          email: formEmail,
        }))
        setEditMode(false)
        setMessage('Perfil atualizado!')
      } else {
        setMessage(data.error || 'Erro ao atualizar perfil.')
      }
    } catch {
      setMessage('Erro ao atualizar perfil.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <p>Carregando perfil...</p>

  // ... seu código atual (import, estados, useEffect, funções)

  return (
    <div className="max-w-md mx-auto p-4 text-center bg-neutral-900 rounded-xl shadow-lg mt-8 text-white">
      <img
        src={user.profile_image || '/default-avatar.png'}
        alt="Foto de perfil"
        className="w-24 h-24 mx-auto rounded-full object-cover"
      />

      {/* Input para upload simples, sem crop (exemplo básico) */}
      <div className="mt-4">
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            if (e.target.files.length === 0) return
            const file = e.target.files[0]
            handleImageUpload(file)
          }}
        />
      </div>

      {editMode ? (
        <>
          {/* seus inputs de nome, username e email */}
          {/* ... */}
        </>
      ) : (
        <>{/* seus dados e botões */}</>
      )}

      {message && <p className="mt-4">{message}</p>}

      <button
        onClick={handleLogout}
        className="mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl"
      >
        Sair
      </button>
    </div>
  )
}
