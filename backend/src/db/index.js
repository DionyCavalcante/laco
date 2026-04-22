const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
})

pool.on('error', (err) => { console.error('POOL ERROR:', err.message)
  console.error('POOL ERROR DETAIL:', err.stack)
})

async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (process.env.NODE_ENV !== 'production') {
    console.log('query', { text, duration, rows: res.rowCount })
  }
  return res
}

module.exports = { query, pool }

// Testa conexão ao iniciar
pool.connect().then(c => { console.log('✅ Banco conectado!'); c.release() }).catch(e => console.error('❌ BANCO FALHOU:', e.message))
