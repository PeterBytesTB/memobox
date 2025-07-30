import { useEffect, useState } from 'react'
import socket from '../socket'

function ChatWindow({ username }) {
  const [message, setMessage] = useState('')
  const [chat, setChat] = useState([])

  useEffect(() => {
    socket.on('receiveMessage', (data) => {
      setChat((prev) => [...prev, data])
    })
    return () => socket.off('receiveMessage')
  }, [])

  const sendMessage = () => {
    if (!message.trim()) return
    const msgData = {
      sender: username,
      text: message,
      time: new Date().toLocaleTimeString(),
    }
    socket.emit('sendMessage', msgData)
    setChat((prev) => [...prev, msgData])
    setMessage('')
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {chat.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.sender === username ? 'me' : ''}`}
          >
            <strong>{msg.sender}</strong>: {msg.text}
            <br />
            <small>{msg.time}</small>
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Digite sua mensagem..."
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  )
}

export default ChatWindow
