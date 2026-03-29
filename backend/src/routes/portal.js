const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/portal/:slug — info da clínica + procedimentos ativos
router.get('/:slug', async (req, res) => {
  try {
    const { rows: [clinic] } = await db.query(
      'SELECT * FROM clinics WHERE slug = $1', [req.params.slug]
    )
    if (!clinic) return res.status(404).json({ error: 'Clínica não encontrada' })

    const { rows: procedures } = await db.query(`
      SELECT id, name, duration, price, price_old, payment_note, video_url
      FROM procedures
      WHERE clinic_id = $1 AND active = true
      ORDER BY sort_order, name
    `, [clinic.id])

    res.json({ clinic: { id: clinic.id, name: clinic.name, slug: clinic.slug }, procedures })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao carregar portal' })
  }
})

// GET /api/portal/:slug/slots?date=YYYY-MM-DD&procedure_id=UUID
router.get('/:slug/slots', async (req, res) => {
  try {
    const { date, procedure_id } = req.query
    if (!date) return res.status(400).json({ error: 'Data obrigatória' })

    const { rows: [clinic] } = await db.query('SELECT id FROM clinics WHERE slug=$1', [req.params.slug])
    if (!clinic) return res.status(404).json({ error: 'Clínica não encontrada' })

    const d = new Date(date)
    const dayOfWeek = d.getDay()

    const { rows: [hours] } = await db.query(`
      SELECT * FROM business_hours WHERE clinic_id=$1 AND day_of_week=$2
    `, [clinic.id, dayOfWeek])

    if (!hours || !hours.open) return res.json({ slots: [], reason: 'closed' })

    let duration = 60
    if (procedure_id) {
      const { rows: [proc] } = await db.query('SELECT duration FROM procedures WHERE id=$1', [procedure_id])
      if (proc) duration = proc.duration
    }

    const { rows: booked } = await db.query(`
      SELECT a.scheduled_at, p.duration
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id=$1
        AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $2
        AND a.status != 'cancelled'
    `, [clinic.id, date])

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

// Upsert de lead sem depender de constraint (compatível com qualquer estado do banco)
async function upsertLead(clinicId, name, phone) {
  const { rows: [existing] } = await db.query(
    'SELECT id FROM leads WHERE clinic_id=$1 AND phone=$2 LIMIT 1', [clinicId, phone]
  )
  if (existing) {
    await db.query('UPDATE leads SET name=$1, updated_at=NOW() WHERE id=$2', [name, existing.id])
    return existing.id
  }
  const { rows: [lead] } = await db.query(
    `INSERT INTO leads (clinic_id, name, phone, source, status)
     VALUES ($1, $2, $3, 'link', 'new') RETURNING id`,
    [clinicId, name, phone]
  )
  return lead.id
}

// POST /api/portal/:slug/identify — registra lead assim que informa nome e WhatsApp
router.post('/:slug/identify', async (req, res) => {
  try {
    const { name, phone } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' })

    const { rows: [clinic] } = await db.query('SELECT id FROM clinics WHERE slug=$1', [req.params.slug])
    if (!clinic) return res.status(404).json({ error: 'Clínica não encontrada' })

    const leadId = await upsertLead(clinic.id, name, phone)
    res.json({ ok: true, lead_id: leadId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao registrar lead' })
  }
})

// POST /api/portal/:slug/track — rastreia procedimento visualizado
router.post('/:slug/track', async (req, res) => {
  try {
    const { lead_id, procedure_id } = req.body
    if (!lead_id || !procedure_id) return res.status(400).json({ error: 'Dados insuficientes' })

    await db.query(`
      UPDATE leads SET procedure_viewed = $1, status = CASE WHEN status = 'new' THEN 'link_sent' ELSE status END, updated_at = NOW()
      WHERE id = $2
    `, [procedure_id, lead_id])

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rastrear' })
  }
})

// POST /api/portal/:slug/book — cliente finaliza agendamento
router.post('/:slug/book', async (req, res) => {
  try {
    const { name, phone, procedure_id, date, time, reject_reason } = req.body

    const { rows: [clinic] } = await db.query('SELECT id FROM clinics WHERE slug=$1', [req.params.slug])
    if (!clinic) return res.status(404).json({ error: 'Clínica não encontrada' })

    const leadId = req.body.lead_id || await upsertLead(clinic.id, name, phone)
    const { rows: [lead] } = await db.query('SELECT * FROM leads WHERE id=$1', [leadId])

    // Se o cliente recusou a oferta
    if (reject_reason) {
      await db.query(`
        UPDATE leads SET status='rejected', reject_reason=$1,
          procedure_viewed=$2, updated_at=NOW() WHERE id=$3
      `, [reject_reason, procedure_id || null, lead.id])
      return res.json({ ok: true, action: 'rejected' })
    }

    // Monta o datetime completo
    const scheduledAt = new Date(`${date}T${time}:00-03:00`)

    // Cria o agendamento
    const { rows: [apt] } = await db.query(`
      INSERT INTO appointments (clinic_id, lead_id, procedure_id, scheduled_at, source)
      VALUES ($1, $2, $3, $4, 'system') RETURNING *
    `, [clinic.id, lead.id, procedure_id, scheduledAt])

    // Atualiza status do lead
    await db.query(`
      UPDATE leads SET status='scheduled', procedure_viewed=$1, updated_at=NOW() WHERE id=$2
    `, [procedure_id, lead.id])

    res.status(201).json({ ok: true, appointment_id: apt.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao realizar agendamento' })
  }
})

module.exports = router
