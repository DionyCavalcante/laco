/**
 * Script de importação de procedimentos para Mana Beauty
 * Lê pastas de D:\Procedimentos, cria procedimentos no banco e faz upload das fotos
 */
require('dotenv').config()
const { Pool } = require('pg')
const sharp = require('sharp')
const fs = require('fs/promises')
const path = require('path')

const CLINIC_ID = '3702b754-5655-4b2a-804f-e033f2970cc6'
const PROCEDURES_DIR = 'D:/Procedimentos'
const UPLOAD_DIR = path.join(__dirname, '../uploads')
const DEFAULT_DURATION = 60 // minutos

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function parseFolderName(folderName) {
  // Formato esperado: "Nome do Procedimento - 123" ou "Nome do Procedimento"
  const match = folderName.match(/^(.+?)\s*-\s*(\d+)\s*$/)
  if (match) {
    return {
      name: match[1].trim(),
      price: parseInt(match[2], 10),
    }
  }
  return { name: folderName.trim(), price: 0 }
}

async function findOrCreateProcedure(name, price) {
  // Verifica se já existe
  const { rows } = await pool.query(
    'SELECT id FROM procedures WHERE clinic_id = $1 AND LOWER(name) = LOWER($2)',
    [CLINIC_ID, name]
  )
  if (rows.length > 0) {
    console.log(`  [EXISTENTE] "${name}" (id: ${rows[0].id})`)
    // Atualiza o preço
    await pool.query(
      'UPDATE procedures SET price = $1 WHERE id = $2',
      [price, rows[0].id]
    )
    return rows[0].id
  }

  const { rows: created } = await pool.query(
    `INSERT INTO procedures (clinic_id, name, duration, price, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [CLINIC_ID, name, DEFAULT_DURATION, price]
  )
  console.log(`  [CRIADO] "${name}" - R$${price} (id: ${created[0].id})`)
  return created[0].id
}

async function uploadPhoto(procId, imagePath) {
  const clinicDir = path.join(UPLOAD_DIR, CLINIC_ID, 'procedures', procId)
  await fs.mkdir(clinicDir, { recursive: true })

  const filename = `carousel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`
  const outPath = path.join(clinicDir, filename)

  await sharp(imagePath)
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
    .then(buf => fs.writeFile(outPath, buf))

  const url = `/uploads/${CLINIC_ID}/procedures/${procId}/${filename}`

  await pool.query(
    'INSERT INTO procedure_photos (procedure_id, side, url) VALUES ($1, $2, $3)',
    [procId, 'carousel', url]
  )

  return url
}

async function clearExistingPhotos(procId) {
  const { rows } = await pool.query(
    'SELECT url FROM procedure_photos WHERE procedure_id = $1 AND side = $2',
    [procId, 'carousel']
  )
  if (rows.length > 0) {
    // Remove arquivos físicos
    for (const row of rows) {
      const filePath = path.join(UPLOAD_DIR, row.url.replace('/uploads/', ''))
      await fs.unlink(filePath).catch(() => {}) // ignora se não existir
    }
    await pool.query(
      'DELETE FROM procedure_photos WHERE procedure_id = $1 AND side = $2',
      [procId, 'carousel']
    )
    console.log(`  [LIMPEZA] ${rows.length} fotos antigas removidas`)
  }
}

async function main() {
  console.log('=== Importação de Procedimentos — Mana Beauty ===\n')

  const entries = await fs.readdir(PROCEDURES_DIR, { withFileTypes: true })
  const folders = entries.filter(e => e.isDirectory())

  for (const folder of folders) {
    const { name, price } = parseFolderName(folder.name)
    console.log(`\nProcedimento: "${name}" | Preço: R$${price}`)

    if (price === 0 && !folder.name.includes('-')) {
      console.log(`  [AVISO] "${name}" não tem preço no nome da pasta. Usando R$0.`)
    }

    const procId = await findOrCreateProcedure(name, price)

    // Limpa fotos carousel antigas
    await clearExistingPhotos(procId)

    // Lê imagens da pasta
    const folderPath = path.join(PROCEDURES_DIR, folder.name)
    const files = await fs.readdir(folderPath)
    const images = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f))

    console.log(`  Enviando ${images.length} imagem(ns)...`)
    for (const img of images) {
      const imgPath = path.join(folderPath, img)
      const url = await uploadPhoto(procId, imgPath)
      console.log(`    -> ${url}`)
    }
  }

  console.log('\n=== Importação concluída! ===')
  await pool.end()
}

main().catch(e => {
  console.error('ERRO:', e.message)
  pool.end()
  process.exit(1)
})
