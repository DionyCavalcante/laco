const envPathArg = process.argv.find(arg => arg.startsWith('--env='))
const envPath = envPathArg ? envPathArg.slice('--env='.length) : (process.env.DOTENV_CONFIG_PATH || '.env')
require('dotenv').config({ path: envPath })

const baseUrl = (process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '')
const apiSecret = process.env.SMOKE_API_SECRET || process.env.API_SECRET
const email = process.env.SMOKE_SUPERADMIN_EMAIL || process.env.SUPERADMIN_EMAIL
const password = process.env.SMOKE_SUPERADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD
const clinicSlug = process.env.SMOKE_CLINIC_SLUG || process.env.WEBHOOK_DEFAULT_CLINIC_SLUG || process.env.CLINIC_SLUG || 'bella-estetica'

const results = []

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  let body = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch (err) {
      body = text.slice(0, 300)
    }
  }
  return { response, body }
}

async function check(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail })
    console.log(`OK   ${name}${detail ? ` - ${detail}` : ''}`)
  } catch (err) {
    results.push({ name, ok: false, detail: err.message })
    console.error(`FAIL ${name} - ${err.message}`)
  }
}

function requireStatus(name, response, allowed) {
  if (!allowed.includes(response.status)) {
    throw new Error(`${name} retornou HTTP ${response.status}`)
  }
}

async function main() {
  console.log(`Smoke target: ${baseUrl}`)

  await check('health', async () => {
    const { response, body } = await request('/health')
    requireStatus('/health', response, [200])
    if (!body?.ok) throw new Error('health sem ok=true')
    return 'API online'
  })

  await check('login page', async () => {
    const { response } = await request('/login')
    requireStatus('/login', response, [200])
    return 'HTML servido'
  })

  await check('superadmin page', async () => {
    const { response } = await request('/superadmin')
    requireStatus('/superadmin', response, [200])
    return 'HTML servido'
  })

  await check('portal publico atual', async () => {
    const { response } = await request(`/${clinicSlug}/agendar`)
    requireStatus(`/${clinicSlug}/agendar`, response, [200])
    return clinicSlug
  })

  if (apiSecret) {
    await check('fallback x-api-key em /api/leads', async () => {
      const { response } = await request('/api/leads', {
        headers: { 'x-api-key': apiSecret },
      })
      requireStatus('/api/leads', response, [200])
      return 'compatibilidade antiga ativa'
    })
  } else {
    console.log('SKIP fallback x-api-key - API_SECRET ausente')
  }

  let token = null
  if (email && password) {
    await check('login superadmin JWT', async () => {
      const { response, body } = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      requireStatus('/api/auth/login', response, [200])
      if (!body?.token) throw new Error('token ausente')
      token = body.token
      return body.user?.role || 'sem role'
    })

    await check('auth/me JWT', async () => {
      const { response, body } = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      requireStatus('/api/auth/me', response, [200])
      if (!body?.user) throw new Error('user ausente')
      return body.user.role
    })

    await check('dashboard superadmin', async () => {
      const { response, body } = await request('/api/superadmin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
      requireStatus('/api/superadmin/dashboard', response, [200])
      if (!body || typeof body !== 'object') throw new Error('payload invalido')
      return `clinicas=${body.total_clinics ?? 'n/a'}`
    })
  } else {
    console.log('SKIP JWT superadmin - SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD ausentes')
  }

  await check('portal API por slug', async () => {
    const { response } = await request(`/api/portal/${clinicSlug}`)
    requireStatus(`/api/portal/${clinicSlug}`, response, [200, 402, 423])
    if (response.status === 423) return 'bloqueado por onboarding gate'
    if (response.status === 402) return 'suspenso'
    return 'publico OK'
  })

  const failed = results.filter(r => !r.ok)
  if (failed.length) {
    console.error(`\nSmoke falhou: ${failed.length}/${results.length}`)
    process.exit(1)
  }

  console.log(`\nSmoke passou: ${results.length}/${results.length}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
