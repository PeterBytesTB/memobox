import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const basePath = path.join(__dirname, 'uploads')

// Garante que as pastas existem
const folders = ['image', 'video', 'audio', 'perfis']
folders.forEach((folder) => {
  const dir = path.join(basePath, folder)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Função que retorna configuração de acordo com o tipo
const storage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(basePath, folder))
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
      cb(null, filename)
    },
  })

export const uploadImage = multer({ storage: storage('image') })
export const uploadVideo = multer({ storage: storage('video') })
export const uploadAudio = multer({ storage: storage('audio') })
export const uploadPerfil = multer({ storage: storage('perfis') })
