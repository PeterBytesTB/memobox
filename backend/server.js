import express from 'express'
import multer from 'multer'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'
import mysql from 'mysql2'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

app.use(express.json())
app.use(cors())
const PORT = 3000

// Middleware de log para debug
app.use((req, res, next) => {
  console.log(`🟡 ${req.method} ${req.url}`)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  next()
})

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Conexão com MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD?.replace(/"/g, ''),
  database: process.env.DB_NAME,
})

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar no MySQL:', err)
    process.exit(1)
  } else {
    console.log('✅ Conectado ao MySQL')
  }
})

// Garante que a pasta 'uploads' exista
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
})
const upload = multer({ storage })

// Verificação de token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Token não fornecido' })

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' })
    req.user = user
    next()
  })
}

// Teste de rota
app.post('/teste', (req, res) => {
  res.json({ recebido: req.body })
})

// Upload (protegido)
app.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  res.json({ message: 'Upload feito com sucesso!', file: req.file })
})

// Cadastro
app.post('/register', async (req, res) => {
  const { email, senha } = req.body
  if (!email || !senha)
    return res.status(400).json({ error: 'Dados obrigatórios' })

  try {
    const hashedPassword = await bcrypt.hash(senha, 10)
    const query = 'INSERT INTO usuarios (email, senha) VALUES (?, ?)'
    db.query(query, [email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Email já cadastrado' })
        }
        return res.status(500).json({ error: 'Erro no servidor' })
      }
      res.json({ message: 'Usuário cadastrado com sucesso!' })
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Login
app.post('/login', (req, res) => {
  const { email, senha } = req.body
  if (!email || !senha)
    return res.status(400).json({ error: 'Dados obrigatórios' })

  const query = 'SELECT * FROM usuarios WHERE email = ?'
  db.query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    const user = results[0]
    const isMatch = await bcrypt.compare(senha, user.senha)
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' },
    )

    res.json({ message: 'Login bem-sucedido!', token })
  })
})

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`)
})
