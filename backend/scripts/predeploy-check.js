require('dotenv').config()

const required = [
  'DATABASE_URL',
  'API_SECRET',
  'CLINIC_SLUG',
  'JWT_SECRET',
  'SUPERADMIN_EMAIL',
  'SUPERADMIN_PASSWORD',
]

const recommended = [
  'ENFORCE_ONBOARDING_GATE',
  'WEBHOOK_DEFAULT_CLINIC_SLUG',
]

let failed = false

for (const key of required) {
  if (!process.env[key]) {
    console.error(`FAIL env obrigatoria ausente: ${key}`)
    failed = true
  } else {
    console.log(`OK   ${key}`)
  }
}

for (const key of recommended) {
  if (!process.env[key]) {
    console.warn(`WARN env recomendada ausente: ${key}`)
  } else {
    console.log(`OK   ${key}`)
  }
}

if (process.env.ENFORCE_ONBOARDING_GATE === 'true') {
  console.warn('WARN ENFORCE_ONBOARDING_GATE=true pode bloquear portais antigos sem onboarding_completed_at')
}

if (!process.env.WEBHOOK_DEFAULT_CLINIC_SLUG && !process.env.CLINIC_SLUG) {
  console.warn('WARN webhook antigo pode nao vincular leads sem clinic_slug')
}

if (failed) process.exit(1)

console.log('Predeploy check OK')
