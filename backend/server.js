import express from 'express'
import multer from 'multer'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import http from 'http'
import { Server } from 'socket.io'
import uploadRoutes from './uploadRoutes.js'
import authRoutes from './auth/auth.routes.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173']

const app = express()
app.use(express.json())
app.use(uploadRoutes)
app.use('/api', authRoutes)

// Configura CORS no Express
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error('CORS não permitido'), false)
      }
      return callback(null, true)
    },
    methods: ['GET', 'POST'],
  }),
)

// Cria pool de conexões para MySQL com mysql2/promise
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD?.replace(/"/g, ''),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

const PORT = process.env.PORT || 8080

// Middleware de log
app.use((req, res, next) => {
  console.log(`🟡 ${req.method} ${req.url}`)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  next()
})

const server = http.createServer(app)

// Configura Socket.IO com CORS liberado para os mesmos origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id)
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id)
  })
})

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Pasta para salvar fotos de perfil
const perfilDir = path.join(__dirname, 'uploads', 'perfis')
if (!fs.existsSync(perfilDir)) {
  fs.mkdirSync(perfilDir, { recursive: true })
}

// Multer padrão para arquivos gerais
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const nomeOriginal = path.basename(file.originalname)
    const nomeSanitizado = nomeOriginal.replace(/[^a-zA-Z0-9.\-_]/g, '')
    const nomeUnico = Date.now() + '-' + nomeSanitizado
    cb(null, nomeUnico)
  },
})
const upload = multer({ storage })

// Multer para upload de foto de perfil, com filtro para imagens JPEG/PNG
const storagePerfil = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, perfilDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `perfil_${req.user.id}${ext}`)
  },
})
const uploadPerfil = multer({
  storage: storagePerfil,
  fileFilter: (req, file, cb) => {
    const tiposAceitos = /jpeg|jpg|png/
    const ext = path.extname(file.originalname).toLowerCase()
    const mime = file.mimetype
    if (tiposAceitos.test(ext) && tiposAceitos.test(mime)) {
      cb(null, true)
    } else {
      cb(new Error('Somente imagens JPEG ou PNG são permitidas'))
    }
  },
})

io.on('connection', (socket) => {
  console.log('🟢 Novo cliente conectado:', socket.id)

  socket.on('mensagem', (data) => {
    console.log('📨 Mensagem recebida:', data)
    // Reenvia para todos os outros clientes
    socket.broadcast.emit('mensagem', data)
  })

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id)
  })
})

// Middleware de autenticação JWT
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token não fornecido' })

  try {
    // Verifica se o token está registrado e ativo na tabela sessions
    const [rows] = await pool.query('SELECT * FROM sessions WHERE token = ?', [
      token,
    ])
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Sessão inválida ou expirada' })
    }

    // Verifica validade do JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token inválido' })
      req.user = user
      next()
    })
  } catch (err) {
    console.error('Erro na autenticação:', err)
    res.status(500).json({ error: 'Erro interno no servidor' })
  }
}

// Upload protegido dos arquivos
app.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const { filename, mimetype, path: filepath } = req.file
    const usuarioId = req.user.id

    const query = `
    INSERT INTO arquivos (nome, caminho, tipo, usuario_id)
    VALUES (?, ?, ?, ?)
  `

    try {
      await pool.query(query, [filename, filepath, mimetype, usuarioId])
      res.json({ message: 'Upload feito com sucesso!', file: req.file })
    } catch (err) {
      console.error('Erro ao salvar no banco:', err)
      res.status(500).json({ error: 'Erro ao salvar no banco' })
    }
  },
)

// Upload protegido de foto de perfil
app.post(
  '/upload-foto-perfil',
  authenticateToken,
  uploadPerfil.single('foto'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' })
    }

    const usuarioId = req.user.id
    const caminhoRelativo = `/uploads/perfis/${req.file.filename}`

    const query = 'UPDATE users SET foto_perfil = ? WHERE id = ?'

    try {
      await pool.query(query, [caminhoRelativo, usuarioId])
      res.json({
        message: 'Foto de perfil enviada com sucesso',
        foto: caminhoRelativo,
      })
    } catch (err) {
      console.error('Erro ao salvar caminho da foto:', err)
      res.status(500).json({ error: 'Erro ao salvar foto de perfil' })
    }
  },
)

// Registro de usuário
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  // Verifica se todos os campos obrigatórios foram preenchidos
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' })
  }

  try {
    // Gera o hash da senha com bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    const query = `
      INSERT INTO users (email, username, password_hash)
      VALUES (?, ?, ?)
    `

    // Executa o INSERT no banco de dados
    await pool.query(query, [email, username, hashedPassword])

    return res.status(201).json({ message: 'Usuário cadastrado com sucesso!' })
  } catch (err) {
    console.error('Erro ao inserir no banco de dados:', err)

    // Trata erro de duplicidade (email ou username já existem)
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ error: 'Email ou nome de usuário já está em uso.' })
    }

    // Erro genérico
    return res.status(500).json({ error: 'Erro interno no servidor.' })
  }
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Preencha todos os campos.' })

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [
      email,
    ])
    if (users.length === 0)
      return res.status(401).json({ error: 'Credenciais inválidas.' })

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword)
      return res.status(401).json({ error: 'Credenciais inválidas.' })

    // Gera token JWT (ex: expira em 7 dias)
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    // Salva na tabela sessions
    await pool.query('INSERT INTO sessions (user_id, token) VALUES (?, ?)', [
      user.id,
      token,
    ])

    res.json({ message: 'Login realizado com sucesso!', token })
  } catch (err) {
    console.error('Erro no login:', err)
    res.status(500).json({ error: 'Erro interno no servidor.' })
  }
})

app.post('/logout', authenticateToken, async (req, res) => {
  const token = req.headers['authorization'].split(' ')[1]
  try {
    await pool.query('DELETE FROM sessions WHERE token = ?', [token])
    res.json({ message: 'Logout realizado com sucesso.' })
  } catch (error) {
    console.error('Erro no logout:', error)
    res.status(500).json({ error: 'Erro interno no servidor.' })
  }
})

// Listar arquivos do usuário
app.get('/meus-arquivos', authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.id
    const query = `
      SELECT id, nome, caminho, tipo, data_upload 
      FROM arquivos 
      WHERE usuario_id = ? 
      ORDER BY data_upload DESC
    `
    const [results] = await pool.query(query, [usuarioId])
    res.json(results)
  } catch (err) {
    console.error('Erro ao buscar arquivos:', err)
    res.status(500).json({ error: 'Erro ao buscar arquivos.' })
  }
})

// Excluir arquivo pelo ID
app.delete('/arquivo/:id', authenticateToken, (req, res) => {
  const usuarioId = req.user.id
  const arquivoId = req.params.id

  // Verifica se o arquivo pertence ao usuário
  const selectQuery =
    'SELECT caminho FROM arquivos WHERE id = ? AND usuario_id = ?'
  db.query(selectQuery, [arquivoId, usuarioId], (err, results) => {
    if (err) {
      console.error('Erro ao consultar arquivo:', err)
      return res.status(500).json({ error: 'Erro interno' })
    }
    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: 'Arquivo não encontrado ou não autorizado' })
    }

    const caminhoArquivo = results[0].caminho

    // Remove arquivo do disco
    fs.unlink(caminhoArquivo, (fsErr) => {
      if (fsErr) {
        console.error('Erro ao deletar arquivo do disco:', fsErr)
        // Continuar para não deixar dados inconsistentes
      }

      // Remove registro do banco
      const deleteQuery = 'DELETE FROM arquivos WHERE id = ? AND usuario_id = ?'
      db.query(deleteQuery, [arquivoId, usuarioId], (delErr) => {
        if (delErr) {
          console.error('Erro ao deletar arquivo do banco:', delErr)
          return res.status(500).json({ error: 'Erro ao excluir arquivo' })
        }
        res.json({ message: 'Arquivo excluído com sucesso' })
      })
    })
  })
})

app.get('/dados-usuario', authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user?.id
    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuário inválido' })
    }

    console.log('Buscando dados do usuário com id:', usuarioId)

    const [results] = await pool.query(
      'SELECT email, profile_picture_url FROM users WHERE id = ? LIMIT 1',
      [usuarioId],
    )

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    res.json(results[0])
  } catch (err) {
    console.error('Erro ao buscar dados do usuário:', err)
    res.status(500).json({ error: 'Erro ao buscar dados' })
  }
})

// Inicialização do servidor
server.listen(process.env.PORT || 8080, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT || 8080}`)
})
