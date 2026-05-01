const express = require('express')
const router  = express.Router()
const OpenAI  = require('openai')

// POST /api/ai/generate-page — gera conteúdo da página do procedimento
router.post('/generate-page', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' })
  }

  const { name, subheadline } = req.body
  if (!name) return res.status(400).json({ error: 'Campo "name" obrigatório.' })

  const prompt = `Você é especialista em marketing para clínicas de estética. Gere conteúdo para a página de venda do procedimento "${name}"${subheadline ? ` (${subheadline})` : ''}.

Retorne APENAS um JSON válido com exatamente estas chaves:
{
  "headline": "frase de impacto curta (máx 12 palavras) que transmite transformação ou resultado",
  "howItWorks": "descrição direta em 2-3 frases de como funciona o procedimento, linguagem acessível",
  "authorityNote": "nota de autoridade em 2-3 frases destacando expertise, tecnologia ou diferenciais da clínica",
  "faqSessionDuration": "resposta curta sobre duração (ex: '45 a 60 minutos')",
  "faqPainDiscomfort": "resposta curta sobre dor (ex: 'Sensação mínima de formigamento, tolerável')",
  "faqAftercare": "lista de 3 a 5 cuidados pós-procedimento, um por linha, começando com -",
  "closingNote": "frase motivacional curta de fechamento (máx 10 palavras)"
}

Use linguagem feminina, sofisticada e acolhedora. Evite termos médicos complexos.`

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })
    const data = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    res.json(data)
  } catch (err) {
    console.error('AI generate-page error:', err.message)
    res.status(500).json({ error: err.message || 'Erro ao gerar conteúdo.' })
  }
})

module.exports = router
