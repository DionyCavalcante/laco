#!/usr/bin/env node
/**
 * restore.js — Restaura um backup do banco PostgreSQL
 *
 * Uso:
 *   node scripts/restore.js backups/laco_backup_2025-03-28T03-00-00.sql.gz
 *
 * ATENÇÃO: Este script APAGA todos os dados atuais e restaura do backup.
 * Use apenas em caso de emergência.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const readline = require('readline')

const DATABASE_URL = process.env.DATABASE_URL
const backupFile   = process.argv[2]

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida')
  process.exit(1)
}

if (!backupFile) {
  console.error('❌ Informe o arquivo de backup')
  console.error('   Uso: node scripts/restore.js backups/laco_backup_XXXX.sql.gz')
  process.exit(1)
}

const fullPath = path.resolve(backupFile)
if (!fs.existsSync(fullPath)) {
  console.error(`❌ Arquivo não encontrado: ${fullPath}`)
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log('⚠️  ATENÇÃO: Esta operação irá APAGAR todos os dados atuais do banco.')
console.log(`   Arquivo: ${path.basename(fullPath)}`)
console.log(`   Banco:   ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`)

rl.question('\nDigite CONFIRMAR para continuar: ', async (answer) => {
  rl.close()
  if (answer.trim() !== 'CONFIRMAR') {
    console.log('Operação cancelada.')
    process.exit(0)
  }

  try {
    console.log('\n🔄 Restaurando backup...')
    execSync(
      `gunzip -c "${fullPath}" | psql "${DATABASE_URL}"`,
      { stdio: 'inherit', shell: true }
    )
    console.log('✅ Restauração concluída com sucesso!')
  } catch (err) {
    console.error('❌ Erro na restauração:', err.message)
    process.exit(1)
  }
})
