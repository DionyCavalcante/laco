const express = require('express')
const router = express.Router()
const db = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

// GET /api/hours
router.get('/', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT * FROM business_hours
      WHERE clinic_id = $1
      ORDER BY day_of_week
    `, [clinicId])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar horários' })
  }
})

// POST /api/hours — upsert completo dos 7 dias
router.post('/', async (req, res) => {
  const client = await require('../db').pool.connect()
  try {
    const days = req.body // array [{day_of_week, open, start_time, end_time}]
    if (!Array.isArray(days)) return res.status(400).json({ error: 'Payload inválido' })

    const clinicId = await getEffectiveClinicId(req)
    await client.query('BEGIN')
    // Remove os antigos e insere os novos
    await client.query('DELETE FROM business_hours WHERE clinic_id = $1', [clinicId])
    for (const d of days) {
      await client.query(`
        INSERT INTO business_hours (clinic_id, day_of_week, open, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5)
      `, [clinicId, d.day_of_week, d.open, d.start_time || '09:00', d.end_time || '18:00'])
    }
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar horários' })
  } finally {
    client.release()
  }
})

module.exports = router
