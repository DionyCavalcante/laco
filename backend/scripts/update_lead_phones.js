/**
 * update_lead_phones.js
 *
 * Atualiza os telefones dos leads importados com os números reais
 * da base de clientes. Normaliza para formato WhatsApp (55 + DDD + número).
 *
 * Uso: cd backend && node scripts/update_lead_phones.js
 */

require('dotenv').config()
const XLSX = require('xlsx')
const { Pool } = require('pg')
const path = require('path')

const AGENDA_PATH = path.join(__dirname, '../../RelatorioAgendamentos_De30-04-2026Ate31-05-2026_GeradoAs30-04-26_13_41_25.xlsx')
const BASE_PATH   = path.join(__dirname, '../../BaseDeClientes_GeradoAs30-04-26_15_39_46.xlsx')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Normaliza para formato WhatsApp: 55 + DDD + número (sem espaços/traços)
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return '55' + digits
}

// Telefone fictício gerado na importação anterior (mesmo algoritmo do import_agenda.js)
function fakePhone(name) {
  let h = 5381
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h) + name.charCodeAt(i)
    h &= 0x7fffffff
  }
  return `99${String(h % 1000000000).padStart(9, '0')}`
}

async function main() {
  // Lê base de clientes: nome → telefone real
  const wb1 = XLSX.readFile(BASE_PATH)
  const baseRows = XLSX.utils.sheet_to_json(wb1.Sheets['data'], { header: 1 }).slice(1)
  const phoneByName = {}
  for (const row of baseRows) {
    if (row[0] && row[1]) {
      phoneByName[String(row[0]).trim().toLowerCase()] = normalizePhone(row[1])
    }
  }

  // Lê nomes únicos da agenda
  const wb2 = XLSX.readFile(AGENDA_PATH)
  const agendaRows = XLSX.utils.sheet_to_json(wb2.Sheets['data'], { header: 1 }).slice(1)
  const agendaNames = [...new Set(agendaRows.map(r => String(r[3]).trim()))]

  const client = await pool.connect()
  try {
    const { rows: [clinic] } = await client.query('SELECT id, name FROM clinics LIMIT 1')
    const clinicId = clinic.id
    console.log(`🏥 Clínica: ${clinic.name}\n`)

    let updated = 0, conflict = 0, notFound = 0

    for (const nome of agendaNames) {
      const realPhone = phoneByName[nome.toLowerCase()]
      if (!realPhone) {
        console.log(`❌ Sem telefone na base: "${nome}"`)
        notFound++
        continue
      }

      const fakeP = fakePhone(nome)

      // Busca o lead pelo telefone fictício
      const { rows: leads } = await client.query(
        'SELECT id, name, phone FROM leads WHERE clinic_id=$1 AND phone=$2',
        [clinicId, fakeP]
      )
      if (!leads.length) {
        // Talvez já tenha sido atualizado antes — verifica pelo telefone real
        const { rows: byReal } = await client.query(
          'SELECT id, name, phone FROM leads WHERE clinic_id=$1 AND phone=$2',
          [clinicId, realPhone]
        )
        if (byReal.length) {
          console.log(`↩️  Já atualizado: ${nome} → ${realPhone}`)
          updated++ // conta como OK
        } else {
          console.log(`⚠️  Lead não encontrado: "${nome}" (fake: ${fakeP})`)
          notFound++
        }
        continue
      }

      const lead = leads[0]

      // Verifica se o telefone real já está em uso por outro lead
      const { rows: conflict_rows } = await client.query(
        'SELECT id, name FROM leads WHERE clinic_id=$1 AND phone=$2 AND id != $3',
        [clinicId, realPhone, lead.id]
      )
      if (conflict_rows.length) {
        console.log(`⚡ Conflito: "${nome}" → ${realPhone} já pertence a "${conflict_rows[0].name}"`)
        conflict++
        continue
      }

      // Atualiza
      await client.query(
        'UPDATE leads SET phone=$1, updated_at=NOW() WHERE id=$2',
        [realPhone, lead.id]
      )
      console.log(`✅ ${nome.padEnd(35)} ${fakeP} → ${realPhone}`)
      updated++
    }

    console.log(`
╔══════════════════════════════════════════╗
║  Atualização concluída                   ║
╠══════════════════════════════════════════╣
║  ✅ Atualizados:  ${String(updated).padEnd(24)}║
║  ⚡ Conflitos:    ${String(conflict).padEnd(24)}║
║  ❌ Não achados:  ${String(notFound).padEnd(24)}║
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
