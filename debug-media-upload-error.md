# Debug Session: media-upload-error [OPEN]

## Sintoma
- Upload de um vídeo de aproximadamente 15 MB falha ao enviar para o Cloudflare, sem mensagem de erro clara para o usuário.

## Comportamento esperado
- O upload deve concluir com sucesso ou exibir uma mensagem objetiva informando a causa da falha.

## Hipóteses iniciais
- H1. O bloqueio de limite do R2 está rejeitando o arquivo porque o espaço restante calculado está abaixo de 15 MB.
- H2. A rota `/api/media/usage` ou a consulta de uso do bucket está falhando, e o frontend está transformando isso em um erro genérico de upload.
- H3. O `PutObjectCommand` no R2 está retornando erro por credenciais, bucket, timeout ou payload do arquivo.
- H4. O insert no Supabase após o upload para o R2 está falhando, deixando a percepção de erro como sendo do Cloudflare.
- H5. O frontend da tela `Midias` está capturando a exceção, mas não está exibindo a mensagem detalhada recebida do backend em algum fluxo específico.

## Plano
- Instrumentar frontend e rotas de upload/uso para capturar tamanho do arquivo, limite restante, resposta do R2 e resposta do Supabase.
- Reproduzir com um upload real ou simulado.
- Confirmar ou refutar hipóteses com evidência.
- Só então aplicar a correção mínima necessária.

## Evidências coletadas
- `client selected file for upload`: arquivo de `15.327.943` bytes selecionado no frontend.
- `media usage state resolved`: uso do bucket em `11.203.121` bytes, com `9.988.796.879` bytes restantes.
- `r2 put object succeeded`: upload para o bucket `zapchicken-midias` concluído.
- `media metadata insert succeeded`: metadata persistida no Supabase com sucesso.
- Conclusão: o fluxo local completo funciona; a falha relatada no deploy não está no R2, nem no limite configurado do bucket, nem no Supabase.

## Causa confirmada
- O upload em produção passa por `Route Handler` na Vercel antes de chegar ao R2.
- A Vercel impõe limite de corpo de requisição de aproximadamente `4.5 MB` para Functions, portanto um vídeo de `15 MB` falha antes de alcançar o backend do app.

## Correção mínima aplicada
- Expor o limite de upload da plataforma na rota `/api/media/usage`.
- Exibir esse limite na aba `Mídias`.
- Bloquear no cliente arquivos acima do limite da plataforma com mensagem clara, evitando erro sem contexto.

## Próxima correção estrutural recomendada
- Implementar upload direto do navegador para o Cloudflare R2 com URL pré-assinada, para suportar vídeos maiores também no deploy publicado.

## Evidências da correção estrutural
- `direct upload usage lookup succeeded`: a nova rota `/api/media/upload-url` continua conseguindo consultar o uso atual do bucket.
- `direct upload cors sync started` seguido de `direct upload url generation failed` com erro `Access Denied`: a quebra do `500` estava na tentativa de alterar o CORS do bucket durante a geração da URL assinada.
- `direct upload cors sync skipped`: após a correção, a falha de permissão no CORS passou a ser tratada como não bloqueante.
- `direct upload url generated`: a rota passou a devolver a URL assinada com sucesso.
- `direct upload completion persisted metadata`: o fluxo completo `upload-url -> PUT no R2 -> upload-complete` concluiu e gravou a mídia no Supabase.

## Nova causa confirmada
- A etapa automática de sincronização de CORS do bucket usava credenciais com permissão suficiente para objetos, mas sem permissão para alterar configurações de bucket, resultando em `Access Denied`.
- O `500` da rota `/api/media/upload-url` não era causado pela assinatura da URL nem pelo limite do R2.

## Correção aplicada no fluxo direto
- Tornar a sincronização automática de CORS um passo de melhor esforço, sem bloquear a geração da URL assinada.
- Manter logs explícitos para diferenciar `cors sync skipped` de falhas reais na assinatura.
- Melhorar a mensagem do cliente quando o `PUT` direto falhar, orientando a revisar o CORS do bucket para o domínio do painel.
