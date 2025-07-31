// src/components/ChatLayout.jsx
import React from 'react'
import MessageInput from './MessageInput'
import { useAuth } from '../context/AuthContext'

export default function ChatLayout({ messages }) {
  const { user } = useAuth()

  return (
    <div className="chat-container">
      <aside className="contacts-list">
        <h2>Conversas</h2>
        <div className="contact">Amigo 1</div>
        <div className="contact">Amigo 2</div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">Chat com {user?.name || '...'}</header>

        <section className="messages-area">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${
                msg.sender === user?.name ? 'self' : 'other'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </section>

        <MessageInput />
      </main>
    </div>
  )
}
