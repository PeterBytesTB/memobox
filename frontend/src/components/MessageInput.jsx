import { useState } from 'react'

export default function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    setFile(selectedFile)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text && !file) return

    if (file) {
      setUploading(true)
      // Enviar arquivo para backend via fetch + FormData
      const formData = new FormData()
      formData.append('media', file)
      formData.append('sender_id', '1') // ajuste conforme seu usuário logado
      formData.append('receiver_id', '2') // ajuste para o destinatário real
      formData.append('content', text)

      try {
        const res = await fetch('http://localhost:8080/messages', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.success) {
          // Passa para o pai a mensagem com URL e tipo da mídia
          onSendMessage({
            text,
            media_url: `/uploads/midias/${file.name}`, // ideal pegar da resposta do backend (ajuste)
            media_type: file.type.split('/')[0],
          })
          setText('')
          setFile(null)
        } else {
          alert('Falha ao enviar a mensagem')
        }
      } catch {
        alert('Erro ao conectar com o servidor')
      }
      setUploading(false)
    } else {
      // Mensagem só com texto
      onSendMessage({ text })
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Digite sua mensagem"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={uploading}
        style={{ flex: 1 }}
      />
      <input
        type="file"
        accept="image/*,audio/*,video/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  )
}
