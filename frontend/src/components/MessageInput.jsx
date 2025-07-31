import { useState, useRef, useEffect } from 'react'
import { FiSend, FiMic } from 'react-icons/fi'
import '../Chat.css'

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="message-input">
      <textarea
        ref={textareaRef}
        placeholder="Digite uma mensagem"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="message-textarea"
      />
      <button
        onClick={handleSend}
        disabled={message.trim() === ''}
        className="message-send-button"
        aria-label="Enviar mensagem"
      >
        {message.trim() === '' ? <FiMic size={20} /> : <FiSend size={20} />}
      </button>
    </div>
  )
}
