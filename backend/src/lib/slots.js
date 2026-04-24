const db = require('../db')

/**
 * Retorna os slots disponíveis para um procedimento em um dia específico.
 *
 * Regra central: um slot está disponível (taken: false) se pelo menos
 * 1 profissional ativo vinculado ao procedimento estiver livre durante
 * todo o intervalo [slotStart, slotEnd).
 *
 * Se nenhum profissional está vinculado ao procedimento → todos os slots
 * aparecem como taken (procedimento sem executor não pode ser agendado).
 */
async function computeSlots(clinicId, date, procedureId) {
  const d = new Date(date)
  const dayOfWeek = d.getDay()

  const { rows: [hours] } = await db.query(
    'SELECT * FROM business_hours WHERE clinic_id=$1 AND day_of_week=$2',
    [clinicId, dayOfWeek]
  )
  if (!hours || !hours.open) return { slots: [], reason: 'closed' }

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

  // Sem profissionais vinculados → fallback para bloqueio por clínica (compatibilidade)
  const useProfessionalLogic = professionalIds.length > 0

  // Agendamentos do dia (por profissional ou por clínica no fallback)
  const bookedByProfessional = {}
  let bookedClinic = []

  if (useProfessionalLogic) {
    const { rows: booked } = await db.query(`
      SELECT a.professional_id, a.scheduled_at, p.duration
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = $1
        AND a.professional_id = ANY($2::uuid[])
        AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $3
        AND a.status != 'cancelled'
    `, [clinicId, professionalIds, date])

    for (const b of booked) {
      if (!bookedByProfessional[b.professional_id]) bookedByProfessional[b.professional_id] = []
      bookedByProfessional[b.professional_id].push(b)
    }
  } else {
    // Fallback: qualquer agendamento da clínica bloqueia o horário
    const { rows } = await db.query(`
      SELECT a.scheduled_at, p.duration
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.clinic_id = $1
        AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $2
        AND a.status != 'cancelled'
    `, [clinicId, date])
    bookedClinic = rows
  }

  // Gera candidatos a cada 30 min dentro do horário de funcionamento
  const slots = []
  const [sh, sm] = hours.start_time.split(':').map(Number)
  const [eh, em] = hours.end_time.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em

  while (cur + duration <= end) {
    const hh = String(Math.floor(cur / 60)).padStart(2, '0')
    const mm = String(cur % 60).padStart(2, '0')
    const slotStart = new Date(`${date}T${hh}:${mm}:00-03:00`)
    const slotEnd = new Date(slotStart.getTime() + duration * 60000)

    let taken
    if (useProfessionalLogic) {
      // Disponível se ao menos 1 profissional estiver livre no intervalo inteiro
      const atLeastOneFree = professionalIds.some(profId => {
        const profBooked = bookedByProfessional[profId] || []
        return !profBooked.some(b => {
          const bs = new Date(b.scheduled_at)
          const be = new Date(bs.getTime() + b.duration * 60000)
          return slotStart < be && slotEnd > bs
        })
      })
      taken = !atLeastOneFree
    } else {
      // Fallback: slot ocupado se houver qualquer agendamento conflitante na clínica
      taken = bookedClinic.some(b => {
        const bs = new Date(b.scheduled_at)
        const be = new Date(bs.getTime() + b.duration * 60000)
        return slotStart < be && slotEnd > bs
      })
    }

    slots.push({ time: `${hh}:${mm}`, taken })
    cur += 30
  }

  return { slots }
}

/**
 * Encontra o primeiro profissional ativo vinculado ao procedimento
 * que esteja livre para o horário scheduledAt (considerando a duração).
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
  const date = slotStart.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const { rows: booked } = await db.query(`
    SELECT a.professional_id, a.scheduled_at, p.duration
    FROM appointments a
    JOIN procedures p ON a.procedure_id = p.id
    WHERE a.clinic_id = $1
      AND a.professional_id = ANY($2::uuid[])
      AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $3
      AND a.status != 'cancelled'
  `, [clinicId, professionalIds, date])

  const bookedByProfessional = {}
  for (const b of booked) {
    if (!bookedByProfessional[b.professional_id]) bookedByProfessional[b.professional_id] = []
    bookedByProfessional[b.professional_id].push(b)
  }

  for (const profId of professionalIds) {
    const profBooked = bookedByProfessional[profId] || []
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
