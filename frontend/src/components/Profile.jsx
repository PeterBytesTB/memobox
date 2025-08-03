import { useEffect, useState } from 'react'

export default function Profile() {
  const token = localStorage.getItem('token')
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
    if (token) loadProfile()
  }, [token])

  function handleLogout() {
    localStorage.removeItem('token')
    window.location.reload()
  }

  function handleImageUpload(file) {
    const formData = new FormData()
    formData.append('profile_image', file)

    fetch(`${import.meta.env.VITE_API_URL}/profile/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.imageUrl) {
          setUser((prev) => ({ ...prev, profile_image: data.imageUrl }))
          setMessage('Foto de perfil atualizada!')
        } else {
          setMessage('Erro ao atualizar foto')
        }
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

  return (
    <div className="max-w-md mx-auto p-4 text-center bg-neutral-900 rounded-xl shadow-lg mt-8 text-white">
      <img
        src={user.profile_image || '/default-avatar.png'}
        alt="Foto de perfil"
        className="w-24 h-24 mx-auto rounded-full object-cover"
      />

      {/* Upload simples */}
      <div className="mt-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files.length === 0) return
            const file = e.target.files[0]
            handleImageUpload(file)
          }}
        />
      </div>

      {editMode ? (
        <>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Nome"
            className="w-full p-2 rounded mt-4 text-black"
          />
          <input
            type="text"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            placeholder="Username"
            className="w-full p-2 rounded mt-2 text-black"
          />
          <input
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 rounded mt-2 text-black"
          />

          <button
            onClick={handleUpdate}
            disabled={loading}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={() => setEditMode(false)}
            disabled={loading}
            className="mt-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded"
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <p className="mt-4">Nome: {user.name}</p>
          <p>Username: {user.username}</p>
          <p>Email: {user.email}</p>

          <button
            onClick={() => setEditMode(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            Editar perfil
          </button>
        </>
      )}

      {message && <p className="mt-4">{message}</p>}

      <button
        onClick={handleLogout}
        className="mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
      >
        Sair
      </button>
    </div>
  )
}
