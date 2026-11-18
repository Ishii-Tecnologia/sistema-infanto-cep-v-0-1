// Backfill server-side das fotos Base64 (photo_url -> campo de arquivo photo)
// para children/guardians, no padrão natal_entregas. Idempotente: só atua em
// registros com data URL em photo_url e photo vazio, e preserva photo_url
// original quando o Base64 é inválido ou maior que 5 MB — nenhuma foto é
// descartada.
//
// Como acionar:
// 1. Bootstrap: a cada (re)início do backend o backfill roda uma vez se houver
//    pendentes (síncrono, poucos registros).
// 2. Rota manual (diagnóstico): POST /backend/v1/photo-backfill com
//    Authorization de um usuário admin/dirigente/professor/auxiliar — retorna
//    JSON com contagens. ?dryRun=1 conta sem gravar.
//
// IMPORTANTE (limitação da JSVM do PocketBase): callbacks rodam em um pool de
// VMs separado — NADA de escopo top-level pode ser referenciado dentro deles
// (nem funções, nem constantes). Por isso a lógica de conversão está inline
// dentro de cada callback.
//
// Nota de runtime (por que as tentativas anteriores não convertiam nada):
// $filesystem.fileFromBytes espera conteúdo como string/bytes Go; um Uint8Array
// JS NÃO é exportado para []byte do Go e fazia cada save falhar (erro por
// registro, sem efeito no banco). Aqui o Base64 é decodificado em uma STRING
// binária (byte a byte), formato aceito pela API oficial
// ($filesystem.fileFromBytes("conteudo", "nome.ext")).

routerAdd(
  'POST',
  '/backend/v1/photo-backfill',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      throw new ForbiddenError('Acesso não autorizado.')
    }
    const role = authRecord.getString('role')
    if (role !== 'admin' && role !== 'dirigente' && role !== 'professor' && role !== 'auxiliar') {
      throw new ForbiddenError('Apenas operadores autorizados podem acionar o backfill de fotos.')
    }

    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const MAX_BYTES = 5 * 1024 * 1024
    const EXT_BY_MIME = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const FILTER = 'photo_url ~ "data:image/" && photo = ""'

    function base64ToBinaryString(b64) {
      let out = ''
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
          out += String.fromCharCode((buffer >> bits) & 0xff)
        }
      }
      return out
    }

    function backfillCollection(app, collectionName, dryRun) {
      const result = { collection: collectionName, migrated: 0, invalid: 0, tooLarge: 0, failed: 0 }
      if (typeof $filesystem === 'undefined') {
        console.error('[photo-backfill] $filesystem indisponível neste runtime')
        result.failed = -1
        return result
      }

      const skippedIds = new Set()
      let page = 0

      for (;;) {
        const records = app.findRecordsByFilter(collectionName, FILTER, '-updated', 50, page * 50)
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
            result.invalid++
            continue
          }

          const mime = EXT_BY_MIME[match[1]] ? match[1] : 'image/jpeg'
          let content = ''
          try {
            content = base64ToBinaryString(match[2])
          } catch (err) {
            console.error(
              '[photo-backfill] erro decodificando ' + collectionName + '/' + record.id,
              err,
            )
          }
          if (!content || content.length === 0) {
            skippedIds.add(record.id)
            result.invalid++
            continue
          }
          if (content.length > MAX_BYTES) {
            console.log(
              '[photo-backfill] ' +
                collectionName +
                '/' +
                record.id +
                ': Base64 maior que 5 MB — photo_url original preservada',
            )
            skippedIds.add(record.id)
            result.tooLarge++
            continue
          }
          if (dryRun) {
            skippedIds.add(record.id)
            result.migrated++
            continue
          }

          try {
            const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
            const file = $filesystem.fileFromBytes(
              content,
              'foto_' + record.id + '_' + stamp + '.' + EXT_BY_MIME[mime],
            )
            record.set('photo', file)
            record.set('photo_url', '')
            app.save(record)
            result.migrated++
          } catch (err) {
            console.error(
              '[photo-backfill] falha ao gravar arquivo de ' + collectionName + '/' + record.id,
              err,
            )
            skippedIds.add(record.id)
            result.failed++
          }
        }

        if (pendingOnPage === records.length) break
      }

      console.log(
        '[photo-backfill] ' +
          collectionName +
          ': migradas=' +
          result.migrated +
          ' invalidas=' +
          result.invalid +
          ' grandes=' +
          result.tooLarge +
          ' falhas=' +
          result.failed +
          (dryRun ? ' (dryRun)' : ''),
      )
      return result
    }

    const dryRun = e.request.url().query().get('dryRun') === '1'
    const results = []
    for (const name of ['children', 'guardians']) {
      try {
        results.push(backfillCollection(e.app, name, dryRun))
      } catch (err) {
        console.error('[photo-backfill] erro em ' + name + ':', err)
        results.push({
          collection: name,
          migrated: 0,
          invalid: 0,
          tooLarge: 0,
          failed: -1,
          error: String(err),
        })
      }
    }
    return e.json(200, { success: true, dryRun, results })
  },
  $apis.requireAuth('users'),
)

// Cron idempotente: converte pendências a cada 5 minutos. O handler roda em
// VM própria — a lógica é autocontida (nada de escopo top-level) e usa $app.
cronAdd('photo-backfill', '*/5 * * * *', () => {
  try {
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const MAX_BYTES = 5 * 1024 * 1024
    const EXT_BY_MIME = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const FILTER = 'photo_url ~ "data:image/" && photo = ""'

    function base64ToBinaryString(b64) {
      let out = ''
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
          out += String.fromCharCode((buffer >> bits) & 0xff)
        }
      }
      return out
    }

    for (const collectionName of ['children', 'guardians']) {
      let migrated = 0
      let failed = 0
      const skippedIds = new Set()
      let page = 0

      for (;;) {
        const records = $app.findRecordsByFilter(collectionName, FILTER, '-updated', 50, page * 50)
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
            continue
          }

          const mime = EXT_BY_MIME[match[1]] ? match[1] : 'image/jpeg'
          let content = ''
          try {
            content = base64ToBinaryString(match[2])
          } catch (err) {
            console.error(
              '[photo-backfill][cron] erro decodificando ' + collectionName + '/' + record.id,
              err,
            )
          }
          if (!content || content.length === 0) {
            skippedIds.add(record.id)
            continue
          }
          if (content.length > MAX_BYTES) {
            skippedIds.add(record.id)
            continue
          }

          try {
            const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
            const file = $filesystem.fileFromBytes(
              content,
              'foto_' + record.id + '_' + stamp + '.' + EXT_BY_MIME[mime],
            )
            record.set('photo', file)
            record.set('photo_url', '')
            $app.save(record)
            migrated++
          } catch (err) {
            console.error(
              '[photo-backfill][cron] falha ao gravar arquivo de ' +
                collectionName +
                '/' +
                record.id,
              err,
            )
            skippedIds.add(record.id)
            failed++
          }
        }

        if (pendingOnPage === records.length) break
      }

      if (migrated > 0 || failed > 0) {
        console.log(
          '[photo-backfill][cron] ' +
            collectionName +
            ': migradas=' +
            migrated +
            ' falhas=' +
            failed,
        )
      }
    }
  } catch (err) {
    console.error('[photo-backfill][cron] erro:', err)
  }
})

onBootstrap((e) => {
  try {
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const MAX_BYTES = 5 * 1024 * 1024
    const EXT_BY_MIME = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const FILTER = 'photo_url ~ "data:image/" && photo = ""'

    function base64ToBinaryString(b64) {
      let out = ''
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
          out += String.fromCharCode((buffer >> bits) & 0xff)
        }
      }
      return out
    }

    function backfillCollection(app, collectionName) {
      let migrated = 0
      let invalid = 0
      let tooLarge = 0
      let failed = 0
      if (typeof $filesystem === 'undefined') {
        console.error('[photo-backfill] $filesystem indisponível neste runtime')
        return
      }

      const skippedIds = new Set()
      let page = 0

      for (;;) {
        const records = app.findRecordsByFilter(collectionName, FILTER, '-updated', 50, page * 50)
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
            invalid++
            continue
          }

          const mime = EXT_BY_MIME[match[1]] ? match[1] : 'image/jpeg'
          let content = ''
          try {
            content = base64ToBinaryString(match[2])
          } catch (err) {
            console.error(
              '[photo-backfill] erro decodificando ' + collectionName + '/' + record.id,
              err,
            )
          }
          if (!content || content.length === 0) {
            skippedIds.add(record.id)
            invalid++
            continue
          }
          if (content.length > MAX_BYTES) {
            console.log(
              '[photo-backfill] ' +
                collectionName +
                '/' +
                record.id +
                ': Base64 maior que 5 MB — photo_url original preservada',
            )
            skippedIds.add(record.id)
            tooLarge++
            continue
          }

          try {
            const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
            const file = $filesystem.fileFromBytes(
              content,
              'foto_' + record.id + '_' + stamp + '.' + EXT_BY_MIME[mime],
            )
            record.set('photo', file)
            record.set('photo_url', '')
            app.save(record)
            migrated++
          } catch (err) {
            console.error(
              '[photo-backfill] falha ao gravar arquivo de ' + collectionName + '/' + record.id,
              err,
            )
            skippedIds.add(record.id)
            failed++
          }
        }

        if (pendingOnPage === records.length) break
      }

      console.log(
        '[photo-backfill] ' +
          collectionName +
          ': migradas=' +
          migrated +
          ' invalidas=' +
          invalid +
          ' grandes=' +
          tooLarge +
          ' falhas=' +
          failed,
      )
    }

    const filter = 'photo_url ~ "data:image/" && photo = ""'
    let pending = 0
    for (const name of ['children', 'guardians']) {
      try {
        pending += e.app.countRecords(name, filter)
      } catch (err) {
        console.error('[photo-backfill] erro contando pendentes em ' + name + ':', err)
      }
    }
    if (pending === 0) {
      e.next()
      return
    }
    console.log('[photo-backfill] bootstrap: pendentes=' + pending + ' — iniciando conversão')
    for (const name of ['children', 'guardians']) {
      try {
        backfillCollection(e.app, name)
      } catch (err) {
        console.error('[photo-backfill] erro no backfill de bootstrap em ' + name + ':', err)
      }
    }
  } catch (err) {
    console.error('[photo-backfill] erro no backfill de bootstrap:', err)
  }
  e.next()
})
