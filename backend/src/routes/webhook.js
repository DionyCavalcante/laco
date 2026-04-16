const express = require('express')
const router = express.Router()
const db = require('../db')

/*
  Webhook da Evolution API
  Configure na Evolution: POST https://sua-api.com/webhook/evolution

  Eventos esperados:
  - messages.upsert  → nova mensagem recebida
  - connection.update → status da conexão

  Fluxo do agente:
  1. Mensagem chega
  2. Se número não existe como lead → cria lead com status 'new'
  3. Agente responde com o link de agendamento
  4. Atualiza status para 'link_sent'

  A lógica de resposta automática fica na Evolution (fluxo de automação).
  Aqui só registramos o lead e logamos o payload.
*/
router.post('/evolution', async (req, res) => {
  try {
    const payload = req.body

    // Loga tudo para debug
    await db.query(
      'INSERT INTO webhook_log (payload) VALUES ($1)',
      [JSON.stringify(payload)]
    )

    // Extrai evento
    const event = payload.event || payload.type
    if (!event || !event.includes('messages')) {
      return res.json({ ok: true, action: 'ignored' })
    }

    // Extrai dados da mensagem
    const msg = payload.data?.message || payload.message
    const from = payload.data?.key?.remoteJid || payload.from || ''
    const pushName = payload.data?.pushName || payload.pushName || ''

    if (!from || from.includes('@g.us')) {
      // Ignora grupos
      return res.json({ ok: true, action: 'ignored_group' })
    }

    // Normaliza telefone — remove @s.whatsapp.net e não-dígitos
    const phone = from.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const name = pushName || 'Lead WhatsApp'

    const clinicSlug = payload.clinic_slug || payload.instance?.clinic_slug || process.env.WEBHOOK_DEFAULT_CLINIC_SLUG || process.env.CLINIC_SLUG
    if (!clinicSlug) return res.json({ ok: true, action: 'missing_clinic_slug' })
    const { rows: [clinic] } = await db.query(
      'SELECT id FROM clinics WHERE slug=$1', [clinicSlug]
    )
    if (!clinic) return res.json({ ok: true, action: 'no_clinic' })

    // Cria lead se não existir
    const { rows: [existing] } = await db.query(
      'SELECT id, status FROM leads WHERE clinic_id=$1 AND phone=$2',
      [clinic.id, phone]
    )

    if (!existing) {
      await db.query(`
        INSERT INTO leads (clinic_id, name, phone, source, status)
        VALUES ($1, $2, $3, 'whatsapp', 'new')
      `, [clinic.id, name, phone])
    }

    // Marca como link_sent quando a Evolution confirmar envio do link
    // (você pode chamar PATCH /api/leads/:id/status manualmente ou via automação)

    res.json({ ok: true, action: 'lead_created_or_existing', phone })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Erro no webhook' })
  }
})

module.exports = router
