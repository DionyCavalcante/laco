const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/procedures
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM procedures
      WHERE clinic_id = (SELECT id FROM clinics WHERE slug = $1)
      ORDER BY sort_order, name
    `, [process.env.CLINIC_SLUG || 'bella-estetica'])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar procedimentos' })
  }
})

// POST /api/procedures
router.post('/', async (req, res) => {
  try {
    const { name, duration, price, price_old, payment_note, video_url } = req.body
    if (!name || !duration || !price) {
      return res.status(400).json({ error: 'Nome, duração e preço obrigatórios' })
    }
    const { rows } = await db.query(`
      INSERT INTO procedures (clinic_id, name, duration, price, price_old, payment_note, video_url)
      VALUES ((SELECT id FROM clinics WHERE slug=$1), $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [process.env.CLINIC_SLUG || 'bella-estetica', name, duration, price, price_old || null, payment_note || null, video_url || null])
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar procedimento' })
  }
})

// PATCH /api/procedures/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, duration, price, price_old, payment_note, video_url, active, sort_order, reveal_delay,
            headline, subheadline,
            benefit_1_title, benefit_1_desc, benefit_2_title, benefit_2_desc, benefit_3_title, benefit_3_desc } = req.body
    const { rows } = await db.query(`
      UPDATE procedures SET
        name           = COALESCE($1, name),
        duration       = COALESCE($2, duration),
        price          = COALESCE($3, price),
        price_old      = COALESCE($4, price_old),
        payment_note   = COALESCE($5, payment_note),
        video_url      = COALESCE($6, video_url),
        active         = COALESCE($7, active),
        sort_order     = COALESCE($8, sort_order),
        reveal_delay   = COALESCE($9, reveal_delay),
        headline       = COALESCE($10, headline),
        subheadline    = COALESCE($11, subheadline),
        benefit_1_title = COALESCE($12, benefit_1_title),
        benefit_1_desc  = COALESCE($13, benefit_1_desc),
        benefit_2_title = COALESCE($14, benefit_2_title),
        benefit_2_desc  = COALESCE($15, benefit_2_desc),
        benefit_3_title = COALESCE($16, benefit_3_title),
        benefit_3_desc  = COALESCE($17, benefit_3_desc)
      WHERE id = $18 RETURNING *
    `, [name, duration, price, price_old, payment_note, video_url, active, sort_order, reveal_delay,
        headline || null, subheadline || null,
        benefit_1_title || null, benefit_1_desc || null, benefit_2_title || null, benefit_2_desc || null,
        benefit_3_title || null, benefit_3_desc || null,
        req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Procedimento não encontrado' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar procedimento' })
  }
})

module.exports = router
