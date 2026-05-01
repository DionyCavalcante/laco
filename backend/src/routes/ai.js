const express = require('express')
const router  = express.Router()
const OpenAI  = require('openai')

function cleanStepText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[-•*]\s*/, '')
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
        .map((step, index) => `${index + 1}\n${step.title || `Etapa ${index + 1}`}\n${step.desc || 'Você recebe orientação clara sobre esta etapa do procedimento.'}`)
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

      return `${index + 1}\n${title || `Etapa ${index + 1}`}\n${desc || 'Você recebe orientação clara sobre esta etapa do procedimento.'}`
    })
    .join('\n\n')
}

// POST /api/ai/generate-page — gera conteúdo da página do procedimento
router.post('/generate-page', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' })
  }

  const { name, subheadline, description, clinicName, durationMin, context } = req.body
  if (!name) return res.status(400).json({ error: 'Campo "name" obrigatório.' })

  const clinic = clinicName || 'a clínica'
  const dur    = durationMin ? `${durationMin} minutos` : null

  const prompt = `Você é especialista em copy para clínicas de estética premium. Gere conteúdo para a página de um procedimento seguindo as diretrizes abaixo com rigor.

PROCEDIMENTO: "${name}"
${subheadline ? `SUBTÍTULO ATUAL: "${subheadline}"` : ''}
${description ? `DESCRIÇÃO: "${description}"` : ''}
CLÍNICA: ${clinic}
${dur ? `DURAÇÃO: ${dur}` : ''}
${context ? `\nINSUMOS DA PROFISSIONAL (use como base prioritária para o conteúdo — linguagem, diferenciais, técnica, observações):
"""
${context}
"""
Extraia dessas informações os pontos mais relevantes: diferenciais da técnica, cuidados específicos, tom de comunicação, nomenclaturas usadas pela profissional.` : ''}

---

REGRAS DE COPY (obrigatórias):

1. TOM: a clínica fala com a cliente. Conversa premium, acolhedora, honesta. Nunca slogan de marca, nunca promessa absoluta.

2. HEADLINE — regras específicas:
   - Modelo base: "Veja como [procedimento] pode [benefício pessoal]" — adaptado criativamente
   - Deve fazer a leitora parar de rolar. É o maior peso visual da página.
   - Usa o nome do procedimento naturalmente na frase
   - Foca em "realçar", "definir", "revelar", "valorizar" — nunca "transformar completamente" ou "perfeição"
   - Máximo 12 palavras
   - NÃO terminar com "!"

3. PALAVRAS PROIBIDAS em qualquer campo:
   "resultado garantido", "sem dor", "sem risco", "segurança máxima", "recuperação imediata", "100%", "perfeito", "perfeição", "incrível", "revolucionário"

4. PALAVRAS PREFERIDAS:
   "pode variar", "avaliação individual", "respeitando", "o efeito que combina com você", "naturalidade", "o que combina com a sua rotina"

5. TAMANHO: mobile-first. Nenhum campo com mais de 3 linhas de texto no celular.

6. authorityNote: mencionar a clínica (${clinic}) naturalmente. Tom: como se a profissional estivesse falando na recepção, não como slogan institucional.

7. howItWorks: descreve o processo em EXATAMENTE 3 passos numerados. O valor de "howItWorks" deve ser uma STRING, nunca array ou objeto. Não use Markdown, bullets, "Passo 1" nem texto antes/depois. Formato obrigatório (cada passo separado por uma linha em branco):
   "1\nTítulo curto do passo\nDescrição em 1 frase\n\n2\nTítulo curto do passo\nDescrição em 1 frase\n\n3\nTítulo curto do passo\nDescrição em 1 frase"
   Exemplo: "1\nAvaliação personalizada\nEntendemos o que realmente valoriza o seu rosto.\n\n2\nAplicação com técnica\nRespeitamos sua estrutura natural com precisão.\n\n3\nOrientação final\nVocê sai sabendo exatamente como manter no dia a dia."
   Tom transparente, elimina insegurança.

8. faqAftercare: lista de cuidados reais e específicos para este procedimento, 3–5 itens, cada um em uma linha começando com "- "

9. closingNote: última frase antes do preço. Reduz a última fricção ("e se não for para mim?"). Sem "!". Tom leve, como conversa.

---

Retorne APENAS um JSON válido com exatamente estas chaves:
{
  "headline": "...",
  "howItWorks": "...",
  "authorityNote": "...",
  "faqSessionDuration": "...",
  "faqPainDiscomfort": "...",
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
    data.howItWorks = normalizeHowItWorks(data.howItWorks)
    res.json(data)
  } catch (err) {
    console.error('AI generate-page error:', err.message)
    const msg = err.message?.includes('timeout')
      ? 'Não foi possível gerar o conteúdo. Tente novamente.'
      : err.message || 'Erro ao gerar conteúdo.'
    res.status(500).json({ error: msg })
  }
})

module.exports = router
