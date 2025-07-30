import { useState, useRef, useEffect } from 'react'
import { FiSend, FiMic } from 'react-icons/fi' // ícones do react-icons, ok?

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto ajustar altura do textarea conforme o texto
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto' // reset pra recalcular
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
  }, [message])

  const handleSend = () => {
    const trimmed = message.trim()
    if (trimmed === '') return
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
    <div style={styles.container}>
      <textarea
        ref={textareaRef}
        placeholder="Digite uma mensagem"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        style={styles.textarea}
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={message.trim() === ''}
        style={{
          ...styles.button,
          opacity: message.trim() === '' ? 0.5 : 1,
          cursor: message.trim() === '' ? 'default' : 'pointer',
        }}
        aria-label="Enviar mensagem"
      >
        {message.trim() === '' ? <FiMic size={24} /> : <FiSend size={24} />}
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'flex-end',
    padding: '10px',
    borderTop: '1px solid #ddd',
    gap: 10,
    backgroundColor: '#fff',
  },
  textarea: {
    flexGrow: 1,
    resize: 'none',
    borderRadius: 20,
    border: '1px solid #ccc',
    padding: '10px 15px',
    fontSize: 16,
    maxHeight: 100,
    outline: 'none',
    fontFamily: 'inherit',
  },
  button: {
    backgroundColor: '#00a884',
    border: 'none',
    borderRadius: '50%',
    width: 40,
    height: 40,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
