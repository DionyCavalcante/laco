const express = require('express')
const router = express.Router()
const db = require('../db')

const SLUG = () => process.env.CLINIC_SLUG || 'bella-estetica'

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ps.* FROM portal_settings ps
      JOIN clinics c ON ps.clinic_id = c.id
      WHERE c.slug = $1
    `, [SLUG()])

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

    await db.query(`
      INSERT INTO portal_settings (clinic_id, reveal_delay, show_price, greeting_msg, updated_at)
      VALUES ((SELECT id FROM clinics WHERE slug = $1), $2, $3, $4, NOW())
      ON CONFLICT (clinic_id) DO UPDATE SET
        reveal_delay = EXCLUDED.reveal_delay,
        show_price   = EXCLUDED.show_price,
        greeting_msg = EXCLUDED.greeting_msg,
        updated_at   = NOW()
    `, [SLUG(), reveal_delay ?? 5, show_price ?? true, greeting_msg || 'Olá! Escolha o procedimento que te interessa:'])

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar configurações' })
  }
})

module.exports = router
