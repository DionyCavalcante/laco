/**
 * import_agenda.js
 *
 * Importa agendamentos do Excel para o banco, bloqueando a agenda para
 * que o agente WhatsApp não marque nos horários já ocupados.
 *
 * Uso: cd backend && node scripts/import_agenda.js
 *      ou: node -r dotenv/config scripts/import_agenda.js dotenv_config_path=.env.local
 */

require('dotenv').config()
const XLSX = require('xlsx')
const { Pool } = require('pg')
const path = require('path')

const XLSX_PATH = path.join(__dirname, '../../RelatorioAgendamentos_De30-04-2026Ate31-05-2026_GeradoAs30-04-26_13_41_25.xlsx')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// "Qui, 30/04/2026" → "2026-04-30"
function parseDate(str) {
  const part = str.split(', ')[1]
  const [d, m, y] = part.split('/')
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

// "08:00 às 09:30" → { start: "08:00", durationMin: 90 }
function parseTime(str) {
  const [s, e] = str.split(' às ').map(t => t.trim())
  const [sh, sm] = s.split(':').map(Number)
  const [eh, em] = e.split(':').map(Number)
  const durationMin = (eh * 60 + em) - (sh * 60 + sm)
  return { start: s, durationMin }
}

// Telefone fictício determinístico por nome (para evitar duplicatas entre runs)
function fakePhone(name) {
  let h = 5381
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h) + name.charCodeAt(i)
    h &= 0x7fffffff
  }
  return `99${String(h % 1000000000).padStart(9, '0')}`
}

async function main() {
  // Lê Excel
  const wb = XLSX.readFile(XLSX_PATH)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
  const rows = data.slice(1).filter(r => r.length >= 5)
  console.log(`📋 ${rows.length} agendamentos no Excel\n`)

  const client = await pool.connect()
  try {
    // Clinic
    const { rows: clinics } = await client.query('SELECT id, name, slug FROM clinics LIMIT 1')
    if (!clinics.length) throw new Error('Nenhuma clínica no banco. Rode npm run migrate primeiro.')
    const { id: clinicId, name: clinicName, slug } = clinics[0]
    console.log(`🏥 Clínica: ${clinicName} (${slug})\n`)

    // ── 1. Profissionais ──────────────────────────────────────────────
    const profNames = [...new Set(rows.map(r => r[0].trim()))]
    const profIds = {}

    console.log('👤 Profissionais:')
    for (const name of profNames) {
      const { rows: ex } = await client.query(
        'SELECT id FROM professionals WHERE clinic_id=$1 AND name=$2',
        [clinicId, name]
      )
      if (ex.length) {
        profIds[name] = ex[0].id
        console.log(`   ↩️  Já existe: ${name}`)
      } else {
        const { rows: [p] } = await client.query(
          'INSERT INTO professionals (clinic_id, name, active) VALUES ($1, $2, true) RETURNING id',
          [clinicId, name]
        )
        profIds[name] = p.id
        console.log(`   ✅ Criado: ${name}`)
      }
    }

    // ── 2. Leads (clientes) ───────────────────────────────────────────
    const clientNames = [...new Set(rows.map(r => r[3].trim()))]
    const leadIds = {}

    console.log(`\n👥 Clientes (${clientNames.length} únicos):`)
    for (const name of clientNames) {
      const phone = fakePhone(name)
      const { rows: ex } = await client.query(
        'SELECT id FROM leads WHERE clinic_id=$1 AND phone=$2',
        [clinicId, phone]
      )
      if (ex.length) {
        leadIds[name] = ex[0].id
        console.log(`   ↩️  Já existe: ${name}`)
      } else {
        const { rows: [l] } = await client.query(
          `INSERT INTO leads (clinic_id, name, phone, source, status)
           VALUES ($1, $2, $3, 'imported', 'scheduled') RETURNING id`,
          [clinicId, name, phone]
        )
        leadIds[name] = l.id
        console.log(`   ✅ Criado: ${name}`)
      }
    }

    // ── 3. Procedimentos + Agendamentos ───────────────────────────────
    const procCache = {} // "nome:duração" → id
    let inserted = 0, skipped = 0, errors = 0

    console.log('\n📅 Importando agendamentos:')
    for (const row of rows) {
      const [profRaw, dateStr, timeStr, clientRaw, serviceRaw, priceRaw] = row
      const profName = profRaw.trim()
      const clientName = clientRaw.trim()
      const serviceName = serviceRaw.trim()

      const profId = profIds[profName]
      const leadId = leadIds[clientName]

      let parsed
      try {
        parsed = parseTime(timeStr)
      } catch {
        console.log(`   ❌ Horário inválido: "${timeStr}" — linha ignorada`)
        errors++
        continue
      }
      const { start, durationMin } = parsed
      const date = parseDate(dateStr)

      // Procedimento: busca por nome+duração, cria se não existe
      const procKey = `${serviceName}:${durationMin}`
      if (!procCache[procKey]) {
        const { rows: ex } = await client.query(
          'SELECT id FROM procedures WHERE clinic_id=$1 AND name=$2 AND duration=$3',
          [clinicId, serviceName, durationMin]
        )
        if (ex.length) {
          procCache[procKey] = ex[0].id
        } else {
          const priceReais = typeof priceRaw === 'number' ? priceRaw : 0
          const { rows: [proc] } = await client.query(
            `INSERT INTO procedures (clinic_id, name, duration, price, active)
             VALUES ($1, $2, $3, $4, false) RETURNING id`,
            [clinicId, serviceName, durationMin, Math.round(priceReais * 100)]
          )
          procCache[procKey] = proc.id
          console.log(`   🔧 Procedimento criado: "${serviceName}" ${durationMin}min`)
        }
      }
      const procId = procCache[procKey]

      // Agendamento: verifica duplicata por (clinic, professional, scheduled_at)
      const scheduledAt = new Date(`${date}T${start}:00-03:00`)
      const { rows: ex } = await client.query(
        'SELECT id FROM appointments WHERE clinic_id=$1 AND professional_id=$2 AND scheduled_at=$3',
        [clinicId, profId, scheduledAt]
      )
      if (ex.length) {
        console.log(`   ↩️  Já existe: ${date} ${start} — ${profName}`)
        skipped++
        continue
      }

      await client.query(
        `INSERT INTO appointments
           (clinic_id, lead_id, procedure_id, scheduled_at, status, source, professional_id, notes)
         VALUES ($1, $2, $3, $4, 'confirmed', 'imported', $5, $6)`,
        [
          clinicId, leadId, procId, scheduledAt, profId,
          `Importado: ${clientName} — ${serviceName}`,
        ]
      )
      console.log(`   📌 ${date} ${start} (${durationMin}min) | ${profName} | ${clientName}`)
      inserted++
    }

    console.log(`
╔══════════════════════════════════════════╗
║  Importação concluída                    ║
╠══════════════════════════════════════════╣
║  ✅ Criados:    ${String(inserted).padEnd(26)}║
║  ↩️  Ignorados: ${String(skipped).padEnd(26)}║
║  ❌ Erros:      ${String(errors).padEnd(26)}║
╚══════════════════════════════════════════╝`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
