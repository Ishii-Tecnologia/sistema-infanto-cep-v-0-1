// Converte as fotos Base64 (photo_url) de children/guardians que sobraram
// para o campo de ARQUIVO photo (padrão natal_entregas). Idempotente: só
// atua em registros com data URL em photo_url e photo vazio, e preserva
// photo_url original quando o Base64 é inválido ou maior que 5 MB — nenhuma
// foto é descartada.
//
// A versão anterior (0023) ficava no-op neste runtime porque o global
// $filesystem não existe no executor de migrações do Skip Cloud. Aqui a
// decodificação é feita à mão (Base64 -> bytes) e o arquivo é gravado com
// blob.NewBytes, sem depender de $filesystem.

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

function migrateCollection(app, collectionName) {
  const skippedIds = new Set()
  let migrated = 0
  let skippedInvalid = 0
  let skippedTooLarge = 0
  let page = 0

  for (;;) {
    const records = app.findRecordsByFilter(
      collectionName,
      'photo_url ~ "data:image/" && photo = ""',
      '-updated',
      50,
      page * 50,
    )
    page++
    if (records.length === 0) break

    let pendingOnPage = 0
    for (const record of records) {
      if (skippedIds.has(record.id)) {
        pendingOnPage++
        continue
      }

      const dataUrl = record.getString('photo_url') || ''
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (!match) {
        skippedIds.add(record.id)
        skippedInvalid++
        continue
      }

      const mime = EXT_BY_MIME[match[1]] ? match[1] : 'image/jpeg'
      let bytes = []
      try {
        bytes = base64ToBytes(match[2])
      } catch (err) {
        console.error(
          '[0024 backfill photos] erro decodificando ' + collectionName + '/' + record.id,
          err,
        )
      }
      if (!bytes || bytes.length === 0) {
        skippedIds.add(record.id)
        skippedInvalid++
        continue
      }
      if (bytes.length > MAX_BYTES) {
        console.log(
          '[0024 backfill photos] ' +
            collectionName +
            '/' +
            record.id +
            ': Base64 maior que 5 MB — photo_url original preservada',
        )
        skippedIds.add(record.id)
        skippedTooLarge++
        continue
      }

      try {
        const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
        const blob = blob.newBytes(bytes, mime)
        const file = new $filesystem.File({
          blob: blob,
          name: 'foto_' + record.id + '_' + stamp + '.' + EXT_BY_MIME[mime],
        })
        record.set('photo', file)
        record.set('photo_url', '')
        app.save(record)
        migrated++
      } catch (err) {
        console.error(
          '[0024 backfill photos] falha ao gravar arquivo de ' + collectionName + '/' + record.id,
          err,
        )
        skippedIds.add(record.id)
        skippedInvalid++
      }
    }

    // Página só com registros já conhecidos como inválidos: acabou o trabalho possível.
    if (pendingOnPage === records.length) break
  }

  console.log(
    '[0024 backfill photos] ' +
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
