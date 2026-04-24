const express = require('express')
const router = express.Router()
const db = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

// GET /api/professionals — lista profissionais com contagem de procedimentos vinculados
router.get('/', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT pf.*,
             COUNT(pp.procedure_id)::int AS procedure_count
      FROM professionals pf
      LEFT JOIN procedure_professionals pp ON pp.professional_id = pf.id
      WHERE pf.clinic_id = $1
      GROUP BY pf.id
      ORDER BY pf.name
    `, [clinicId])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar profissionais' })
  }
})

// POST /api/professionals — cria profissional
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      INSERT INTO professionals (clinic_id, name) VALUES ($1, $2) RETURNING *
    `, [clinicId, name])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar profissional' })
  }
})

// PATCH /api/professionals/:id — atualiza nome e/ou status ativo
router.patch('/:id', async (req, res) => {
  try {
    const { name, active } = req.body
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      UPDATE professionals
      SET name   = COALESCE($1, name),
          active = COALESCE($2, active)
      WHERE id = $3 AND clinic_id = $4
      RETURNING *
    `, [name || null, active !== undefined ? active : null, req.params.id, clinicId])
    if (!rows.length) return res.status(404).json({ error: 'Profissional não encontrado' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar profissional' })
  }
})

// GET /api/professionals/:id/procedures — procedimentos vinculados a este profissional
router.get('/:id/procedures', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT pr.id, pr.name, pr.duration, pr.active
      FROM procedures pr
      JOIN procedure_professionals pp ON pp.procedure_id = pr.id
      WHERE pp.professional_id = $1 AND pr.clinic_id = $2
      ORDER BY pr.sort_order, pr.name
    `, [req.params.id, clinicId])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar procedimentos do profissional' })
  }
})

// PUT /api/professionals/:id/procedures — substitui todos os vínculos de procedimentos
router.put('/:id/procedures', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { procedure_ids } = req.body
    if (!Array.isArray(procedure_ids)) return res.status(400).json({ error: 'procedure_ids deve ser um array' })
    const clinicId = await getEffectiveClinicId(req)

    const { rows: [prof] } = await client.query(
      'SELECT id FROM professionals WHERE id=$1 AND clinic_id=$2', [req.params.id, clinicId]
    )
    if (!prof) return res.status(404).json({ error: 'Profissional não encontrado' })

    await client.query('BEGIN')
    await client.query('DELETE FROM procedure_professionals WHERE professional_id=$1', [req.params.id])
    for (const procId of procedure_ids) {
      await client.query(`
        INSERT INTO procedure_professionals (procedure_id, professional_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `, [procId, req.params.id])
    }
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar vínculos' })
  } finally {
    client.release()
  }
})

// GET /api/procedures/:id/professionals — profissionais vinculados a um procedimento
// (registrada aqui para manter rotas de profissionais centralizadas)
router.get('/by-procedure/:procedureId', async (req, res) => {
  try {
    const clinicId = await getEffectiveClinicId(req)
    const { rows } = await db.query(`
      SELECT pf.id, pf.name, pf.active
      FROM professionals pf
      JOIN procedure_professionals pp ON pp.professional_id = pf.id
      WHERE pp.procedure_id = $1 AND pf.clinic_id = $2
      ORDER BY pf.name
    `, [req.params.procedureId, clinicId])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar profissionais do procedimento' })
  }
})

// PUT /api/professionals/by-procedure/:procedureId — define profissionais de um procedimento
router.put('/by-procedure/:procedureId', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { professional_ids } = req.body
    if (!Array.isArray(professional_ids)) return res.status(400).json({ error: 'professional_ids deve ser um array' })
    const clinicId = await getEffectiveClinicId(req)

    // Verifica que o procedimento pertence à clínica
    const { rows: [proc] } = await client.query(
      'SELECT id FROM procedures WHERE id=$1 AND clinic_id=$2', [req.params.procedureId, clinicId]
    )
    if (!proc) return res.status(404).json({ error: 'Procedimento não encontrado' })

    await client.query('BEGIN')
    await client.query('DELETE FROM procedure_professionals WHERE procedure_id=$1', [req.params.procedureId])
    for (const profId of professional_ids) {
      await client.query(`
        INSERT INTO procedure_professionals (procedure_id, professional_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `, [req.params.procedureId, profId])
    }
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar vínculos' })
  } finally {
    client.release()
  }
})

module.exports = router
