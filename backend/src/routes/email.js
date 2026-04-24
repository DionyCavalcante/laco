async function sendWelcomeEmail({ to, clinicName, slug, origin }) {
  if (!process.env.RESEND_API_KEY || !to) return { skipped: true }

  const portalUrl = `${origin}/${slug}/agendar`
  const crmUrl = `${origin}/painel`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Astrai <onboarding@laco.app>',
      to,
      subject: 'Bem-vinda ao Astrai! Seu portal esta quase pronto',
      html: `
        <h1>${clinicName}</h1>
        <p>Seu portal esta quase pronto.</p>
        <p><a href="${portalUrl}">Portal de agendamento</a></p>
        <p><a href="${crmUrl}">Completar configuracao</a></p>
        <p>Compartilhe seu link com clientes agora.</p>
      `,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend falhou: ${body}`)
  }
  return response.json()
}

module.exports = { sendWelcomeEmail }
