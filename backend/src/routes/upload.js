const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const fs = require('fs/promises')
const path = require('path')
const db = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

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
    const clinicId = await getEffectiveClinicId(req)
    const { rows: [procedure] } = await db.query(
      'SELECT id FROM procedures WHERE id = $1 AND clinic_id = $2',
      [procId, clinicId]
    )
    if (!procedure) return res.status(404).json({ error: 'Procedimento nao encontrado' })

    const saved = { before: [], after: [], carousel: [] }
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
    const clinicDir = path.join(uploadDir, String(clinicId), 'procedures', String(procId))
    await fs.mkdir(clinicDir, { recursive: true })

    for (const side of ['before', 'after', 'carousel']) {
      const files = req.files?.[side] || []
      for (const [idx, file] of files.entries()) {
        const buffer = await sharp(file.buffer)
          .resize({ width: 900, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()

        const filename = `${side}-${Date.now()}-${idx}.webp`
        const filePath = path.join(clinicDir, filename)
        await fs.writeFile(filePath, buffer)
        const url = `/uploads/${clinicId}/procedures/${procId}/${filename}`
        saved[side].push(url)

        await db.query(`
          INSERT INTO procedure_photos (procedure_id, side, url)
          VALUES ($1, $2, $3)
        `, [procId, side, url])
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
      SELECT id, procedure_id, side, url, rotation, created_at FROM procedure_photos
      WHERE procedure_id = $1
      ORDER BY side, created_at
    `, [req.params.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fotos' })
  }
})

// POST /api/upload/photo/:photoId/rotate
router.post('/photo/:photoId/rotate', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(
      `SELECT pp.id, pp.rotation FROM procedure_photos pp
       JOIN procedures p ON p.id = pp.procedure_id
       WHERE pp.id = $1 AND p.clinic_id = $2`,
      [req.params.photoId, clinicId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Foto não encontrada' })

    const incoming = Number(req.body?.degrees)
    const delta = [90, 180, 270].includes(incoming) ? incoming : 90
    const newRotation = ((rows[0].rotation || 0) + delta) % 360

    await db.query('UPDATE procedure_photos SET rotation = $1 WHERE id = $2', [newRotation, req.params.photoId])
    res.json({ ok: true, rotation: newRotation })
  } catch (err) {
    console.error('Rotate error:', err)
    res.status(500).json({ error: 'Erro ao rotacionar foto' })
  }
})

// DELETE /api/upload/photo/:photoId
router.delete('/photo/:photoId', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(
      `SELECT pp.id FROM procedure_photos pp
       JOIN procedures p ON p.id = pp.procedure_id
       WHERE pp.id = $1 AND p.clinic_id = $2`,
      [req.params.photoId, clinicId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Foto não encontrada' })

    await db.query('DELETE FROM procedure_photos WHERE id = $1', [req.params.photoId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar foto' })
  }
})

module.exports = router
