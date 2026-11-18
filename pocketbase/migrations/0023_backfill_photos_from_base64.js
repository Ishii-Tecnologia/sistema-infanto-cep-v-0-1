// Backfill: converte fotos Base64 (photo_url) de children/guardians para o
// campo de ARQUIVO photo (padrão natal_entregas). Idempotente e no-op em
// banco vazio: só atua em registros cujo photo_url é uma data URL e que
// ainda não possuem arquivo em photo. Nenhuma foto é descartada — em caso
// de Base64 inválido ou maior que 5 MB o original é mantido em photo_url.

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64ToBytes(b64) {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '')
  const bytes = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (c === '=') break
    const val = B64_CHARS.indexOf(c)
    if (val === -1) continue
    buffer = (buffer << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return bytes
}

const MAX_BYTES = 5 * 1024 * 1024
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function migrateCollection(app, collectionName) {
  const pageSize = 100
  let offset = 0
  let migrated = 0
  let skippedInvalid = 0
  let skippedTooLarge = 0

  for (;;) {
    // Registros com Base64 pendente; os já migrados (photo preenchido) saem
    // naturalmente do filtro, mantendo a paginação estável.
    const records = app.findRecordsByFilter(
      collectionName,
      'photo_url ~ "data:image/" && photo = ""',
      '-updated',
      pageSize,
      offset,
    )

    if (records.length === 0) break

    for (const record of records) {
      const dataUrl = record.getString('photo_url') || ''
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s)
      if (!match) {
        skippedInvalid++
        continue
      }

      const mime = EXT_BY_MIME[match[1]] ? match[1] : 'image/jpeg'
      const bytes = base64ToBytes(match[2])
      if (bytes.length === 0) {
        skippedInvalid++
        continue
      }
      if (bytes.length > MAX_BYTES) {
        skippedTooLarge++
        continue
      }

      const stamp = record.id + '_' + Date.now()
      const file = $filesystem.fileFromBytes(bytes, 'foto_' + stamp + '.' + EXT_BY_MIME[mime])
      record.set('photo', file)
      record.set('photo_url', '')
      app.save(record)
      migrated++
    }

    if (records.length < pageSize) break
    // Registros migrados saíram do filtro; avance apenas o restante pendente.
    offset += records.filter((r) =>
      (r.getString('photo_url') || '').startsWith('data:image/'),
    ).length
    if (offset < 0) offset = 0
  }

  console.log(
    '[0023 backfill photos] ' +
      collectionName +
      ': migradas=' +
      migrated +
      ' invalidas=' +
      skippedInvalid +
      ' grandes=' +
      skippedTooLarge,
  )
}

migrate(
  (app) => {
    migrateCollection(app, 'children')
    migrateCollection(app, 'guardians')
  },
  (app) => {
    // Reversão não remove arquivos — mantém os dados intactos.
  },
)
