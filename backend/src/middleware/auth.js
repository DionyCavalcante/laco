function requireAuth(req, res, next) {
  // Rotas públicas — portal do cliente e webhook não precisam de auth
  const publicPaths = ['/health', '/webhook']
  const isPublic = publicPaths.some(p => req.path.startsWith(p))
  const isPortal = req.path.startsWith('/portal')
  const isPublicUpload = req.method === 'GET' && req.path.match(/^\/upload\/procedure\/\d+\/photos$/)
  if (isPublic || isPortal || isPublicUpload) return next()

  const key = req.headers['x-api-key'] || req.query.api_key
  if (!key || key !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  next()
}

module.exports = { requireAuth }
