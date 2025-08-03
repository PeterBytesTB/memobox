import { useEffect, useState } from 'react'
import socket from '../socket'
import ReactPlayer from 'react-player'
import MessageInput from '../components/MessageInput'

export default function ChatPage() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    // Ouve as mensagens recebidas do servidor
    socket.on('receiveMessage', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    // Limpa o listener quando o componente desmonta
    return () => {
      socket.off('receiveMessage')
    }
  }, [])

  // Função para enviar mensagem (texto + arquivo)
  const handleSendMessage = (messageData) => {
    // messageData: { text, file, media_url, media_type, ... }

    // Monta o objeto a ser enviado pelo socket
    const socketData = {
      id: Date.now(), // id simples (pode melhorar)
      text: messageData.text || '',
      sender: 'Você', // ou user.id etc
      timestamp: new Date().toISOString(),
      media_url: messageData.media_url || null,
      media_type: messageData.media_type || 'none',
    }

    // Emite para o servidor (vai distribuir pra todo mundo)
    socket.emit('sendMessage', socketData)

    // Atualiza localmente para mostrar a mensagem imediata
    setMessages((prev) => [...prev, socketData])
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Chat Memobox</h2>
      <div
        style={{
          height: 400,
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: 10,
          marginBottom: 10,
        }}
      >
        {messages.length === 0 && <p>Nenhuma mensagem ainda</p>}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 8 }}>
            <strong>{msg.sender}: </strong>

            {/* Mostrar texto só se existir */}
            {msg.text && <span>{msg.text}</span>}

            {msg.media_url && (
              <div style={{ marginTop: 4 }}>
                {msg.media_type === 'image' && (
                  <img
                    src={msg.media_url}
                    alt="mídia enviada"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 200,
                      borderRadius: 4,
                    }}
                  />
                )}

                {(msg.media_type === 'audio' || msg.media_type === 'video') && (
                  <ReactPlayer
                    url={msg.media_url}
                    controls
                    width="100%"
                    height={msg.media_type === 'video' ? 200 : 50}
                    playing={false}
                  />
                )}
              </div>
            )}

            <div style={{ fontSize: 10, color: '#999' }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  )
}
