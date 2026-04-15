const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const db = require('../db')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Formato inválido. Use JPG, PNG ou WebP.'))
  }
})

// POST /api/upload/procedure/:id/photos
router.post('/procedure/:id/photos', upload.fields([
  { name: 'before',   maxCount: 5 },
  { name: 'after',    maxCount: 5 },
  { name: 'carousel', maxCount: 10 },
]), async (req, res) => {
  try {
    const procId = req.params.id
    const saved = { before: [], after: [], carousel: [] }

    for (const side of ['before', 'after', 'carousel']) {
      const files = req.files?.[side] || []
      for (const file of files) {
        const buffer = await sharp(file.buffer)
          .resize({ width: 900, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()

        const dataUri = `data:image/webp;base64,${buffer.toString('base64')}`
        saved[side].push(dataUri)

        await db.query(`
          INSERT INTO procedure_photos (procedure_id, side, url)
          VALUES ($1, $2, $3)
        `, [procId, side, dataUri])
      }
    }

    res.json({ ok: true, saved })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message || 'Erro no upload' })
  }
})

// GET /api/upload/procedure/:id/photos
router.get('/procedure/:id/photos', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, procedure_id, side, url, created_at FROM procedure_photos
      WHERE procedure_id = $1
      ORDER BY side, created_at
    `, [req.params.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fotos' })
  }
})

// DELETE /api/upload/photo/:photoId
router.delete('/photo/:photoId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM procedure_photos WHERE id = $1', [req.params.photoId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Foto não encontrada' })

    await db.query('DELETE FROM procedure_photos WHERE id = $1', [req.params.photoId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar foto' })
  }
})

module.exports = router
