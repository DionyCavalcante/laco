const express = require('express')
const router = express.Router()
const db = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

// GET /api/procedures
router.get('/', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT * FROM procedures
      WHERE clinic_id = $1
      ORDER BY sort_order, name
    `, [clinicId])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar procedimentos' })
  }
})

// POST /api/procedures
router.post('/', async (req, res) => {
  try {
    const { name, duration, price, price_old, payment_note, description, video_url } = req.body
    const clinicId = await getEffectiveClinicId(req)
    if (!name || !duration || !price) {
      return res.status(400).json({ error: 'Nome, duração e preço obrigatórios' })
    }
    const { rows } = await db.query(`
      INSERT INTO procedures (clinic_id, name, duration, price, price_old, payment_note, description, video_url, sort_order)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, COALESCE(MAX(sort_order), -1) + 1
      FROM procedures
      WHERE clinic_id = $1
      RETURNING *
    `, [clinicId, name, duration, price, price_old || null, payment_note || null, description || null, video_url || null])
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar procedimento' })
  }
})

// PATCH /api/procedures/order
router.patch('/order', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { ids } = req.body

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids deve ser um array com procedimentos' })
    }

    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length !== ids.length) {
      return res.status(400).json({ error: 'ids contem procedimentos duplicados' })
    }

    const { rows } = await db.query(
      'SELECT id FROM procedures WHERE clinic_id = $1 AND id = ANY($2::uuid[])',
      [clinicId, ids]
    )
    if (rows.length !== ids.length) {
      return res.status(404).json({ error: 'Um ou mais procedimentos nao pertencem a esta clinica' })
    }

    await client.query('BEGIN')
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        'UPDATE procedures SET sort_order = $1 WHERE id = $2 AND clinic_id = $3',
        [i, ids[i], clinicId]
      )
    }
    await client.query('COMMIT')

    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Erro ao reordenar procedimentos:', err)
    res.status(500).json({ error: 'Erro ao reordenar procedimentos' })
  } finally {
    client.release()
  }
})

// PATCH /api/procedures/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, duration, price, price_old, payment_note, description, video_url, active, sort_order, reveal_delay,
            headline, subheadline,
            benefit_1_title, benefit_1_desc, benefit_2_title, benefit_2_desc, benefit_3_title, benefit_3_desc,
            photo_mode,
            category, authority_note, main_pain, emotional_desire, day_to_day_fit, how_it_works,
            faq_session_duration, faq_result_duration, faq_pain_discomfort, faq_maintenance, faq_aftercare,
            closing_note } = req.body
    const clinicId = await getEffectiveClinicId(req)
    const hasDescription = Object.prototype.hasOwnProperty.call(req.body, 'description')
    const { rows } = await db.query(`
      UPDATE procedures SET
        name               = COALESCE($1, name),
        duration           = COALESCE($2, duration),
        price              = COALESCE($3, price),
        price_old          = COALESCE($4, price_old),
        payment_note       = COALESCE($5, payment_note),
        video_url          = COALESCE($6, video_url),
        active             = COALESCE($7, active),
        sort_order         = COALESCE($8, sort_order),
        reveal_delay       = COALESCE($9, reveal_delay),
        headline           = COALESCE($10, headline),
        subheadline        = COALESCE($11, subheadline),
        benefit_1_title    = COALESCE($12, benefit_1_title),
        benefit_1_desc     = COALESCE($13, benefit_1_desc),
        benefit_2_title    = COALESCE($14, benefit_2_title),
        benefit_2_desc     = COALESCE($15, benefit_2_desc),
        benefit_3_title    = COALESCE($16, benefit_3_title),
        benefit_3_desc     = COALESCE($17, benefit_3_desc),
        photo_mode         = COALESCE($18, photo_mode),
        description        = CASE WHEN $19 THEN $20 ELSE description END,
        category           = COALESCE($21, category),
        authority_note     = COALESCE($22, authority_note),
        main_pain          = COALESCE($23, main_pain),
        emotional_desire   = COALESCE($24, emotional_desire),
        day_to_day_fit     = COALESCE($25, day_to_day_fit),
        how_it_works       = COALESCE($26, how_it_works),
        faq_session_duration = COALESCE($27, faq_session_duration),
        faq_result_duration  = COALESCE($28, faq_result_duration),
        faq_pain_discomfort  = COALESCE($29, faq_pain_discomfort),
        faq_maintenance      = COALESCE($30, faq_maintenance),
        faq_aftercare        = COALESCE($31, faq_aftercare),
        closing_note         = COALESCE($32, closing_note)
      WHERE id = $33 AND clinic_id = $34 RETURNING *
    `, [name, duration, price, price_old, payment_note, video_url, active, sort_order, reveal_delay,
        headline || null, subheadline || null,
        benefit_1_title || null, benefit_1_desc || null, benefit_2_title || null, benefit_2_desc || null,
        benefit_3_title || null, benefit_3_desc || null,
        photo_mode || null,
        hasDescription, description || null,
        category || null, authority_note || null, main_pain || null, emotional_desire || null,
        day_to_day_fit || null, how_it_works || null,
        faq_session_duration || null, faq_result_duration || null, faq_pain_discomfort || null,
        faq_maintenance || null, faq_aftercare || null, closing_note || null,
        req.params.id, clinicId])
    if (!rows.length) return res.status(404).json({ error: 'Procedimento não encontrado' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar procedimento' })
  }
})

// DELETE /api/procedures/:id
router.delete('/:id', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)

    // Verifica se há agendamentos vinculados
    const { rows: apts } = await db.query(
      `SELECT COUNT(*) AS total FROM appointments
       WHERE procedure_id = $1 AND clinic_id = $2 AND status != 'cancelled'`,
      [req.params.id, clinicId]
    )
    if (Number(apts[0].total) > 0) {
      return res.status(409).json({
        error: `Este procedimento possui ${apts[0].total} agendamento(s) vinculado(s) e não pode ser excluído. Desative-o pelo toggle.`
      })
    }

    const { rowCount } = await db.query(
      'DELETE FROM procedures WHERE id = $1 AND clinic_id = $2',
      [req.params.id, clinicId]
    )
    if (!rowCount) return res.status(404).json({ error: 'Procedimento não encontrado' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao excluir procedimento' })
  }
})

module.exports = router
