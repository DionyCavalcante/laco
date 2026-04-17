const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')
const db = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados — uploads vão falhar!')
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
const BUCKET = 'clinica'

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
    if (!process.env.SUPABASE_URL) {
      return res.status(500).json({ error: 'Supabase não configurado. Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.' })
    }

    const procId = req.params.id
    const clinicId = await getEffectiveClinicId(req)
    const { rows: [procedure] } = await db.query(
      'SELECT id FROM procedures WHERE id = $1 AND clinic_id = $2',
      [procId, clinicId]
    )
    if (!procedure) return res.status(404).json({ error: 'Procedimento não encontrado' })

    const saved = { before: [], after: [], carousel: [] }

    for (const side of ['before', 'after', 'carousel']) {
      const files = req.files?.[side] || []
      for (const [idx, file] of files.entries()) {
        const buffer = await sharp(file.buffer)
          .resize({ width: 900, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()

        const filename = `${clinicId}/procedures/${procId}/${side}-${Date.now()}-${idx}.webp`
        const { error: storageErr } = await supabase.storage
          .from(BUCKET)
          .upload(filename, buffer, { contentType: 'image/webp', upsert: false })

        if (storageErr) {
          console.error('Supabase Storage error:', storageErr)
          throw new Error(`Storage: ${storageErr.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(filename)

        saved[side].push(publicUrl)

        await db.query(
          'INSERT INTO procedure_photos (procedure_id, side, url, storage_path) VALUES ($1, $2, $3, $4)',
          [procId, side, publicUrl, filename]
        )
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
      SELECT id, procedure_id, side, url, rotation, sort_order, position_x, position_y, created_at FROM procedure_photos
      WHERE procedure_id = $1
      ORDER BY side, sort_order, created_at
    `, [req.params.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fotos' })
  }
})

// PATCH /api/upload/procedure/:id/photos/order — reordena fotos de um side
router.patch('/procedure/:id/photos/order', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows: [procedure] } = await db.query(
      'SELECT id FROM procedures WHERE id = $1 AND clinic_id = $2',
      [req.params.id, clinicId]
    )
    if (!procedure) return res.status(404).json({ error: 'Procedimento não encontrado' })

    const { ids } = req.body // array de UUIDs na nova ordem
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids deve ser um array' })

    for (let i = 0; i < ids.length; i++) {
      await db.query(
        'UPDATE procedure_photos SET sort_order = $1 WHERE id = $2 AND procedure_id = $3',
        [i, ids[i], req.params.id]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reordenar fotos' })
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

    const rotation = [0, 90, 180, 270].includes(Number(req.body?.rotation))
      ? Number(req.body.rotation)
      : (((rows[0].rotation || 0) + 90) % 360)

    await db.query('UPDATE procedure_photos SET rotation = $1 WHERE id = $2', [rotation, req.params.photoId])
    res.json({ ok: true, rotation })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rotacionar foto' })
  }
})

// PATCH /api/upload/photo/:photoId — muda side e/ou enquadramento
router.patch('/photo/:photoId', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { side, position_x, position_y } = req.body
    const { rows } = await db.query(
      `SELECT pp.id FROM procedure_photos pp
       JOIN procedures p ON p.id = pp.procedure_id
       WHERE pp.id = $1 AND p.clinic_id = $2`,
      [req.params.photoId, clinicId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Foto não encontrada' })

    if (side !== undefined) {
      if (!['before', 'after', 'carousel'].includes(side)) {
        return res.status(400).json({ error: 'Side inválido' })
      }
      await db.query('UPDATE procedure_photos SET side = $1 WHERE id = $2', [side, req.params.photoId])
    }
    if (position_x !== undefined || position_y !== undefined) {
      await db.query(
        'UPDATE procedure_photos SET position_x = COALESCE($1, position_x), position_y = COALESCE($2, position_y) WHERE id = $3',
        [position_x ?? null, position_y ?? null, req.params.photoId]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /photo error:', err.message)
    res.status(500).json({ error: err.message || 'Erro ao atualizar foto' })
  }
})

// DELETE /api/upload/photo/:photoId
router.delete('/photo/:photoId', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(
      `SELECT pp.id, pp.storage_path FROM procedure_photos pp
       JOIN procedures p ON p.id = pp.procedure_id
       WHERE pp.id = $1 AND p.clinic_id = $2`,
      [req.params.photoId, clinicId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Foto não encontrada' })

    if (rows[0].storage_path) {
      await supabase.storage.from(BUCKET).remove([rows[0].storage_path])
    }

    await db.query('DELETE FROM procedure_photos WHERE id = $1', [req.params.photoId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar foto' })
  }
})

// POST /api/upload/migrate — migra fotos locais antigas para Supabase Storage
// Fotos sem storage_path: tenta re-fazer fetch da URL local e subir pro Supabase.
// Fotos inacessíveis (arquivo perdido) são removidas do banco.
router.post('/migrate', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)

    const { rows: photos } = await db.query(`
      SELECT pp.id, pp.url, pp.procedure_id, pp.side
      FROM procedure_photos pp
      JOIN procedures p ON p.id = pp.procedure_id
      WHERE p.clinic_id = $1 AND (pp.storage_path IS NULL OR pp.storage_path = '')
      ORDER BY pp.created_at
    `, [clinicId])

    const results = { migrated: 0, removed: 0, failed: 0 }

    for (const photo of photos) {
      try {
        // Monta a URL completa para tentar buscar o arquivo local
        const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`
        const fileUrl = photo.url.startsWith('http') ? photo.url : `${baseUrl}${photo.url}`

        const fetchRes = await fetch(fileUrl)
        if (!fetchRes.ok) {
          // Arquivo não existe mais — remove o registro órfão
          await db.query('DELETE FROM procedure_photos WHERE id = $1', [photo.id])
          results.removed++
          continue
        }

        const buffer = Buffer.from(await fetchRes.arrayBuffer())
        const processed = await sharp(buffer)
          .resize({ width: 900, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()

        const filename = `${clinicId}/procedures/${photo.procedure_id}/${photo.side}-migrated-${Date.now()}.webp`
        const { error: storageErr } = await supabase.storage
          .from(BUCKET)
          .upload(filename, processed, { contentType: 'image/webp', upsert: true })

        if (storageErr) throw storageErr

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)

        await db.query(
          'UPDATE procedure_photos SET url = $1, storage_path = $2 WHERE id = $3',
          [publicUrl, filename, photo.id]
        )
        results.migrated++
      } catch (e) {
        console.error(`Falha ao migrar foto ${photo.id}:`, e.message)
        results.failed++
      }
    }

    res.json({ ok: true, total: photos.length, ...results })
  } catch (err) {
    console.error('Migrate error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
