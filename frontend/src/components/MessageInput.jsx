import { useState } from 'react'

export default function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)

  // URL base da API backend — ajuste conforme seu ambiente
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

  // Quando seleciona arquivo, guarda ele no estado
  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    setFile(selected || null)
  }

  // Função para enviar a mensagem
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() && !file) return

    let media_url = null
    let media_type = 'none'

    if (file) {
      // Faz upload do arquivo para o backend e pega a URL retornada
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          // Se usar token JWT, insira aqui o header Authorization
          // headers: { 'Authorization': 'Bearer ' + token },
          body: formData,
        })

        const data = await response.json()

        if (response.ok) {
          // Ajuste para a propriedade correta que seu backend retorna:
          // Exemplo: data.file.filename
          media_url = data.file ? `/uploads/midias/${data.file.filename}` : null

          // Define tipo baseado na extensão/mimetype
          if (file.type.startsWith('image/')) media_type = 'image'
          else if (file.type.startsWith('audio/')) media_type = 'audio'
          else if (file.type.startsWith('video/')) media_type = 'video'
          else media_type = 'none'
        } else {
          alert('Falha no upload: ' + (data.error || 'Erro desconhecido'))
          return
        }
      } catch (error) {
        alert('Erro no upload: ' + error.message)
        return
      }
    }

    onSendMessage({
      text,
      media_url,
      media_type,
    })

    setText('')
    setFile(null)
    e.target.reset()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Digite sua mensagem..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1, padding: 8 }}
      />
      <input
        type="file"
        accept="image/*,audio/*,video/*"
        onChange={handleFileChange}
        style={{ display: 'block' }}
      />
      <button type="submit" style={{ padding: '8px 16px' }}>
        Enviar
      </button>
    </form>
  )
}
