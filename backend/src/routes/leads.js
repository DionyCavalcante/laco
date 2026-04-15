const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/leads — lista todos com filtros opcionais
router.get('/', async (req, res) => {
  try {
    const { status, search, date_from, date_to } = req.query
    let q = `
      SELECT
        l.*,
        p.name  AS procedure_name,
        p.price AS procedure_price,
        a.id AS appointment_id,
        a.scheduled_at,
        a.status AS appointment_status
      FROM leads l
      LEFT JOIN procedures p ON l.procedure_viewed = p.id
      LEFT JOIN LATERAL (
        SELECT id, status, scheduled_at FROM appointments
        WHERE lead_id = l.id
        ORDER BY created_at DESC LIMIT 1
      ) a ON true
      WHERE l.clinic_id = (SELECT id FROM clinics WHERE slug = $1)
    `
    const params = [process.env.CLINIC_SLUG || 'bella-estetica']

    if (status && status !== 'todos') {
      params.push(status)
      q += ` AND l.status = $${params.length}`
    }
    if (date_from) {
      params.push(date_from)
      q += ` AND l.created_at::date >= $${params.length}::date`
    }
    if (date_to) {
      params.push(date_to)
      q += ` AND l.created_at::date <= $${params.length}::date`
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`)
      q += ` AND (LOWER(l.name) LIKE $${params.length} OR l.phone LIKE $${params.length})`
    }

    q += ' ORDER BY l.created_at DESC'
    const { rows } = await db.query(q, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar leads' })
  }
})

// GET /api/leads/stats — contadores para os cards do topo
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                           AS total,
        COUNT(*) FILTER (WHERE l.status = 'scheduled')    AS scheduled,
        COUNT(*) FILTER (WHERE l.status = 'rejected')     AS rejected,
        COUNT(*) FILTER (WHERE l.status = 'link_sent')    AS link_sent,
        COUNT(*) FILTER (WHERE l.status = 'new')          AS new_leads,
        -- Valor em aberto: leads com link enviado (potencial)
        COALESCE(SUM(p.price) FILTER (WHERE l.status = 'link_sent'), 0)   AS valor_em_aberto,
        -- Valor agendado: procedimentos agendados ainda não concluídos
        COALESCE(SUM(p.price) FILTER (WHERE l.status = 'scheduled'), 0)   AS valor_agendado,
        -- Valor realizado: agendamentos com status 'done'
        COALESCE(SUM(p.price) FILTER (WHERE a.status = 'done'), 0)        AS valor_realizado
      FROM leads l
      LEFT JOIN procedures p ON l.procedure_viewed = p.id
      LEFT JOIN appointments a ON a.lead_id = l.id AND a.status = 'done'
      WHERE l.clinic_id = (SELECT id FROM clinics WHERE slug = $1)
    `, [process.env.CLINIC_SLUG || 'bella-estetica'])
    res.json(rows[0])
  } catch (err) {
    console.error('stats error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/leads — cria ou atualiza lead (upsert por telefone)
router.post('/', async (req, res) => {
  try {
    const { name, phone, source = 'manual', status = 'link_sent' } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' })

    const clinicSlug = process.env.CLINIC_SLUG || 'bella-estetica'
    const { rows } = await db.query(`
      INSERT INTO leads (clinic_id, name, phone, source, status, last_interaction_at)
      VALUES ((SELECT id FROM clinics WHERE slug = $1), $2, $3, $4, $5, NOW())
      ON CONFLICT (clinic_id, phone)
      DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        last_interaction_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [clinicSlug, name, phone, source, status])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar lead' })
  }
})

// PATCH /api/leads/phone/:phone — atualiza nome e last_interaction_at sem sobrescrever status
router.patch('/phone/:phone', async (req, res) => {
  try {
    const { name } = req.body
    const clinicSlug = process.env.CLINIC_SLUG || 'bella-estetica'
    const { rows } = await db.query(`
      UPDATE leads
      SET
        name = COALESCE($1, name),
        last_interaction_at = NOW(),
        updated_at = NOW()
      WHERE phone = $2
        AND clinic_id = (SELECT id FROM clinics WHERE slug = $3)
      RETURNING *
    `, [name || null, req.params.phone, clinicSlug])

    if (!rows.length) return res.status(404).json({ error: 'Lead não encontrado' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar interação' })
  }
})

// PATCH /api/leads/:id/status — atualiza status e motivo
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, reject_reason, procedure_viewed } = req.body
    const allowed = ['new', 'link_sent', 'scheduled', 'rejected']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' })

    const { rows } = await db.query(`
      UPDATE leads
      SET status = $1,
          reject_reason = $2,
          procedure_viewed = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, reject_reason || null, procedure_viewed || null, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Lead não encontrado' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar status' })
  }
})

// GET /api/leads/:id — detalhe de um lead
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, p.name AS procedure_name
      FROM leads l
      LEFT JOIN procedures p ON l.procedure_viewed = p.id
      WHERE l.id = $1
    `, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Lead não encontrado' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar lead' })
  }
})

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM appointments WHERE lead_id = $1', [req.params.id])
    await db.query('DELETE FROM leads WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cliente' })
  }
})

module.exports = router
