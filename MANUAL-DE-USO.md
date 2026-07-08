# Manual de Uso - ZapChicken Digital Signage

## 1. Visao Geral

O ZapChicken Digital Signage e um sistema para gerenciar conteudo de TV corporativa, cardapios digitais, publicidade interna e comunicados.

O sistema possui duas areas principais:

- Painel administrativo: cadastro e configuracao do conteudo
- Player: exibicao em tela cheia da programacao

## 2. Acesso ao Sistema

Ao abrir a URL principal do sistema, a primeira tela sera a de login.

Passos:

1. Acesse a URL do sistema
2. Informe a senha administrativa
3. Clique em `Entrar`
4. Apos o login, o sistema abre o painel administrativo

Rotas principais:

- `/` : entrada principal do sistema
- `/acesso` : tela de login
- `/dashboard` : painel principal
- `/player` : tela de exibicao

## 3. Estrutura do Painel

O menu lateral possui as seguintes areas:

- Dashboard
- Midias
- RSS
- Mensagens
- Layouts
- Zonas
- Timelines
- Agendamentos
- Configuracoes

## 4. Fluxo Recomendado de Configuracao

Para montar uma tela do zero, siga esta ordem:

1. Cadastre as midias
2. Cadastre fontes RSS, se necessario
3. Cadastre mensagens de marketing, se necessario
4. Crie um layout
5. Crie as zonas desse layout
6. Programe o conteudo das zonas em Timelines
7. Configure a timeline global de layouts, se quiser alternancia automatica
8. Crie agendamentos, se quiser horarios especificos
9. Abra o Player para testar a exibicao

## 5. Midias

Tela: `/midias`

Funcao:

- enviar imagens
- enviar videos
- ativar ou desativar uma midia
- excluir uma midia

Como usar:

1. Clique em `+ Adicionar Midia`
2. Escolha um arquivo de imagem ou video
3. Aguarde o upload
4. Verifique a miniatura da midia na biblioteca

Observacoes:

- As midias sao armazenadas no Cloudflare R2
- Os metadados ficam no Supabase
- Apos atualizar a pagina, a midia deve continuar cadastrada

## 6. RSS

Tela: `/rss`

Funcao:

- cadastrar fontes de noticias
- ativar ou desativar fontes
- remover fontes

Como usar:

1. Informe um nome para a fonte
2. Cole a URL do feed RSS
3. Salve
4. Ative a fonte desejada

Uso tipico:

- mostrar noticias em ticker
- combinar noticias com mensagens de marketing

## 7. Mensagens

Tela: `/mensagens`

Funcao:

- cadastrar frases promocionais
- definir peso/prioridade
- ativar ou desativar mensagens

Exemplos:

- ofertas do dia
- avisos internos
- campanhas promocionais

## 8. Layouts

Tela: `/layouts`

Funcao:

- criar a estrutura principal da tela
- ativar ou desativar layouts
- excluir layouts

Exemplos:

- um layout com video grande e ticker embaixo
- um layout com imagem lateral e texto principal

## 9. Zonas

Tela: `/zonas`

Funcao:

- dividir o layout em areas de conteudo
- mover e redimensionar zonas
- configurar camadas
- definir comportamento da zona

Tipos de zona:

- video
- imagem
- ticker
- stream

Recursos importantes:

- arrastar
- redimensionar
- snap com liga/desliga
- controle de camada com `z-index`
- exclusao rapida da zona selecionada

Configuracoes de ticker:

- tamanho da fonte
- cor do texto
- cor de fundo
- padding horizontal
- padding vertical
- duracao/velocidade

## 10. Timelines

Tela: `/timelines`

Funcao:

- definir o que cada zona vai tocar
- organizar a ordem do conteudo
- configurar duracao dos blocos

Tipos de bloco:

- midia
- RSS
- texto
- stream

Widget interno de tempo:

- para exibir previsao do tempo, use uma zona do tipo `stream`
- na tela `/timelines`, ao selecionar uma zona de stream, aparece o bloco `Widget interno de tempo`
- informe cidade, estado, pais e quantidade de dias
- clique em `Usar no campo acima`
- isso gera automaticamente uma URL interna como `/widget/tempo?cidade=Jaguariuna&estado=SP&pais=BR&dias=10`
- adicione esse bloco na timeline da zona e salve

Fluxo:

1. Escolha um layout
2. Escolha uma zona
3. Adicione os blocos da zona
4. Ajuste duracao e ordem
5. Salve

Tambem existe a timeline global, usada para alternar layouts automaticamente.

## 11. Agendamentos

Tela: `/agendamentos`

Funcao:

- definir qual layout aparece em datas e horarios especificos

Exemplos:

- campanha de cafe da manha das 06h as 10h
- promocao de almoco das 11h as 15h
- comunicados especiais em dias especificos

## 12. Configuracoes

Tela: `/configuracoes`

Funcao:

- escolher efeito de transicao
- configurar o player
- definir layout de emergencia

Exemplos de uso:

- transicao fade
- slide
- zoom
- flip
- wipe

Configuracoes importantes:

- volume do player
- inicio automatico em tela cheia
- transicoes visuais
- modo emergencia

## 13. Player

Tela: `/player`

Funcao:

- reproduzir o conteudo final
- executar layouts, zonas e timelines
- exibir ticker, imagens, videos e streams
- aplicar o volume configurado no painel

Recomendacao:

- use o player em tela cheia
- em TV Box, abra diretamente a rota `/player`
- ajuste o volume em `/configuracoes` antes de testar o audio

## 14. Boas Praticas

- Use nomes claros para layouts e zonas
- Envie arquivos com nomes organizados
- Evite videos excessivamente pesados
- Teste o player apos cada alteracao importante
- Use agendamentos para campanhas com horario definido
- Revise as fontes RSS periodicamente

## 15. Solucao de Problemas

### Nao consigo entrar no painel

Verifique:

- se o usuario e a senha estao corretos
- se a variavel `ADMIN_USERS_JSON` ou `ADMIN_PASSWORD` esta configurada
- se, no modo simples, voce esta usando o usuario padrao `admin`
- se o deploy foi refeito apos alterar variaveis na Vercel

### Midia nao aparece

Verifique:

- se o upload foi concluido
- se a midia esta ativa
- se a zona correta esta programada na timeline

### Video ou stream sem som

Verifique:

- se o volume do player esta acima de `0%`
- se o navegador ou TV Box permite autoplay com audio
- se o arquivo ou stream possui audio de origem

### Widget de tempo nao aparece

Verifique:

- se a zona foi criada como `stream`
- se a URL do bloco aponta para `/widget/tempo`
- se a cidade informada esta correta
- se o dispositivo tem acesso a internet para consultar a previsao

### Layout nao toca no player

Verifique:

- se o layout esta ativo
- se existem zonas cadastradas
- se as zonas possuem blocos na timeline
- se existe agendamento sobrescrevendo a exibicao

### RSS nao aparece

Verifique:

- se a fonte RSS esta ativa
- se a URL do feed esta valida
- se a zona ticker possui blocos RSS programados

## 16. Publicacao na Vercel

Variaveis importantes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `ADMIN_USERS_JSON`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Sempre que alterar variaveis:

1. Salve na Vercel
2. Rode um novo deploy
3. Teste o login em `/acesso`

## 17. Rotas de Uso Rapido

- Painel: `/dashboard`
- Login: `/acesso`
- Midias: `/midias`
- Layouts: `/layouts`
- Zonas: `/zonas`
- Timelines: `/timelines`
- Agendamentos: `/agendamentos`
- Player: `/player`
- Widget Tempo: `/widget/tempo?cidade=Jaguariuna&estado=SP&pais=BR&dias=10`
