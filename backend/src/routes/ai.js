const express = require('express')
const router = express.Router()
const OpenAI = require('openai')

function cleanStepText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*]\s*/, '')
    .trim()
}

function normalizeHowItWorks(raw) {
  if (!raw) return raw

  const rawSteps = Array.isArray(raw) ? raw : Array.isArray(raw.steps) ? raw.steps : null
  if (rawSteps) {
    const steps = rawSteps
      .slice(0, 3)
      .map((step, index) => {
        if (typeof step === 'string') {
          const [title, ...descParts] = step.split(/\n| - |: /).map(cleanStepText).filter(Boolean)
          return { title, desc: cleanStepText(descParts.join(' ')) }
        }

        return {
          title: cleanStepText(step.title ?? step.titulo ?? step.name ?? step.nome ?? `Etapa ${index + 1}`),
          desc: cleanStepText(step.description ?? step.descricao ?? step.desc ?? step.text ?? ''),
        }
      })

    if (steps.length === 3) {
      return steps
        .map((step, index) => `${index + 1}\n${step.title || `Etapa ${index + 1}`}\n${step.desc || 'Voce recebe orientacao clara sobre esta etapa do procedimento.'}`)
        .join('\n\n')
    }
  }

  if (typeof raw === 'object') return ''

  const text = String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/^\s*(?:passo\s*)?([1-3])[.)]\s+(.+)$/gim, '$1\n$2')

  const steps = []
  let current = null

  for (const line of text.split('\n').map((item) => item.trim()).filter(Boolean)) {
    const numberOnly = line.match(/^(?:passo\s*)?([1-3])[.)]?$/i)
    const numberedLine = line.match(/^(?:passo\s*)?([1-3])[.)]?\s+(.+)$/i)

    if (numberOnly || numberedLine) {
      if (current) steps.push(current)
      current = { num: numberOnly?.[1] || numberedLine?.[1], lines: [] }
      if (numberedLine?.[2]) current.lines.push(numberedLine[2])
      continue
    }

    if (current) current.lines.push(line)
  }

  if (current) steps.push(current)
  if (steps.length !== 3) return raw

  return steps
    .map((step, index) => {
      let [title, ...descParts] = step.lines.map(cleanStepText).filter(Boolean)
      let desc = cleanStepText(descParts.join(' '))

      if (!desc && title) {
        const splitTitle = title.match(/^(.+?)(?:\s+-\s+|\s+:\s+)(.+)$/)
        if (splitTitle) {
          title = cleanStepText(splitTitle[1])
          desc = cleanStepText(splitTitle[2])
        }
      }

      return `${index + 1}\n${title || `Etapa ${index + 1}`}\n${desc || 'Voce recebe orientacao clara sobre esta etapa do procedimento.'}`
    })
    .join('\n\n')
}

function normalizeText(value) {
  if (value == null) return ''
  return String(value).trim()
}

// POST /api/ai/generate-page - gera conteudo da pagina do procedimento
router.post('/generate-page', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY nao configurada no servidor.' })
  }

  const { name, subheadline, description, clinicName, durationMin, context } = req.body
  if (!name) return res.status(400).json({ error: 'Campo "name" obrigatorio.' })

  const clinic = clinicName || 'a clinica'
  const dur = durationMin ? `${durationMin} minutos` : null

  const prompt = `Voce e especialista em copy para clinicas de estetica premium. Gere conteudo para a pagina de um procedimento seguindo as diretrizes abaixo com rigor.

PROCEDIMENTO: "${name}"
${subheadline ? `SUBTITULO ATUAL: "${subheadline}"` : ''}
${description ? `DESCRICAO: "${description}"` : ''}
CLINICA: ${clinic}
${dur ? `DURACAO: ${dur}` : ''}
${context ? `\nINSUMOS DA PROFISSIONAL (use como base prioritaria para o conteudo - linguagem, diferenciais, tecnica, observacoes):
"""
${context}
"""
Extraia dessas informacoes os pontos mais relevantes: diferenciais da tecnica, cuidados especificos, tom de comunicacao, nomenclaturas usadas pela profissional.` : ''}

---

REGRAS DE COPY (obrigatorias):

1. TOM: a clinica fala com a cliente. Conversa premium, acolhedora, honesta. Nunca slogan de marca, nunca promessa absoluta.

2. HEADLINE:
   - Modelo base: "Veja como [procedimento] pode [beneficio pessoal]" adaptado criativamente
   - Usa o nome do procedimento naturalmente
   - Maximo 12 palavras
   - Nao terminar com "!"

3. PALAVRAS PROIBIDAS:
   "resultado garantido", "sem dor", "sem risco", "seguranca maxima", "recuperacao imediata", "100%", "perfeito", "perfeicao", "incrivel", "revolucionario"

4. PALAVRAS PREFERIDAS:
   "pode variar", "avaliacao individual", "respeitando", "o efeito que combina com voce", "naturalidade", "o que combina com a sua rotina"

5. TAMANHO: mobile-first. Nenhum campo com mais de 3 linhas de texto no celular.

6. subheadline: complementar a headline com 1 ou 2 frases curtas. Mostrar naturalidade, resultado esperado e contexto real. Sem "!".

7. authorityNote: mencionar a clinica (${clinic}) naturalmente. Tom: como se a profissional estivesse falando na recepcao, nao como slogan institucional.

8. benefit1Title, benefit1Desc, benefit2Title, benefit2Desc, benefit3Title, benefit3Desc:
   - representam os 3 beneficios principais da pagina
   - cada title com no maximo 5 palavras
   - cada desc com 1 frase curta, concreta, sem exagero

9. mainPain: listar 2 ou 3 dores ou incomodos reais em blocos separados por linha em branco. Cada bloco com 1 frase.

10. emotionalDesire: 1 frase curta sobre como a cliente quer se sentir.

11. dayToDayFit: 1 frase curta explicando como o procedimento combina com a rotina da cliente.

12. howItWorks: descreve o processo em EXATAMENTE 3 passos numerados. O valor deve ser uma STRING, nunca array ou objeto. Formato obrigatorio:
   "1\nTitulo curto do passo\nDescricao em 1 frase\n\n2\nTitulo curto do passo\nDescricao em 1 frase\n\n3\nTitulo curto do passo\nDescricao em 1 frase"

13. faqSessionDuration: responder objetivamente quanto tempo leva a sessao.

14. faqResultDuration: responder quanto tempo o resultado costuma durar, sem prometer absoluto.

15. faqPainDiscomfort: responder de forma honesta sobre dor, sensibilidade ou desconforto.

16. faqMaintenance: responder se existe manutencao e em que ritmo costuma fazer sentido.

17. faqAftercare: lista de cuidados reais e especificos para este procedimento, 3 a 5 itens, cada um em uma linha comecando com "- ".

18. closingNote: ultima frase antes do preco. Reduz a ultima friccao ("e se nao for para mim?"). Sem "!". Tom leve, como conversa.

---

Retorne APENAS um JSON valido com exatamente estas chaves:
{
  "headline": "...",
  "subheadline": "...",
  "benefit1Title": "...",
  "benefit1Desc": "...",
  "benefit2Title": "...",
  "benefit2Desc": "...",
  "benefit3Title": "...",
  "benefit3Desc": "...",
  "mainPain": "...",
  "emotionalDesire": "...",
  "dayToDayFit": "...",
  "howItWorks": "...",
  "authorityNote": "...",
  "faqSessionDuration": "...",
  "faqResultDuration": "...",
  "faqPainDiscomfort": "...",
  "faqMaintenance": "...",
  "faqAftercare": "...",
  "closingNote": "..."
}`

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }, { timeout: 30000 })

    const data = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

    data.headline = normalizeText(data.headline)
    data.subheadline = normalizeText(data.subheadline)
    data.benefit1Title = normalizeText(data.benefit1Title)
    data.benefit1Desc = normalizeText(data.benefit1Desc)
    data.benefit2Title = normalizeText(data.benefit2Title)
    data.benefit2Desc = normalizeText(data.benefit2Desc)
    data.benefit3Title = normalizeText(data.benefit3Title)
    data.benefit3Desc = normalizeText(data.benefit3Desc)
    data.mainPain = normalizeText(data.mainPain)
    data.emotionalDesire = normalizeText(data.emotionalDesire)
    data.dayToDayFit = normalizeText(data.dayToDayFit)
    data.howItWorks = normalizeHowItWorks(data.howItWorks)
    data.authorityNote = normalizeText(data.authorityNote)
    data.faqSessionDuration = normalizeText(data.faqSessionDuration)
    data.faqResultDuration = normalizeText(data.faqResultDuration)
    data.faqPainDiscomfort = normalizeText(data.faqPainDiscomfort)
    data.faqMaintenance = normalizeText(data.faqMaintenance)
    data.faqAftercare = normalizeText(data.faqAftercare)
    data.closingNote = normalizeText(data.closingNote)

    res.json(data)
  } catch (err) {
    console.error('AI generate-page error:', err.message)
    const msg = err.message?.includes('timeout')
      ? 'Nao foi possivel gerar o conteudo. Tente novamente.'
      : err.message || 'Erro ao gerar conteudo.'
    res.status(500).json({ error: msg })
  }
})

module.exports = router
