require('dotenv').config()
const bcrypt = require('bcryptjs')
const { pool } = require('./index')

const schema = `
-- Clínicas (suporte a multi-tenant futuro)
CREATE TABLE IF NOT EXISTS clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Procedimentos da clínica
CREATE TABLE IF NOT EXISTS procedures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  duration     INTEGER NOT NULL,
  price        INTEGER NOT NULL,
  price_old    INTEGER,
  payment_note TEXT,
  video_url    TEXT,
  images       JSONB DEFAULT '{}',
  reveal_delay INTEGER DEFAULT 5,
  active       BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Leads / clientes captados pelo agente WhatsApp ou manualmente
CREATE TABLE IF NOT EXISTS leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  source       TEXT DEFAULT 'whatsapp', -- 'whatsapp' | 'manual' | 'link'
  status       TEXT DEFAULT 'new',      -- 'new' | 'link_sent' | 'scheduled' | 'rejected'
  reject_reason TEXT,                   -- 'orcamento' | 'outro'
  procedure_viewed UUID REFERENCES procedures(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id),
  procedure_id  UUID REFERENCES procedures(id),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'done' | 'cancelled'
  source        TEXT DEFAULT 'system',  -- 'system' | 'manual'
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Horários de atendimento por dia da semana
CREATE TABLE IF NOT EXISTS business_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Dom, 1=Seg ... 6=Sab
  open        BOOLEAN DEFAULT true,
  start_time  TIME NOT NULL DEFAULT '09:00',
  end_time    TIME NOT NULL DEFAULT '18:00'
);

-- Fotos antes/depois dos procedimentos
CREATE TABLE IF NOT EXISTS procedure_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id  UUID REFERENCES procedures(id) ON DELETE CASCADE,
  side          TEXT NOT NULL CHECK (side IN ('before','after')),
  url           TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_hours DROP CONSTRAINT IF EXISTS bh_clinic_day_unique;
ALTER TABLE business_hours ADD CONSTRAINT bh_clinic_day_unique UNIQUE (clinic_id, day_of_week);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_clinic_phone_unique;
ALTER TABLE leads ADD CONSTRAINT leads_clinic_phone_unique UNIQUE (clinic_id, phone);

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'standard';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Fotos antes/depois dos procedimentos
CREATE INDEX IF NOT EXISTS idx_photos_proc ON procedure_photos(procedure_id);

-- Configurações extras do portal (delay do reveal, etc.)
CREATE TABLE IF NOT EXISTS portal_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE UNIQUE,
  reveal_delay INTEGER DEFAULT 5,  -- segundos
  show_price   BOOLEAN DEFAULT true,
  greeting_msg TEXT DEFAULT 'Olá! Escolha o procedimento que te interessa:',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook log — registra tudo que chega da Evolution (para debug)
CREATE TABLE IF NOT EXISTS webhook_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload    JSONB NOT NULL,
  processed  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT DEFAULT 'admin',
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT UNIQUE NOT NULL,
  type        TEXT NOT NULL,
  clinic_id   UUID REFERENCES clinics(id),
  payload     JSONB,
  processed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_leads_clinic    ON leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone     ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);
CREATE INDEX IF NOT EXISTS idx_appts_clinic    ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appts_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appts_status    ON appointments(status);
`

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('🔄 Rodando migrations...')
    await client.query(schema)

    // Colunas adicionadas em versões posteriores — ALTER TABLE é idempotente com IF NOT EXISTS
    const alters = [
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '{}'`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS reveal_delay INTEGER DEFAULT 5`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES appointments(id)`,
      // Campos da página de detalhes do procedimento
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS headline TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS subheadline TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS benefit_1_title TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS benefit_1_desc TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS benefit_2_title TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS benefit_2_desc TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS benefit_3_title TEXT`,
      `ALTER TABLE procedures ADD COLUMN IF NOT EXISTS benefit_3_desc TEXT`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial'`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'standard'`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
      `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`,
      // Suporte a imagens de carrossel na tabela procedure_photos
      `ALTER TABLE procedure_photos DROP CONSTRAINT IF EXISTS procedure_photos_side_check`,
      `ALTER TABLE procedure_photos ADD CONSTRAINT procedure_photos_side_check CHECK (side IN ('before','after','carousel'))`,
      // Supabase Storage — guarda o path do arquivo no bucket para poder deletar
      `ALTER TABLE procedure_photos ADD COLUMN IF NOT EXISTS storage_path TEXT`,
      // Ordem de exibição das fotos dentro de cada side
      `ALTER TABLE procedure_photos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`,
    ]
    for (const sql of alters) await client.query(sql)

    // Seed: clínica padrão a partir do .env
    await client.query(`
      INSERT INTO clinics (slug, name)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING
    `, [process.env.CLINIC_SLUG || 'bella-estetica', process.env.CLINIC_NAME || 'Clínica Bella Estética'])

    // Seed: horários padrão (Seg–Sex 9–18, Sáb 9–13, Dom fechado)
    const { rows: [clinic] } = await client.query(
      'SELECT id FROM clinics WHERE slug = $1',
      [process.env.CLINIC_SLUG || 'bella-estetica']
    )
    if (clinic) {
      const hours = [
        [0, false, '09:00', '18:00'],
        [1, true,  '09:00', '18:00'],
        [2, true,  '09:00', '18:00'],
        [3, true,  '09:00', '18:00'],
        [4, true,  '09:00', '18:00'],
        [5, true,  '09:00', '18:00'],
        [6, true,  '09:00', '13:00'],
      ]
      for (const [dow, open, start, end] of hours) {
        await client.query(`
          INSERT INTO business_hours (clinic_id, day_of_week, open, start_time, end_time)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (clinic_id, day_of_week) DO NOTHING
        `, [clinic.id, dow, open, start, end])
      }
    }

    if (process.env.SUPERADMIN_EMAIL && process.env.SUPERADMIN_PASSWORD) {
      const passwordHash = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 12)
      await client.query(`
        INSERT INTO users (clinic_id, email, password, role)
        VALUES (NULL, LOWER($1), $2, 'superadmin')
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = 'superadmin',
          active = true
      `, [process.env.SUPERADMIN_EMAIL, passwordHash])
    }

    console.log('✅ Migrations concluídas com sucesso')
  } catch (err) {
    console.error('❌ Erro na migration:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
    process.exit(0)
  }
}

migrate()
