import { useEffect, useState } from 'react'
import socket from '../socket' // import da conexão

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

  // Função para enviar mensagem
  const handleSendMessage = (messageText) => {
    const messageData = {
      id: Date.now(), // id simples (pode melhorar)
      text: messageText,
      sender: 'Você', // ou user.id etc
      timestamp: new Date().toISOString(),
    }

    // Emite para o servidor (vai distribuir pra todo mundo)
    socket.emit('sendMessage', messageData)

    // Atualiza localmente para mostrar a mensagem imediata
    setMessages((prev) => [...prev, messageData])
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
            <span>{msg.text}</span>
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
