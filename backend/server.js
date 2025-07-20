import express from 'express'
import multer from 'multer'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 5001

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../frontend')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Cria a pasta uploads se não existir
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
})
const upload = multer({ storage })

// Rota de upload
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'Upload feito com sucesso!', file: req.file })
})

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta: ${PORT}`)
})
