const express = require('express')
const { query } = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')

const router = express.Router()

router.get('/', async (req, res) => {
  const clinicId = await getEffectiveClinicId(req)
  const { rows: [clinic] } = await query(`
    SELECT id, name, slug, phone, onboarding_step, onboarding_completed_at
    FROM clinics
    WHERE id = $1
  `, [clinicId])
  if (!clinic) return res.status(404).json({ error: 'Clinica nao encontrada' })
  res.json({ clinic })
})

router.patch('/step', async (req, res) => {
  const clinicId = await getEffectiveClinicId(req)
  const step = Number(req.body.step)
  if (![0, 1, 2, 3, 4].includes(step)) return res.status(400).json({ error: 'Passo invalido' })
  const { rows: [clinic] } = await query(`
    UPDATE clinics
    SET onboarding_step = GREATEST(COALESCE(onboarding_step, 0), $1),
        onboarding_completed_at = CASE WHEN $1 = 4 THEN COALESCE(onboarding_completed_at, NOW()) ELSE onboarding_completed_at END
    WHERE id = $2
    RETURNING id, name, slug, onboarding_step, onboarding_completed_at
  `, [step, clinicId])
  res.json(clinic)
})

router.post('/complete', async (req, res) => {
  const clinicId = await getEffectiveClinicId(req)
  const { rows: [clinic] } = await query(`
    UPDATE clinics
    SET onboarding_step = 4, onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
    WHERE id = $1
    RETURNING id, name, slug, onboarding_step, onboarding_completed_at
  `, [clinicId])
  res.json(clinic)
})

module.exports = router
