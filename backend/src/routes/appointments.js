const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/appointments — lista agendamentos
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    let q = `
      SELECT
        a.*,
        l.name  AS lead_name,
        l.phone AS lead_phone,
        p.name  AS procedure_name,
        p.duration
      FROM appointments a
      JOIN leads l      ON a.lead_id      = l.id
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = (SELECT id FROM clinics WHERE slug = $1)
    `
    const params = [process.env.CLINIC_SLUG || 'bella-estetica']

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
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status = 'confirmed')         AS confirmed,
        COUNT(*) FILTER (WHERE status = 'pending')           AS pending,
        COUNT(*) FILTER (WHERE status = 'done')              AS done,
        COUNT(*) FILTER (WHERE source = 'system')            AS from_system
      FROM appointments
      WHERE clinic_id = (SELECT id FROM clinics WHERE slug = $1)
    `, [process.env.CLINIC_SLUG || 'bella-estetica'])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar stats' })
  }
})

// GET /api/appointments/slots?date=YYYY-MM-DD&procedure_id=UUID
// Retorna horários disponíveis para um dia
router.get('/slots', async (req, res) => {
  try {
    const { date, procedure_id } = req.query
    if (!date) return res.status(400).json({ error: 'Data obrigatória' })

    const d = new Date(date)
    const dayOfWeek = d.getDay()

    // Horário de funcionamento desse dia
    const { rows: [hours] } = await db.query(`
      SELECT * FROM business_hours
      WHERE clinic_id = (SELECT id FROM clinics WHERE slug = $1)
        AND day_of_week = $2
    `, [process.env.CLINIC_SLUG || 'bella-estetica', dayOfWeek])

    if (!hours || !hours.open) return res.json({ slots: [], reason: 'closed' })

    // Duração do procedimento
    let duration = 60
    if (procedure_id) {
      const { rows: [proc] } = await db.query('SELECT duration FROM procedures WHERE id = $1', [procedure_id])
      if (proc) duration = proc.duration
    }

    // Agendamentos já existentes neste dia
    const { rows: booked } = await db.query(`
      SELECT a.scheduled_at, p.duration
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = (SELECT id FROM clinics WHERE slug = $1)
        AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $2
        AND a.status != 'cancelled'
    `, [process.env.CLINIC_SLUG || 'bella-estetica', date])

    // Gera slots de 30 em 30 min dentro do horário
    const slots = []
    const [sh, sm] = hours.start_time.split(':').map(Number)
    const [eh, em] = hours.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em

    while (cur + duration <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0')
      const mm = String(cur % 60).padStart(2, '0')
      const slotStart = new Date(`${date}T${hh}:${mm}:00-03:00`)
      const slotEnd = new Date(slotStart.getTime() + duration * 60000)

      const taken = booked.some(b => {
        const bs = new Date(b.scheduled_at)
        const be = new Date(bs.getTime() + b.duration * 60000)
        return slotStart < be && slotEnd > bs
      })

      slots.push({ time: `${hh}:${mm}`, taken })
      cur += 30
    }

    res.json({ slots })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao gerar slots' })
  }
})

// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const allowed = ['pending', 'confirmed', 'done', 'cancelled']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' })

    const { rows } = await db.query(`
      UPDATE appointments SET status = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [status, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar agendamento' })
  }
})

module.exports = router
