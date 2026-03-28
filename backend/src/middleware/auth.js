function requireAuth(req, res, next) {
  // Rotas públicas — portal do cliente e webhook não precisam de auth
  const publicPaths = ['/health', '/webhook']
  const isPublic = publicPaths.some(p => req.path.startsWith(p))
  const isPortal = req.path.startsWith('/portal')
  if (isPublic || isPortal) return next()

  const key = req.headers['x-api-key'] || req.query.api_key
  if (!key || key !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  next()
}

module.exports = { requireAuth }
