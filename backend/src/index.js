require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { requireAuth } = require('./middleware/auth')

const app = express()

// Segurança e parsing
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization']
}))
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/billing/stripe/webhook') req.rawBody = buf
  }
}))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Garante constraints críticas no banco (idempotente)
const db = require('./db')
db.query(`
  ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_clinic_phone_unique;
  ALTER TABLE leads ADD CONSTRAINT leads_clinic_phone_unique UNIQUE (clinic_id, phone);
`).catch(e => console.warn('constraint migration:', e.message))

// Health check — Railway usa isso
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }))

// Auth em todas as rotas /api (exceto portal e webhook)
app.use('/api/auth', require('./routes/auth'))
app.use('/api', requireAuth)

// Rotas
app.use('/api/leads',        require('./routes/leads'))
app.use('/api/appointments', require('./routes/appointments'))
app.use('/api/procedures',   require('./routes/procedures'))
app.use('/api/portal',       require('./routes/portal'))
app.use('/api/hours',        require('./routes/hours'))
app.use('/api/upload',       require('./routes/upload'))
app.use('/api/settings',     require('./routes/settings'))
app.use('/api/superadmin',   require('./routes/superadmin'))
app.use('/api/onboarding',   require('./routes/onboarding'))
app.use('/api/billing',      require('./routes/billing'))
app.use('/webhook',          require('./routes/webhook'))

// Serve arquivos de upload (fotos antes/depois)
const path = require('path')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads')
app.use('/uploads', express.static(UPLOAD_DIR, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
}))
const pub = path.join(__dirname, '../public')
app.get('/',           (req, res) => res.redirect('/login'))
app.get('/painel',     (req, res) => res.sendFile(path.join(pub, 'painel.html')))
app.get('/login',      (req, res) => res.sendFile(path.join(pub, 'login.html')))
app.get('/cadastro',   (req, res) => res.sendFile(path.join(pub, 'cadastro/index.html')))
app.get('/checkout',   (req, res) => res.sendFile(path.join(pub, 'checkout/index.html')))
app.get('/onboarding', (req, res) => res.sendFile(path.join(pub, 'onboarding/index.html')))
app.get('/superadmin', (req, res) => res.sendFile(path.join(pub, 'superadmin/index.html')))
// Serve o frontend estático em produção
if (process.env.NODE_ENV === 'production') {
  // Assets estáticos (JS, CSS, imagens)
  app.use(express.static(pub, { index: false }))
}

// Rotas explícitas ANTES dos wildcards /:slug
app.get('/config',        (req, res) => res.sendFile(path.join(pub, 'config/index.html')))

app.get('/:slug/agendar', (req, res) => res.sendFile(path.join(pub, 'index.html')))
app.get('/:slug',         (req, res) => res.sendFile(path.join(pub, 'painel.html')))

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  console.error("INTERNAL:", err.stack); res.status(500).json({ error: err.message || "erro" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Laço API rodando na porta ${PORT}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Clínica:  ${process.env.CLINIC_NAME || 'Não configurada'}`)
})
