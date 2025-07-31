import { useState, useEffect, useRef } from 'react'
import socket from './socket'
import './Chat.css'

function Chat() {
  const [message, setMessage] = useState('')
  const [chat, setChat] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    socket.on('receiveMessage', (data) => {
      setChat((prev) => [...prev, data])
    })

    return () => socket.off('receiveMessage')
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const sendMessage = () => {
    if (message.trim()) {
      const msgData = {
        sender: 'Pedro', // futuramente: nome real do login
        text: message,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
      socket.emit('sendMessage', msgData)
      setChat((prev) => [...prev, msgData])
      setMessage('')
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">💬 Memobox</div>

      <div className="chat-messages">
        {chat.map((msg, idx) => (
          <div
            key={idx}
            className={`message-bubble ${
              msg.sender === 'Pedro' ? 'sent' : 'received'
            }`}
          >
            <div className="message-text">{msg.text}</div>
            <div className="message-meta">
              <span className="message-sender">{msg.sender}</span>
              <span className="message-time">{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  )
}

export default Chat
