// backend/auth/auth.controller.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import db from './db.js'

dotenv.config() // Carrega variáveis do .env

const JWT_SECRET = process.env.JWT_SECRET

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
    )

    res.status(201).json({ message: 'Usuário registrado com sucesso!' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'E-mail já cadastrado' })
    } else {
      res.status(500).json({ error: 'Erro ao registrar usuário', details: err })
    }
  }
}

export const loginUser = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Preencha e-mail e senha' })
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [
      email,
    ])
    if (rows.length === 0)
      return res.status(401).json({ error: 'Usuário não encontrado' })

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' })

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '2h',
    })

    res.json({ message: 'Login bem-sucedido', token })
  } catch (err) {
    res.status(500).json({ error: 'Erro no login', details: err })
  }
}
