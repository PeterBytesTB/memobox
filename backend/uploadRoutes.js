import express from 'express'
import {
  uploadImage,
  uploadAudio,
  uploadVideo,
  uploadPerfil,
} from './uploadConfig.js'

const router = express.Router()

router.post('/upload/image', uploadImage.single('file'), (req, res) => {
  res.json({ path: `/uploads/image/${req.file.filename}` })
})

router.post('/upload/video', uploadVideo.single('file'), (req, res) => {
  res.json({ path: `/uploads/video/${req.file.filename}` })
})

router.post('/uploads/audio', uploadAudio.single('file'), (req, res) => {
  res.json({ path: `/uploads/audio/${req.file.filename}` })
})

router.post('/uploads/perfil', uploadPerfil.single('file'), (req, res) => {
  res.json({ path: `/uploads/perfis/${req.file.filename}` })
})

export default router
