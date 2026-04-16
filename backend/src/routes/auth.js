const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool, query } = require('../db')
const { requireAuth, signAccessToken } = require('../middleware/auth')
const { ensureUniqueSlug, normalizeSlug } = require('../lib/tenant')

const router = express.Router()
const loginAttempts = new Map()
const registerAttempts = new Map()

function limited(map, key, max, windowMs) {
  const now = Date.now()
  const hit = map.get(key) || { count: 0, resetAt: now + windowMs }
  if (hit.resetAt < now) {
    hit.count = 0
    hit.resetAt = now + windowMs
  }
  hit.count += 1
  map.set(key, hit)
  return hit.count > max
}

function publicUser(user) {
  return {
    id: user.id,
    clinic_id: user.clinic_id,
    email: user.email,
    role: user.role,
    active: user.active,
  }
}

async function createRefreshToken(client, userId) {
  const token = crypto.randomBytes(48).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  await client.query(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '30 days')
  `, [userId, hash])
  return token
}

router.post('/login', async (req, res) => {
  if (limited(loginAttempts, req.ip, 10, 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em instantes.' })
  }

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatorios' })

  const client = await pool.connect()
  try {
    const { rows: [user] } = await client.query(`
      SELECT u.*, c.status AS clinic_status, c.slug AS clinic_slug, c.onboarding_step AS clinic_onboarding_step
      FROM users u
      LEFT JOIN clinics c ON c.id = u.clinic_id
      WHERE LOWER(u.email) = LOWER($1)
    `, [email])
    if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais invalidas' })
    }
    if (user.role !== 'superadmin' && user.clinic_status === 'suspended') {
      return res.status(402).json({ error: 'Pagamento pendente', code: 'clinic_suspended' })
    }

    await client.query('BEGIN')
    await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
    const refreshToken = await createRefreshToken(client, user.id)
    await client.query('COMMIT')

    res.json({
      token: signAccessToken(user),
      refreshToken,
      user: publicUser(user),
      clinic: user.clinic_slug ? { slug: user.clinic_slug, onboarding_step: user.clinic_onboarding_step || 0 } : null
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(err)
    res.status(500).json({ error: 'Erro ao autenticar' })
  } finally {
    client.release()
  }
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken obrigatorio' })

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [stored] } = await client.query(`
      SELECT rt.*, u.id, u.clinic_id, u.role, u.email, u.active
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
      FOR UPDATE
    `, [hash])
    if (!stored || !stored.active) {
      await client.query('ROLLBACK')
      return res.status(401).json({ error: 'Refresh token invalido' })
    }

    await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [hash])
    const user = {
      id: stored.user_id,
      clinic_id: stored.clinic_id,
      role: stored.role,
      email: stored.email,
      active: stored.active,
    }
    const nextRefreshToken = await createRefreshToken(client, user.id)
    await client.query('COMMIT')
    res.json({ token: signAccessToken(user), refreshToken: nextRefreshToken })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(err)
    res.status(500).json({ error: 'Erro ao renovar token' })
  } finally {
    client.release()
  }
})

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [hash])
  }
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req, res) => {
  if (req.user.authMethod === 'api-key') return res.json({ user: req.user })
  const { rows: [user] } = await query('SELECT id, clinic_id, email, role, active FROM users WHERE id = $1', [req.user.id])
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })
  res.json({ user })
})

router.get('/slug/check', async (req, res) => {
  const base = normalizeSlug(req.query.name || req.query.slug)
  const slug = await ensureUniqueSlug(base)
  res.json({ slug, available: slug === base })
})

router.post('/register', async (req, res) => {
  if (limited(registerAttempts, req.ip, 3, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Limite de cadastros atingido. Tente mais tarde.' })
  }

  const { clinic_name, email, password, password_confirm } = req.body
  if (!clinic_name || !email || !password) return res.status(400).json({ error: 'Dados obrigatorios ausentes' })
  if (password !== password_confirm) return res.status(400).json({ error: 'Senhas nao conferem' })
  if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter no minimo 8 caracteres' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const slug = await ensureUniqueSlug(clinic_name, client)
    const { rows: [clinic] } = await client.query(`
      INSERT INTO clinics (slug, name, status, trial_ends_at, onboarding_step)
      VALUES ($1, $2, 'trial', NOW() + INTERVAL '30 days', 0)
      RETURNING *
    `, [slug, clinic_name.trim()])
    const hash = await bcrypt.hash(password, 12)
    const { rows: [user] } = await client.query(`
      INSERT INTO users (clinic_id, email, password, role)
      VALUES ($1, LOWER($2), $3, 'admin')
      RETURNING *
    `, [clinic.id, email, hash])
    const refreshToken = await createRefreshToken(client, user.id)
    await client.query('COMMIT')
    res.status(201).json({
      token: signAccessToken(user),
      refreshToken,
      user: publicUser(user),
      clinic,
      next: '/checkout',
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') return res.status(409).json({ error: 'Email ja cadastrado' })
    console.error(err)
    res.status(500).json({ error: 'Erro ao cadastrar' })
  } finally {
    client.release()
  }
})

module.exports = router
