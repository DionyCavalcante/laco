const express = require('express')
const router = express.Router()
const db = require('../db')
const { getEffectiveClinicId, normalizeSlug } = require('../lib/tenant')

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT ps.* FROM portal_settings ps
      WHERE ps.clinic_id = $1
    `, [clinicId])

    if (!rows.length) {
      // Retorna defaults se ainda não foi configurado
      return res.json({ reveal_delay: 5, show_price: true, greeting_msg: 'Olá! Escolha o procedimento que te interessa:' })
    }
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configurações' })
  }
})

// POST /api/settings — upsert
router.post('/', async (req, res) => {
  try {
    const { reveal_delay, show_price, greeting_msg } = req.body
    const clinicId = await getEffectiveClinicId(req)

    await db.query(`
      INSERT INTO portal_settings (clinic_id, reveal_delay, show_price, greeting_msg, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (clinic_id) DO UPDATE SET
        reveal_delay = EXCLUDED.reveal_delay,
        show_price   = EXCLUDED.show_price,
        greeting_msg = EXCLUDED.greeting_msg,
        updated_at   = NOW()
    `, [clinicId, reveal_delay ?? 5, show_price ?? true, greeting_msg || 'Ola! Escolha o procedimento que te interessa:'])

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar configurações' })
  }
})

// GET /api/settings/clinic
router.get('/clinic', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query('SELECT name, slug, phone, address, status, onboarding_step, onboarding_completed_at FROM clinics WHERE id = $1', [clinicId])
    if (!rows.length) return res.status(404).json({ error: 'Clínica não encontrada' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados da clínica' })
  }
})

// PATCH /api/settings/clinic
router.patch('/clinic', async (req, res) => {
  try {
    const { name, slug, address } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

    const clinicId = await getEffectiveClinicId(req)
    const { rows: [current] } = await db.query('SELECT slug FROM clinics WHERE id = $1', [clinicId])
    if (!current) return res.status(404).json({ error: 'Clinica nao encontrada' })
    const currentSlug = current.slug
    const newSlug = slug && slug.trim() ? normalizeSlug(slug) : currentSlug

    // Verifica conflito de slug (outro registro com o mesmo slug)
    if (newSlug !== currentSlug) {
      const { rows: conflict } = await db.query(
        'SELECT id FROM clinics WHERE slug = $1 AND id != $2',
        [newSlug, clinicId]
      )
      if (conflict.length) return res.status(409).json({ error: 'Este nome já está em uso. Escolha outro.' })
    }

    const { rowCount } = await db.query(
      'UPDATE clinics SET name = $1, slug = $2, phone = COALESCE($3, phone), address = $4 WHERE id = $5',
      [name.trim(), newSlug, req.body.phone || null, address?.trim() || null, clinicId]
    )
    if (!rowCount) return res.status(404).json({ error: 'Clínica não encontrada' })

    res.json({ ok: true, slug: newSlug })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar dados da clínica' })
  }
})

module.exports = router
