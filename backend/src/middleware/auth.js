const jwt = require('jsonwebtoken')
const { getFallbackClinicId } = require('../lib/tenant')

const JWT_SECRET = () => process.env.JWT_SECRET || process.env.API_SECRET || 'dev-secret-change-me'

function signAccessToken(user) {
  return jwt.sign({
    userId: user.id,
    clinicId: user.clinic_id || null,
    role: user.role,
  }, JWT_SECRET(), { expiresIn: '1h' })
}

async function requireAuth(req, res, next) {
  // Rotas públicas — portal do cliente e webhook não precisam de auth
  const isPortal = req.path.startsWith('/portal')
  const isBillingWebhook = req.path === '/billing/stripe/webhook'
  const isPublicUpload = req.method === 'GET' && req.path.match(/^\/upload\/procedure\/[^/]+\/photos$/)
  if (isPortal || isBillingWebhook || isPublicUpload) return next()

  const header = req.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null

  if (bearer) {
    try {
      const decoded = jwt.verify(bearer, JWT_SECRET())
      req.user = {
        id: decoded.userId,
        clinicId: decoded.clinicId || null,
        role: decoded.role || 'admin',
        authMethod: 'jwt',
      }
      return next()
    } catch (err) {
      return res.status(401).json({ error: 'Token invalido ou expirado' })
    }
  }

  const key = req.headers['x-api-key'] || req.query.api_key
  if (key && key === process.env.API_SECRET) {
    const clinicId = await getFallbackClinicId()
    req.user = { id: null, clinicId, role: 'admin', authMethod: 'api-key' }
    return next()
  }
  return res.status(401).json({ error: 'Nao autorizado' })
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Acesso negado' })
    }
    next()
  }
}

module.exports = { requireAuth, requireRole, signAccessToken, JWT_SECRET }
