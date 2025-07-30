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
import http from 'http'
import { Server } from 'socket.io'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(express.json())
app.use(cors())
const PORT = 8080

// Middleware de log
app.use((req, res, next) => {
  console.log(`🟡 ${req.method} ${req.url}`)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  next()
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
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
  console.log('Usuário conectado:', socket.id)

  socket.on('sendMessage', (data) => {
    console.log('Mensagem recebida:', data)
    io.emit('receiveMessage', data)
  })

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id)
  })
})

// Middleware de autenticação JWT
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

// Rota de teste simples
app.post('/teste', (req, res) => {
  res.json({ recebido: req.body })
})

// Upload protegido de arquivos
app.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'Nenhum arquivo enviado' })

  const { filename, mimetype, path: filepath } = req.file
  const usuarioId = req.user.id

  const query = `
    INSERT INTO arquivos (nome, caminho, tipo, usuario_id)
    VALUES (?, ?, ?, ?)
  `

  db.query(query, [filename, filepath, mimetype, usuarioId], (err) => {
    if (err) {
      console.error('Erro ao salvar no banco:', err)
      return res.status(500).json({ error: 'Erro ao salvar no banco' })
    }

    res.json({ message: 'Upload feito com sucesso!', file: req.file })
  })
})

// Upload protegido de foto de perfil
app.post(
  '/upload-foto-perfil',
  authenticateToken,
  uploadPerfil.single('foto'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' })
    }

    const usuarioId = req.user.id
    const caminhoRelativo = `/uploads/perfis/${req.file.filename}`

    // Atualiza o caminho da foto no banco de dados
    const query = 'UPDATE usuarios SET foto_perfil = ? WHERE id = ?'
    db.query(query, [caminhoRelativo, usuarioId], (err) => {
      if (err) {
        console.error('Erro ao salvar caminho da foto:', err)
        return res.status(500).json({ error: 'Erro ao salvar foto de perfil' })
      }
      res.json({
        message: 'Foto de perfil enviada com sucesso',
        foto: caminhoRelativo,
      })
    })
  },
)

// Registro de usuário
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

    // Remove a senha antes de enviar o usuário
    const { senha: _, ...userWithoutPassword } = user

    res.json({
      message: 'Login bem-sucedido!',
      token,
      user: userWithoutPassword,
    })
  })
})

// Listar arquivos do usuário
app.get('/meus-arquivos', authenticateToken, (req, res) => {
  const usuarioId = req.user.id

  const query = `
    SELECT id, nome, caminho, tipo, data_upload 
    FROM arquivos 
    WHERE usuario_id = ? 
    ORDER BY data_upload DESC
  `

  db.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar arquivos:', err)
      return res.status(500).json({ error: 'Erro ao buscar arquivos.' })
    }

    res.status(200).json(results)
  })
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

app.get('/dados-usuario', authenticateToken, (req, res) => {
  const usuarioId = req.user.id
  const query = 'SELECT email, foto_perfil FROM usuarios WHERE id = ? LIMIT 1'

  db.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar dados do usuário:', err)
      return res.status(500).json({ error: 'Erro ao buscar dados' })
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    res.json(results[0])
  })
})

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`)
})
