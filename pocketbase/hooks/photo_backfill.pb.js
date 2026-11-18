// Backfill server-side das fotos Base64 (photo_url -> campo de arquivo photo)
// para children/guardians, no padrão natal_entregas. Roda no bootstrap do
// backend e é idempotente: sem registros pendentes, é no-op (contagem única).
// Preserva photo_url original quando o Base64 é inválido ou maior que 5 MB —
// nenhuma foto é descartada.
//
// Nota de runtime: $filesystem.fileFromBytes exige []byte do Go — um Array JS
// comum NÃO é convertido; é obrigatório new Uint8Array(bytes). Foi exatamente
// isso que fez a migração 0023 (e a 0024 original) não converter nada.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64ToBytes(b64) {
  const bytes = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < b64.length; i++) {
    const ch = b64[i]
    if (ch === '=') break
    const val = B64.indexOf(ch)
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

function backfillCollection(app, collectionName) {
  let migrated = 0
  let skippedInvalid = 0
  let skippedTooLarge = 0

  for (;;) {
    const records = app.findRecordsByFilter(
      collectionName,
      'photo_url ~ "data:image/" && photo = ""',
      '-updated',
      50,
      migrated + skippedInvalid + skippedTooLarge,
    )
    if (records.length === 0) break

    let processedOnPage = 0
    for (const record of records) {
      const dataUrl = record.getString('photo_url') || ''
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (!match) {
        skippedInvalid++
        processedOnPage++
        continue
      }

      const mime = EXT_BY_MIME[match[1]] ? match[1] : 'image/jpeg'
      let bytes = []
      try {
        bytes = base64ToBytes(match[2])
      } catch (err) {
        console.error(
          '[photo-backfill] erro decodificando ' + collectionName + '/' + record.id,
          err,
        )
      }
      if (!bytes || bytes.length === 0) {
        skippedInvalid++
        processedOnPage++
        continue
      }
      if (bytes.length > MAX_BYTES) {
        console.log(
          '[photo-backfill] ' +
            collectionName +
            '/' +
            record.id +
            ': Base64 maior que 5 MB — photo_url original preservada',
        )
        skippedTooLarge++
        processedOnPage++
        continue
      }

      try {
        const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
        const file = $filesystem.fileFromBytes(
          new Uint8Array(bytes),
          'foto_' + record.id + '_' + stamp + '.' + EXT_BY_MIME[mime],
        )
        record.set('photo', file)
        record.set('photo_url', '')
        app.save(record)
        migrated++
        processedOnPage++
      } catch (err) {
        console.error(
          '[photo-backfill] falha ao gravar arquivo de ' + collectionName + '/' + record.id,
          err,
        )
        skippedInvalid++
        processedOnPage++
      }
    }

    if (processedOnPage === 0) break
  }
}

onBootstrap((e) => {
  try {
    const hasFilesystem = typeof $filesystem !== 'undefined'
    const pendingChildren = e.app.countRecords(
      'children',
      'photo_url ~ "data:image/" && photo = ""',
    )
    const pendingGuardians = e.app.countRecords(
      'guardians',
      'photo_url ~ "data:image/" && photo = ""',
    )
    const pending = pendingChildren + pendingGuardians
    if (pending === 0) {
      e.next()
      return
    }
    if (!hasFilesystem) {
      console.log(
        '[photo-backfill] $filesystem indisponível neste runtime — pendentes: children=' +
          pendingChildren +
          ' guardians=' +
          pendingGuardians,
      )
      e.next()
      return
    }
    console.log(
      '[photo-backfill] iniciando conversão: children=' +
        pendingChildren +
        ' guardians=' +
        pendingGuardians,
    )
    backfillCollection(e.app, 'children')
    backfillCollection(e.app, 'guardians')
  } catch (err) {
    console.error('[photo-backfill] erro no backfill de fotos:', err)
  }
  e.next()
})
