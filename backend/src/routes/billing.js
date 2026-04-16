const express = require('express')
const Stripe = require('stripe')
const { query } = require('../db')
const { getEffectiveClinicId } = require('../lib/tenant')
const { sendWelcomeEmail } = require('./email')

const router = express.Router()
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

router.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null })
})

router.get('/status', async (req, res) => {
  const clinicId = await getEffectiveClinicId(req)
  const { rows: [clinic] } = await query(`
    SELECT status, trial_ends_at, stripe_customer_id, stripe_subscription_id
    FROM clinics WHERE id = $1
  `, [clinicId])
  if (!clinic) return res.status(404).json({ error: 'Clinica nao encontrada' })
  const trialDaysLeft = clinic.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(clinic.trial_ends_at) - Date.now()) / 86400000))
    : null
  res.json({ ...clinic, trial_days_left: trialDaysLeft })
})

router.post('/checkout-intent', async (req, res) => {
  const clinicId = await getEffectiveClinicId(req)
  const { rows: [clinic] } = await query('SELECT id, name, stripe_customer_id FROM clinics WHERE id = $1', [clinicId])
  if (!clinic) return res.status(404).json({ error: 'Clinica nao encontrada' })
  if (!stripe) return res.status(503).json({ error: 'Stripe nao configurado' })

  let customerId = clinic.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ name: clinic.name, metadata: { clinic_id: clinic.id } })
    customerId = customer.id
    await query('UPDATE clinics SET stripe_customer_id = $1 WHERE id = $2', [customerId, clinic.id])
  }

  const intent = await stripe.paymentIntents.create({
    amount: 100,
    currency: 'brl',
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { clinic_id: clinic.id, kind: 'trial_activation' },
  })
  res.json({ clientSecret: intent.client_secret })
})

async function createPortalSession(req, res) {
  const clinicId = await getEffectiveClinicId(req)
  const { rows: [clinic] } = await query('SELECT stripe_customer_id FROM clinics WHERE id = $1', [clinicId])
  if (!clinic?.stripe_customer_id) return res.status(400).json({ error: 'Cliente Stripe ausente' })
  if (!stripe) return res.status(503).json({ error: 'Stripe nao configurado' })
  const origin = req.headers.origin || process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  const session = await stripe.billingPortal.sessions.create({
    customer: clinic.stripe_customer_id,
    return_url: `${origin}/painel`,
  })
  res.json({ url: session.url })
}

router.get('/portal', createPortalSession)
router.post('/portal', createPortalSession)

async function logStripeEvent(event, clinicId, processed) {
  await query(`
    INSERT INTO stripe_events (event_id, type, clinic_id, payload, processed)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (event_id) DO NOTHING
  `, [event.id, event.type, clinicId || null, JSON.stringify(event), processed])
}

router.post('/stripe/webhook', async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook nao configurado' })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody || JSON.stringify(req.body),
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).json({ error: `Webhook invalido: ${err.message}` })
  }

  const object = event.data.object
  const clinicId = object.metadata?.clinic_id || null
  const existing = await query('SELECT id FROM stripe_events WHERE event_id = $1', [event.id])
  if (existing.rows.length) return res.json({ received: true, duplicate: true })

  if (event.type === 'payment_intent.succeeded' && clinicId) {
    await query(`
      UPDATE clinics
      SET status = 'trial', trial_ends_at = NOW() + INTERVAL '30 days', stripe_customer_id = COALESCE(stripe_customer_id, $2)
      WHERE id = $1
    `, [clinicId, object.customer || null])
    if (process.env.STRIPE_MONTHLY_PRICE_ID && object.customer) {
      const subscription = await stripe.subscriptions.create({
        customer: object.customer,
        items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID }],
        trial_period_days: 30,
        metadata: { clinic_id: clinicId },
      })
      await query('UPDATE clinics SET stripe_subscription_id = $1 WHERE id = $2', [subscription.id, clinicId])
    }
    const { rows: [welcome] } = await query(`
      SELECT c.name, c.slug, u.email
      FROM clinics c
      JOIN users u ON u.clinic_id = c.id AND u.role = 'admin'
      WHERE c.id = $1
      ORDER BY u.created_at ASC
      LIMIT 1
    `, [clinicId])
    if (welcome) {
      const origin = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
      await sendWelcomeEmail({ to: welcome.email, clinicName: welcome.name, slug: welcome.slug, origin }).catch(err => console.warn(err.message))
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    await query(`
      UPDATE clinics SET status = 'active'
      WHERE stripe_customer_id = $1 OR stripe_subscription_id = $2
    `, [object.customer, object.subscription])
  }

  if (event.type === 'invoice.payment_failed') {
    await query(`
      UPDATE clinics SET status = 'suspended'
      WHERE (stripe_customer_id = $1 OR stripe_subscription_id = $2)
        AND COALESCE($3, 0) >= 3
    `, [object.customer, object.subscription, object.attempt_count || 0])
  }

  if (event.type === 'customer.subscription.deleted') {
    await query('UPDATE clinics SET status = $1 WHERE stripe_subscription_id = $2', ['cancelled', object.id])
  }

  await logStripeEvent(event, clinicId, true)
  res.json({ received: true })
})

module.exports = router
