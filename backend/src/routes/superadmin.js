const express = require('express')
const bcrypt = require('bcryptjs')
const { pool, query } = require('../db')
const { requireRole, signAccessToken } = require('../middleware/auth')
const { ensureUniqueSlug } = require('../lib/tenant')

const router = express.Router()
router.use(requireRole('superadmin'))

async function audit(actorId, action, targetType, targetId, meta = {}) {
  await query(`
    INSERT INTO audit_logs (actor_id, action, target_type, target_id, meta)
    VALUES ($1, $2, $3, $4, $5)
  `, [actorId, action, targetType, targetId, JSON.stringify(meta)])
}

router.get('/dashboard', async (req, res) => {
  const { rows: [metrics] } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status != 'cancelled') AS total_clinics,
      COUNT(*) FILTER (WHERE status = 'trial') AS trial_clinics,
      COUNT(*) FILTER (WHERE status = 'active') * 110 AS mrr,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_last_7_days
    FROM clinics
  `)
  const { rows: [leads] } = await query('SELECT COUNT(*) AS total_leads FROM leads')
  const { rows: [appointments] } = await query('SELECT COUNT(*) AS total_appointments FROM appointments')
  res.json({ ...metrics, ...leads, ...appointments })
})

router.get('/clinics', async (req, res) => {
  const params = []
  let where = ''
  if (req.query.status) {
    params.push(req.query.status)
    where = 'WHERE c.status = $1'
  }
  const { rows } = await query(`
    SELECT c.*,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (c.trial_ends_at - NOW())) / 86400)) AS trial_days_left,
      COUNT(u.id) FILTER (WHERE u.role = 'admin') AS admin_count
    FROM clinics c
    LEFT JOIN users u ON u.clinic_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, params)
  res.json(rows)
})

router.get('/accounts', async (req, res) => {
  const params = []
  let where = ''
  if (req.query.search) {
    params.push(`%${req.query.search.toLowerCase()}%`)
    where = `WHERE LOWER(c.name) LIKE $1 OR LOWER(c.slug) LIKE $1 OR LOWER(u.email) LIKE $1`
  }

  const { rows } = await query(`
    SELECT
      c.id AS clinic_id,
      c.name AS clinic_name,
      c.slug,
      c.status,
      c.plan,
      c.trial_ends_at,
      c.onboarding_step,
      c.onboarding_completed_at,
      c.created_at AS clinic_created_at,
      COUNT(DISTINCT l.id) AS leads_count,
      COUNT(DISTINCT a.id) AS appointments_count,
      COALESCE(
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', u.id,
            'email', u.email,
            'role', u.role,
            'active', u.active,
            'last_login', u.last_login
          )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'::jsonb
      ) AS users
    FROM clinics c
    LEFT JOIN users u ON u.clinic_id = c.id
    LEFT JOIN leads l ON l.clinic_id = c.id
    LEFT JOIN appointments a ON a.clinic_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, params)

  res.json(rows)
})

router.post('/clinics', async (req, res) => {
  const { name, admin_email, admin_password } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatorio' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const slug = await ensureUniqueSlug(name, client)
    const { rows: [clinic] } = await client.query(`
      INSERT INTO clinics (slug, name, status, trial_ends_at, onboarding_step)
      VALUES ($1, $2, 'trial', NOW() + INTERVAL '30 days', 0)
      RETURNING *
    `, [slug, name.trim()])
    if (admin_email && admin_password) {
      const hash = await bcrypt.hash(admin_password, 12)
      await client.query(`
        INSERT INTO users (clinic_id, email, password, role)
        VALUES ($1, LOWER($2), $3, 'admin')
      `, [clinic.id, admin_email, hash])
    }
    await client.query(`
      INSERT INTO audit_logs (actor_id, action, target_type, target_id, meta)
      VALUES ($1, 'clinic.create', 'clinic', $2, $3)
    `, [req.user.id, clinic.id, JSON.stringify({ name })])
    await client.query('COMMIT')
    res.status(201).json({ clinic, next: `/onboarding?clinic_id=${clinic.id}` })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar clinica' })
  } finally {
    client.release()
  }
})

router.patch('/clinics/:id/status', async (req, res) => {
  const allowed = ['trial', 'active', 'suspended', 'cancelled']
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Status invalido' })
  const { rows: [clinic] } = await query(
    'UPDATE clinics SET status = $1 WHERE id = $2 RETURNING *',
    [req.body.status, req.params.id]
  )
  if (!clinic) return res.status(404).json({ error: 'Clinica nao encontrada' })
  if (req.body.status === 'suspended') {
    await query('UPDATE users SET active = false WHERE clinic_id = $1', [req.params.id])
  }
  if (req.body.status === 'active' || req.body.status === 'trial') {
    await query('UPDATE users SET active = true WHERE clinic_id = $1', [req.params.id])
  }
  await audit(req.user.id, `clinic.${req.body.status}`, 'clinic', req.params.id)
  res.json(clinic)
})

router.patch('/clinics/:id/trial', async (req, res) => {
  const days = Number(req.body.days || 0)
  if (!Number.isFinite(days) || days <= 0) return res.status(400).json({ error: 'Dias invalidos' })
  const { rows: [clinic] } = await query(`
    UPDATE clinics
    SET trial_ends_at = COALESCE(trial_ends_at, NOW()) + ($1 || ' days')::interval
    WHERE id = $2
    RETURNING *
  `, [days, req.params.id])
  await audit(req.user.id, 'clinic.extend_trial', 'clinic', req.params.id, { days })
  res.json(clinic)
})

router.get('/users', async (req, res) => {
  const params = []
  let where = "WHERE u.role = 'admin'"
  if (req.query.clinic_id) {
    params.push(req.query.clinic_id)
    where += ` AND u.clinic_id = $${params.length}`
  }
  const { rows } = await query(`
    SELECT u.id, u.clinic_id, c.name AS clinic_name, u.email, u.role, u.active, u.created_at, u.last_login
    FROM users u
    LEFT JOIN clinics c ON c.id = u.clinic_id
    ${where}
    ORDER BY c.name, u.email
  `, params)
  res.json(rows)
})

router.post('/users', async (req, res) => {
  const { clinic_id, email, password } = req.body
  if (!clinic_id || !email || !password) return res.status(400).json({ error: 'Dados obrigatorios ausentes' })
  const hash = await bcrypt.hash(password, 12)
  const { rows: [user] } = await query(`
    INSERT INTO users (clinic_id, email, password, role)
    VALUES ($1, LOWER($2), $3, 'admin')
    RETURNING id, clinic_id, email, role, active
  `, [clinic_id, email, hash])
  await audit(req.user.id, 'user.create', 'user', user.id, { clinic_id })
  res.status(201).json(user)
})

router.patch('/users/:id/password', async (req, res) => {
  if (!req.body.password) return res.status(400).json({ error: 'Senha invalida' })
  const hash = await bcrypt.hash(req.body.password, 12)
  await query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.params.id])
  await audit(req.user.id, 'user.reset_password', 'user', req.params.id)
  res.json({ ok: true })
})

router.patch('/users/:id/email', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email invalido' })
  try {
    const { rows: [user] } = await query(`
      UPDATE users
      SET email = $1
      WHERE id = $2
      RETURNING id, clinic_id, email, role, active
    `, [email, req.params.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })
    await audit(req.user.id, 'user.update_email', 'user', req.params.id, { email })
    res.json(user)
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email ja cadastrado' })
    throw err
  }
})

router.patch('/users/:id/active', async (req, res) => {
  const active = req.body.active === true
  const { rows: [user] } = await query(`
    UPDATE users
    SET active = $1
    WHERE id = $2
    RETURNING id, clinic_id, email, role, active
  `, [active, req.params.id])
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })
  await audit(req.user.id, active ? 'user.activate' : 'user.deactivate', 'user', req.params.id)
  res.json(user)
})

router.post('/impersonate/:clinicId', async (req, res) => {
  const { rows: [clinic] } = await query('SELECT id, name, slug FROM clinics WHERE id = $1', [req.params.clinicId])
  if (!clinic) return res.status(404).json({ error: 'Clinica nao encontrada' })
  const user = { id: req.user.id, clinic_id: clinic.id, role: 'admin' }
  await audit(req.user.id, 'clinic.impersonate', 'clinic', clinic.id)
  res.json({ token: signAccessToken(user), slug: clinic.slug, banner: `Voce esta como admin de ${clinic.name}` })
})

module.exports = router
