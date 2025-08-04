import { useEffect, useState, useRef } from 'react'
import socket from '../socket'
import MessageInput from '../components/MessageInput'
import ReactPlayer from 'react-player'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    socket.on('receiveMessage', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      socket.off('receiveMessage')
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (messageData) => {
    const socketData = {
      id: Date.now(),
      text: messageData.text || '',
      sender: 'Você',
      timestamp: new Date().toISOString(),
      media_url: messageData.media_url || null,
      media_type: messageData.media_type || 'none',
    }

    socket.emit('sendMessage', socketData)
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
          background: '#f9f9f9',
        }}
      >
        {messages.length === 0 && <p>Nenhuma mensagem ainda</p>}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 12,
              textAlign: msg.sender === 'Você' ? 'right' : 'left',
              backgroundColor: msg.sender === 'Você' ? '#dcf8c6' : '#ffffff',
              padding: 8,
              borderRadius: 6,
              maxWidth: '80%',
              marginLeft: msg.sender === 'Você' ? 'auto' : 0,
              marginRight: msg.sender === 'Você' ? 0 : 'auto',
            }}
          >
            <div>
              <strong>{msg.sender}: </strong>
              {msg.text && <span>{msg.text}</span>}
            </div>

            {msg.media_url && (
              <div style={{ marginTop: 6 }}>
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
                    style={{ borderRadius: 4, marginTop: 4 }}
                  />
                )}
              </div>
            )}

            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  )
}
