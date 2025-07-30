import { useState, useEffect } from 'react'
import socket from './socket'

function Chat() {
  const [message, setMessage] = useState('')
  const [chat, setChat] = useState([])

  useEffect(() => {
    socket.on('receiveMessage', (data) => {
      setChat((prev) => [...prev, data])
    })

    return () => socket.off('receiveMessage')
  }, [])

  const sendMessage = () => {
    if (message.trim()) {
      const msgData = {
        sender: 'Pedro', // futuramente: nome real do login
        text: message,
        time: new Date().toLocaleTimeString(),
      }
      socket.emit('sendMessage', msgData)
      setMessage('')
    }
  }

  return (
    <div>
      <h2>Chat Memobox</h2>
      <div
        style={{ border: '1px solid #ccc', height: 300, overflowY: 'scroll' }}
      >
        {chat.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.sender}</strong>: {msg.text} <em>({msg.time})</em>
          </p>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Enviar</button>
    </div>
  )
}

export default Chat
