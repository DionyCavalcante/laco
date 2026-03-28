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
  allowedHeaders: ['Content-Type', 'x-api-key']
}))
app.use(express.json())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Health check — Railway usa isso
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }))

// Auth em todas as rotas /api (exceto portal e webhook)
app.use('/api', requireAuth)

// Rotas
app.use('/api/leads',        require('./routes/leads'))
app.use('/api/appointments', require('./routes/appointments'))
app.use('/api/procedures',   require('./routes/procedures'))
app.use('/api/portal',       require('./routes/portal'))
app.use('/api/hours',        require('./routes/hours'))
app.use('/api/upload',       require('./routes/upload'))
app.use('/api/settings',     require('./routes/settings'))
app.use('/webhook',          require('./routes/webhook'))

// Serve arquivos de upload (fotos antes/depois)
const path = require('path')
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

// Serve o frontend estático em produção
if (process.env.NODE_ENV === 'production') {
  const path = require('path')
  const pub = path.join(__dirname, '../../frontend/public')
  app.use(express.static(pub))

  // Portal do cliente: /:slug/agendar
  app.get('/:slug/agendar', (req, res) => {
    res.sendFile(path.join(pub, 'agendar.html'))
  })

  // Config da clínica
  app.get('/config', (req, res) => {
    res.sendFile(path.join(pub, 'config/index.html'))
  })

  // Hoje — visão operacional
  app.get('/hoje', (req, res) => {
    res.sendFile(path.join(pub, 'hoje.html'))
  })

  // Detalhe do cliente
  app.get('/cliente', (req, res) => {
    res.sendFile(path.join(pub, 'cliente.html'))
  })

  // Login
  app.get('/login', (req, res) => {
    res.sendFile(path.join(pub, 'login.html'))
  })

  // Dashboard principal
  app.get('*', (req, res) => {
    res.sendFile(path.join(pub, 'index.html'))
  })
}

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Laço API rodando na porta ${PORT}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Clínica:  ${process.env.CLINIC_NAME || 'Não configurada'}`)
})
