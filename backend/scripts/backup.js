#!/usr/bin/env node
/**
 * backup.js — Backup automático do banco PostgreSQL
 *
 * Uso:
 *   node scripts/backup.js
 *
 * Variáveis de ambiente necessárias:
 *   DATABASE_URL  — string de conexão do banco (já existe no Railway)
 *   BACKUP_DIR    — pasta local para salvar backups (default: ./backups)
 *   BACKUP_KEEP   — quantos backups manter (default: 7)
 *
 * Para agendar no Railway (cron job):
 *   Adicione um serviço Cron no Railway com comando:
 *   node backend/scripts/backup.js
 *   e schedule: 0 3 * * *  (todo dia às 3h da manhã)
 *
 * Para rodar localmente:
 *   DATABASE_URL=postgresql://... node backend/scripts/backup.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { execSync, exec } = require('child_process')
const fs   = require('fs')
const path = require('path')

const DATABASE_URL = process.env.DATABASE_URL
const BACKUP_DIR   = process.env.BACKUP_DIR || path.join(__dirname, '../../backups')
const KEEP         = parseInt(process.env.BACKUP_KEEP || '7')

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida')
  process.exit(1)
}

// Garante que o diretório de backups existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const filename  = `laco_backup_${timestamp}.sql`
const filepath  = path.join(BACKUP_DIR, filename)
const gzpath    = filepath + '.gz'

async function run() {
  console.log(`🔄 Iniciando backup — ${new Date().toLocaleString('pt-BR')}`)
  console.log(`   Destino: ${gzpath}`)

  try {
    // Verifica se pg_dump está disponível
    execSync('which pg_dump', { stdio: 'ignore' })
  } catch {
    console.error('❌ pg_dump não encontrado. Instale postgresql-client.')
    console.log('   No Railway, adicione ao nixpacks.toml:')
    console.log('   [phases.setup]')
    console.log('   nixPkgs = ["nodejs_20", "postgresql"]')
    process.exit(1)
  }

  try {
    // Dump + compressão em pipeline
    console.log('   Executando pg_dump...')
    execSync(
      `pg_dump "${DATABASE_URL}" --no-owner --no-acl --format=plain | gzip > "${gzpath}"`,
      { stdio: 'inherit', shell: true }
    )

    const stats   = fs.statSync(gzpath)
    const sizeMb  = (stats.size / 1024 / 1024).toFixed(2)
    console.log(`✅ Backup concluído — ${filename}.gz (${sizeMb} MB)`)

    // Limpa backups antigos, mantém KEEP mais recentes
    pruneOldBackups()

    // Log de sucesso
    logBackup({ status: 'ok', file: filename + '.gz', size_mb: sizeMb, ts: new Date().toISOString() })

  } catch (err) {
    console.error('❌ Erro no backup:', err.message)
    logBackup({ status: 'error', error: err.message, ts: new Date().toISOString() })
    process.exit(1)
  }
}

function pruneOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('laco_backup_') && f.endsWith('.sql.gz'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time)

  const toDelete = files.slice(KEEP)
  toDelete.forEach(f => {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name))
    console.log(`   🗑  Removido backup antigo: ${f.name}`)
  })

  console.log(`   📦 ${Math.min(files.length, KEEP)} backup(s) mantidos em ${BACKUP_DIR}`)
}

function logBackup(entry) {
  const logFile = path.join(BACKUP_DIR, 'backup.log')
  const line    = JSON.stringify(entry) + '\n'
  fs.appendFileSync(logFile, line)
}

run()
