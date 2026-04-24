const express = require('express')
const router = express.Router()
const db = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

// GET /api/appointments — lista agendamentos
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const clinicId = await getEffectiveClinicId(req)
    let q = `
      SELECT
        a.*,
        l.name  AS lead_name,
        l.phone AS lead_phone,
        p.name  AS procedure_name,
        p.duration,
        p.price AS price
      FROM appointments a
      JOIN leads l      ON a.lead_id      = l.id
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = $1
    `
    const params = [clinicId]

    if (status) {
      params.push(status)
      q += ` AND a.status = $${params.length}`
    }
    if (req.query.lead_id) {
      params.push(req.query.lead_id)
      q += ` AND a.lead_id = $${params.length}`
    }
    if (req.query.date) {
      params.push(req.query.date)
      q += ` AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $${params.length}`
    }
    if (req.query.from) {
      params.push(req.query.from)
      q += ` AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') >= $${params.length}`
    }
    if (req.query.to) {
      params.push(req.query.to)
      q += ` AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') <= $${params.length}`
    }
    q += ' ORDER BY a.scheduled_at ASC'
    const { rows } = await db.query(q, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar agendamentos' })
  }
})

// GET /api/appointments/stats
router.get('/stats', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                                AS total,
        COUNT(*) FILTER (WHERE a.status = 'confirmed')         AS confirmed,
        COUNT(*) FILTER (WHERE a.status = 'pending')           AS pending,
        COUNT(*) FILTER (WHERE a.status = 'done')              AS done,
        COUNT(*) FILTER (WHERE a.source = 'system')            AS from_system,
        -- Valores financeiros
        COALESCE(SUM(p.price) FILTER (WHERE a.status IN ('pending','confirmed')), 0)  AS valor_agendado,
        COALESCE(SUM(p.price) FILTER (WHERE a.status = 'done'), 0)                    AS valor_realizado,
        COALESCE(SUM(p.price) FILTER (WHERE a.status = 'cancelled'), 0)               AS valor_perdido
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = $1
    `, [clinicId])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar stats' })
  }
})

// GET /api/appointments/slots?date=YYYY-MM-DD&procedure_id=UUID
// Retorna horários disponíveis para um dia (bloqueio por profissional)
router.get('/slots', async (req, res) => {
  try {
    const { date, procedure_id } = req.query
    const clinicId = await getEffectiveClinicId(req)
    if (!date) return res.status(400).json({ error: 'Data obrigatória' })

    const { computeSlots } = require('../lib/slots')
    const result = await computeSlots(clinicId, date, procedure_id || null)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao gerar slots' })
  }
})

// PATCH /api/appointments/:id/reschedule
router.patch('/:id/reschedule', async (req, res) => {
  const { date, time } = req.body
  if (!date || !time) return res.status(400).json({ error: 'date e time obrigatórios' })

  const { pool } = require('../db')
  const client = await pool.connect()
  try {
    const clinicId = await getEffectiveClinicId(req)
    await client.query('BEGIN')

    const { rows: [orig] } = await client.query(
      'SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2',
      [req.params.id, clinicId]
    )
    console.log(`[reschedule] id=${req.params.id} found=${!!orig} status=${orig?.status}`)
    if (!orig) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    await client.query(
      'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', req.params.id]
    )

    const scheduled_at = new Date(`${date}T${time}:00-03:00`)
    const { rows: [newAppt] } = await client.query(`
      INSERT INTO appointments (clinic_id, lead_id, procedure_id, scheduled_at, status, source, rescheduled_from)
      VALUES ($1, $2, $3, $4, 'confirmed', 'system', $5)
      RETURNING *
    `, [orig.clinic_id, orig.lead_id, orig.procedure_id, scheduled_at, orig.id])

    await client.query('COMMIT')
    res.json(newAppt)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Erro ao remarcar agendamento' })
  } finally {
    client.release()
  }
})

// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const clinicId = await getEffectiveClinicId(req)
    const allowed = ['pending', 'confirmed', 'done', 'cancelled']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' })

    const { rows } = await db.query(`
      UPDATE appointments SET status = $1, updated_at = NOW()
      WHERE id = $2 AND clinic_id = $3 RETURNING *
    `, [status, req.params.id, clinicId])

    if (!rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar agendamento' })
  }
})

module.exports = router
