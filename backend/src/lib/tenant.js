const db = require('../db')

const FALLBACK_SLUG = () => process.env.CLINIC_SLUG || 'bella-estetica'

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'clinica'
}

async function findClinicBySlug(slug = FALLBACK_SLUG()) {
  const { rows: [clinic] } = await db.query(
    'SELECT * FROM clinics WHERE slug = $1',
    [slug]
  )
  return clinic || null
}

async function getFallbackClinicId() {
  const clinic = await findClinicBySlug(FALLBACK_SLUG())
  return clinic?.id || null
}

async function getEffectiveClinicId(req, options = {}) {
  if (!req.user) throw Object.assign(new Error('Nao autorizado'), { status: 401 })

  if (req.user.role === 'superadmin') {
    const override = req.query.clinic_id || req.body?.clinic_id || options.clinicId
    if (override) return override
    if (options.optional) return null
    throw Object.assign(new Error('clinic_id obrigatorio para superadmin'), { status: 400 })
  }

  if (!req.user.clinicId) {
    throw Object.assign(new Error('Usuario sem clinica vinculada'), { status: 403 })
  }
  return req.user.clinicId
}

async function ensureUniqueSlug(baseSlug, client = db) {
  const base = normalizeSlug(baseSlug)
  let slug = base
  let suffix = 2

  while (true) {
    const { rows } = await client.query('SELECT id FROM clinics WHERE slug = $1', [slug])
    if (!rows.length) return slug
    slug = `${base}-${suffix}`
    suffix += 1
  }
}

module.exports = {
  FALLBACK_SLUG,
  normalizeSlug,
  findClinicBySlug,
  getFallbackClinicId,
  getEffectiveClinicId,
  ensureUniqueSlug,
}
