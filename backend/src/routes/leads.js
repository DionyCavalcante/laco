const express = require('express')
const router = express.Router()
const db = require('../db')

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

// GET /api/leads — lista todos com filtros opcionais
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query
    let q = `
      SELECT
        l.*,
        p.name AS procedure_name,
        a.scheduled_at,
        a.status AS appointment_status
      FROM leads l
      LEFT JOIN procedures p ON l.procedure_viewed = p.id
      LEFT JOIN appointments a ON a.lead_id = l.id
      WHERE l.clinic_id = (SELECT id FROM clinics WHERE slug = $1)
    `
    const params = [process.env.CLINIC_SLUG || 'bella-estetica']

    if (status && status !== 'todos') {
      params.push(status)
      q += ` AND l.status = $${params.length}`
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

// POST /api/leads — cria lead manualmente
router.post('/', async (req, res) => {
  try {
    const { name, phone, source = 'manual' } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' })

    const { rows } = await db.query(`
      INSERT INTO leads (clinic_id, name, phone, source)
      VALUES ((SELECT id FROM clinics WHERE slug = $1), $2, $3, $4)
      RETURNING *
    `, [process.env.CLINIC_SLUG || 'bella-estetica', name, phone, source])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar lead' })
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

module.exports = router
