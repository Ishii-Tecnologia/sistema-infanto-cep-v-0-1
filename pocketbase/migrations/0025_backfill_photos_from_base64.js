// Converte as fotos Base64 (photo_url) de children/guardians que sobraram
// para o campo de ARQUIVO photo (padrão natal_entregas). Idempotente: só
// atua em registros com data URL em photo_url e photo vazio, e preserva
// photo_url original quando o Base64 é inválido ou maior que 5 MB — nenhuma
// foto é descartada.
//
// A versão 0023 ficava no-op neste runtime porque o global $filesystem não
// existe no executor de migrações do Skip Cloud (erro em tempo de execução,
// sem trace no apply). Aqui a conversão é feita por um HOOK de bootstrap
// (photo_backfill.pb.js), que roda depois de cada deploy com o $filesystem
// disponível. Esta migração existe apenas como marcador/history.

migrate(
  (app) => {
    console.log(
      '[0025 backfill photos] conversão Base64 -> arquivo delegada ao hook photo_backfill (roda no bootstrap)',
    )
  },
  (app) => {
    // Reversão não remove arquivos — mantém os dados intactos.
  },
)
