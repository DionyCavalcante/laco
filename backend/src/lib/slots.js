const db = require('../db')

/**
 * Busca os horários de um profissional para um dia da semana.
 * Fallback para business_hours da clínica se não houver registro.
 */
async function getProfessionalDayHours(professionalId, clinicId, dayOfWeek) {
  const { rows: [ph] } = await db.query(
    'SELECT * FROM professional_hours WHERE professional_id=$1 AND day_of_week=$2',
    [professionalId, dayOfWeek]
  )
  if (ph) return ph
  // Fallback: usa horário da clínica
  const { rows: [bh] } = await db.query(
    'SELECT * FROM business_hours WHERE clinic_id=$1 AND day_of_week=$2',
    [clinicId, dayOfWeek]
  )
  return bh || null
}

function getSaoPauloDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: weekdayMap[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

/**
 * Retorna os slots disponíveis para um procedimento em um dia específico.
 *
 * Regra central: um slot está disponível (taken: false) se pelo menos
 * 1 profissional ativo vinculado ao procedimento:
 *   - trabalha naquele dia (open=true no horário dele ou da clínica)
 *   - tem o slot dentro do seu intervalo de horário
 *   - está livre (sem agendamento conflitante)
 *
 * Se nenhum profissional está vinculado → fallback por clínica (compatibilidade).
 */
async function computeSlots(clinicId, date, procedureId) {
  const d = new Date(date)
  const dayOfWeek = d.getDay()

  // Horário da clínica — usado como referência para "a clínica está aberta hoje?"
  const { rows: [clinicHours] } = await db.query(
    'SELECT * FROM business_hours WHERE clinic_id=$1 AND day_of_week=$2',
    [clinicId, dayOfWeek]
  )
  if (!clinicHours || !clinicHours.open) return { slots: [], reason: 'closed' }

  // Duração do procedimento (padrão 60 min se não informado)
  let duration = 60
  if (procedureId) {
    const { rows: [proc] } = await db.query(
      'SELECT duration FROM procedures WHERE id=$1', [procedureId]
    )
    if (proc) duration = proc.duration
  }

  // Profissionais ativos vinculados a este procedimento
  let professionalIds = []
  if (procedureId) {
    const { rows } = await db.query(`
      SELECT pp.professional_id
      FROM procedure_professionals pp
      JOIN professionals pf ON pf.id = pp.professional_id
      WHERE pp.procedure_id = $1 AND pf.active = true
    `, [procedureId])
    professionalIds = rows.map(r => r.professional_id)
  }

  // Sem profissionais → fallback para bloqueio por clínica (compatibilidade)
  const useProfessionalLogic = professionalIds.length > 0

  if (!useProfessionalLogic) {
    // Fallback: qualquer agendamento da clínica bloqueia o horário
    const { rows: bookedClinic } = await db.query(`
      SELECT a.scheduled_at, p.duration
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = $1
        AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $2
        AND a.status != 'cancelled'
    `, [clinicId, date])

    const slots = []
    const [sh, sm] = clinicHours.start_time.split(':').map(Number)
    const [eh, em] = clinicHours.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em

    const step = 10
    while (cur + duration <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0')
      const mm = String(cur % 60).padStart(2, '0')
      const slotStart = new Date(`${date}T${hh}:${mm}:00-03:00`)
      const slotEnd = new Date(slotStart.getTime() + duration * 60000)
      const taken = bookedClinic.some(b => {
        const bs = new Date(b.scheduled_at)
        const be = new Date(bs.getTime() + b.duration * 60000)
        return slotStart < be && slotEnd > bs
      })
      slots.push({ time: `${hh}:${mm}`, taken })
      cur += step
    }
    return { slots }
  }

  // --- Lógica por profissional ---

  // Horários individuais de cada profissional para este dia
  const profHours = {}
  for (const profId of professionalIds) {
    profHours[profId] = await getProfessionalDayHours(profId, clinicId, dayOfWeek)
  }

  // Agendamentos do dia agrupados por profissional
  const { rows: booked } = await db.query(`
    SELECT a.professional_id, a.scheduled_at, p.duration
    FROM appointments a
    JOIN procedures p ON a.procedure_id = p.id
    WHERE a.clinic_id = $1
      AND (a.professional_id = ANY($2::uuid[]) OR a.professional_id IS NULL)
      AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $3
      AND a.status != 'cancelled'
  `, [clinicId, professionalIds, date])

  const bookedByProfessional = {}
  const bookedWithoutProfessional = []
  for (const b of booked) {
    if (!b.professional_id) {
      bookedWithoutProfessional.push(b)
      continue
    }
    if (!bookedByProfessional[b.professional_id]) bookedByProfessional[b.professional_id] = []
    bookedByProfessional[b.professional_id].push(b)
  }

  // Range geral de slots: usa o horário mais amplo entre todos os profissionais disponíveis no dia
  // para não deixar de exibir slots válidos. A checagem individual filtra por fora.
  const [sh, sm] = clinicHours.start_time.split(':').map(Number)
  const [eh, em] = clinicHours.end_time.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em

  const step = 10
  const slots = []
  while (cur + duration <= end) {
    const hh = String(Math.floor(cur / 60)).padStart(2, '0')
    const mm = String(cur % 60).padStart(2, '0')
    const slotStart = new Date(`${date}T${hh}:${mm}:00-03:00`)
    const slotEnd = new Date(slotStart.getTime() + duration * 60000)

    // Disponível se ao menos 1 profissional:
    // 1. trabalha neste dia (open=true)
    // 2. slot cabe dentro do horário DELE
    // 3. está livre (sem conflito de agenda)
    const atLeastOneFree = professionalIds.some(profId => {
      const ph = profHours[profId]
      if (!ph || !ph.open) return false

      const [psh, psm] = ph.start_time.split(':').map(Number)
      const [peh, pem] = ph.end_time.split(':').map(Number)
      const profStart = psh * 60 + psm
      const profEnd = peh * 60 + pem
      const slotMinStart = cur
      const slotMinEnd = cur + duration

      if (slotMinStart < profStart || slotMinEnd > profEnd) return false

      const profBooked = [...bookedWithoutProfessional, ...(bookedByProfessional[profId] || [])]
      return !profBooked.some(b => {
        const bs = new Date(b.scheduled_at)
        const be = new Date(bs.getTime() + b.duration * 60000)
        return slotStart < be && slotEnd > bs
      })
    })

    slots.push({ time: `${hh}:${mm}`, taken: !atLeastOneFree })
    cur += step
  }

  return { slots }
}

/**
 * Encontra o primeiro profissional ativo vinculado ao procedimento
 * que trabalha no dia e está livre no horário scheduledAt.
 * Retorna o UUID do profissional ou null se nenhum disponível.
 */
async function findAvailableProfessional(clinicId, procedureId, scheduledAt, duration) {
  const { rows } = await db.query(`
    SELECT pp.professional_id
    FROM procedure_professionals pp
    JOIN professionals pf ON pf.id = pp.professional_id
    WHERE pp.procedure_id = $1 AND pf.active = true
  `, [procedureId])

  const professionalIds = rows.map(r => r.professional_id)
  if (!professionalIds.length) return null

  const slotStart = new Date(scheduledAt)
  const slotEnd = new Date(slotStart.getTime() + duration * 60000)
  const { date, dayOfWeek, minutes: slotMin } = getSaoPauloDateParts(slotStart)
  const slotMinEnd = slotMin + duration

  const { rows: booked } = await db.query(`
    SELECT a.professional_id, a.scheduled_at, p.duration
    FROM appointments a
    JOIN procedures p ON a.procedure_id = p.id
    WHERE a.clinic_id = $1
      AND (a.professional_id = ANY($2::uuid[]) OR a.professional_id IS NULL)
      AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $3
      AND a.status != 'cancelled'
  `, [clinicId, professionalIds, date])

  const bookedByProfessional = {}
  const bookedWithoutProfessional = []
  for (const b of booked) {
    if (!b.professional_id) {
      bookedWithoutProfessional.push(b)
      continue
    }
    if (!bookedByProfessional[b.professional_id]) bookedByProfessional[b.professional_id] = []
    bookedByProfessional[b.professional_id].push(b)
  }

  for (const profId of professionalIds) {
    const ph = await getProfessionalDayHours(profId, clinicId, dayOfWeek)
    if (!ph || !ph.open) continue

    const [psh, psm] = ph.start_time.split(':').map(Number)
    const [peh, pem] = ph.end_time.split(':').map(Number)
    if (slotMin < psh * 60 + psm || slotMinEnd > peh * 60 + pem) continue

    const profBooked = [...bookedWithoutProfessional, ...(bookedByProfessional[profId] || [])]
    const hasConflict = profBooked.some(b => {
      const bs = new Date(b.scheduled_at)
      const be = new Date(bs.getTime() + b.duration * 60000)
      return slotStart < be && slotEnd > bs
    })
    if (!hasConflict) return profId
  }

  return null
}

module.exports = { computeSlots, findAvailableProfessional }
