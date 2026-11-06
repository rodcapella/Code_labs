# SapienteAI CodeBot Lab

Jogo educativo para aprender lógica de programação: controla um robô numa grelha isométrica, escrevendo comandos (`mover()`, `virar_direita()`, `virar_esquerda()`, `pegar()`) para recolher todas as caixas.

## Requisitos

- Node.js 18 ou superior

## Executar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: build de produção em `dist/`
- `npm run preview`: pré-visualizar o build
- `npm run lint`: verificação de tipos (`tsc --noEmit`)
- `npm test`: testes unitários (motor, ranking, regras da API, hook e componente)

## Estrutura

Organizado por área. Cada feature contém a sua UI, lógica e testes.

```
api/                              Função serverless do ranking (Vercel)
src/
  app/                            Entrada da aplicação, CSS global
  shared/                         Partilhado entre áreas
    components/                   Logo, Tooltip
    config/rules.ts               Limites e penalizações do jogo
    i18n/translations.ts          Textos em português e inglês
    types/game.ts                 Tipos (Layout, Level, GameState, ...)
    utils/audio.ts                Sons sintetizados
    assets/                       Logótipo e imagens de fundo
  features/
    home/                         Ecrã inicial
    onboarding/                   Configuração do utilizador
    game/
      GameScreen.tsx              Orquestra o nível (ecrã de jogo)
      components/                 Tabuleiro, robô, caixa, editor, overlays
      hooks/useProgramRunner.ts   Execução do programa (passo a passo)
      engine/                     Motor puro: interpreter, program, replay
      levels/                     Layouts (usados também pelo servidor) e níveis
    leaderboard/
      LeaderboardScreen.tsx       Ecrã do ranking
      leaderboardApi.ts           Cliente da API (com cópia local)
      domain/                     Pontuação, ordenação e validação (partilhadas com a API)
```

A regra de dependência: `features/*` pode importar de `shared/`, mas não de outras features
(exceto `game` → `leaderboard/domain`, para submeter resultados). `api/` importa de `features/*/engine`
e `features/*/domain`, nunca de componentes de UI.

## Ranking (Redis no Vercel)

O ranking é guardado num Redis (Upstash) e servido pela função `api/leaderboard.ts`.

### Configuração no Vercel

1. Importa o repositório no Vercel (framework: Vite).
2. Em **Marketplace → Upstash → Redis**, cria uma base de dados e liga-a ao projeto.
   Isto cria as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
3. Faz deploy. A API fica em `https://<projeto>.vercel.app/api/leaderboard`.

### Desenvolvimento local

`npm run dev` não serve a pasta `api/`. Para testar a API localmente:

```bash
npm i -g vercel
vercel link
vercel env pull .env.local   # traz as credenciais do Upstash
vercel dev                   # Vite + API no mesmo endereço
```

Sem API disponível, o jogo continua a funcionar e usa o ranking guardado no browser.

### Contrato da API

- `GET /api/leaderboard` → `{ entries: [...] }` (top 10 de cada nível), limite de 60 pedidos/min por IP
- `GET /api/leaderboard?level=2` → só o nível 2
- `POST /api/leaderboard` → `201 { ok, qualified: true, rank, score }` se entrou no top 10,
  `200 { ok, qualified: false, score }` se ficou fora (o resultado não é gravado), ou `400` / `422` / `429` com a razão.
  Empates exatos (mesma pontuação e tempo) são desempatados pela ordem do Redis.

O `POST` envia as **execuções** do jogador, não a pontuação:

```json
{
  "name": "Rui", "robotColor": "#2563EB", "date": "2026-10-26", "time": 42,
  "levelId": 1, "knowledgeLevel": "beginner", "language": "pt",
  "runs": [["mover()", "mover()", "pegar()"]]
}
```

### Como o servidor valida uma vitória

1. **Re-executa** cada execução com o mesmo motor do jogo (`src/engine/replay.ts`).
   Comandos, erros e passos são calculados no servidor.
2. Só a **última** execução pode vencer, e o nível tem de ficar completo.
3. Os erros têm de ficar abaixo do limite do nível de conhecimento enviado.
4. O **tempo** declarado tem de ser possível: pelo menos `passos × 0,3 s`,
   que é a velocidade mais rápida do jogo.
5. Há um limite de **5 submissões por minuto por IP** (`@upstash/ratelimit`, no mesmo Redis).

### Limitações que restam

- O tempo só tem um limite inferior. Um jogador pode demorar mais do que o real,
  o que só o prejudica, mas pode reduzir o tempo até ao mínimo possível.
- O servidor não sabe se as jogadas vieram de uma pessoa ou de um script
  que resolve o nível. Quem automatizar uma solução pode aparecer no ranking.
  Isto é aceitável para um ranking de jogo, mas não para prémios em dinheiro.
- O limite por IP usa o cabeçalho `x-forwarded-for`, que é fiável no Vercel.
  Em ligações partilhadas (escola, empresa), várias pessoas partilham o mesmo limite.

## Linguagem do jogo

| Comando | Níveis | Efeito |
|---|---|---|
| `mover()` | todos | Anda uma casa na direção atual |
| `virar_esquerda()` / `virar_direita()` | todos | Roda 90° |
| `pegar()` | todos | Recolhe a caixa em que está |
| `repetir(n) {` … `}` | intermédio e avançado | Repete o bloco `n` vezes (1–9) |
| `se_caixa() {` … `}` | avançado | Executa o bloco só se houver caixa por recolher na posição do robô |

`repetir` é expandido antes de executar (compilador em `features/game/engine/program.ts`).
`se_caixa` é decidido durante a execução: se não houver caixa, o bloco é saltado. O teste não é um comando, não conta e não gasta erros.
Um programa tem no máximo 500 instruções expandidas. Blocos aninhados são permitidos.
Erros de sintaxe não começam a execução e não contam como erros do jogo.

## Layouts aleatórios e tentativas

Cada partida tem um layout diferente: posição e direção iniciais do robô e posição das caixas.
O número de caixas e o tamanho da grelha são fixos por nível (`features/game/levels/generator.ts`).

- **Servidor:** `GET /api/leaderboard?attempt=N` cria uma tentativa com uma semente aleatória,
  guardada no Redis durante 30 minutos.
- **Cliente:** gera o layout a partir da semente (mesmo gerador determinístico do servidor).
- **Submissão:** o `POST` inclui o `attemptId`. A tentativa é consumida (`GETDEL`), por isso
  cada partida só pode ser submetida uma vez. O servidor recalcula o layout e re-executa as jogadas.
- **Sem servidor** (`npm run dev` sem `vercel dev`): o jogo usa uma semente local e o resultado
  fica só na cópia local, sem ir para o ranking.

Reiniciar mantém o layout. Tentar novamente e jogar de novo pedem uma tentativa nova.

## Contas (opcionais)

Jogar não exige conta. Com conta, o ranking usa o nome da conta e o jogador não escolhe o nome ao vencer.

- **Criar conta / entrar:** painel na página inicial. Nome de conta: 3 a 10 caracteres. Palavra-passe: 8 a 128.
- **Armazenamento:** `user:{nome em minúsculas}` no Redis, com a palavra-passe em `scrypt` (sal aleatório).
  Nunca em texto.
- **Sessão:** cookie `codebot_session`, `HttpOnly`, `SameSite=Lax`, válido 30 dias. Assinado com HMAC-SHA256.
  Não há tabela de sessões no servidor.
- **Rotas:** `GET /api/auth?action=me`, `POST /api/auth?action=register|login|logout`.
  Entrar e criar conta têm limite de 10 pedidos por minuto por IP.
- **Variável obrigatória para contas:** `AUTH_SECRET` (mínimo 32 caracteres, aleatório). Sem ela, as rotas
  de conta respondem `503` e o jogo continua anónimo. Gerar com `openssl rand -base64 48`.

Um nome de conta é único, sem distinguir maiúsculas. Um resultado enviado com sessão ativa fica com o nome da conta,
mesmo que o cliente envie outro.

## Login com Google (opcional)

Além de email e palavra-passe, a conta pode ser criada e usada com Google (OAuth 2.0 com PKCE).
O token do Google nunca chega ao browser: o servidor troca o código e cria ou encontra a conta.

**Configuração (Google Cloud Console → APIs e serviços → Credenciais → ID de cliente OAuth, tipo "Aplicação Web"):**

- URI de redirecionamento autorizado: `https://<APP_URL>/api/auth?action=google-callback`
  (o mesmo valor de `APP_URL`, sem barra final). Para desenvolvimento local, usa `http://localhost:3000/...`.
- Variáveis no Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`, `AUTH_SECRET`.
- Sem as três primeiras, o botão não aparece e a rota responde `503`.

**Regras:**

- Conta Google é identificada pelo `sub` do Google, não pelo email. Entrar de novo com a mesma conta Google reabre a mesma conta.
- Não há ligação automática por email. Contas com palavra-passe não têm o email verificado, e uma ligação automática
  permitiria tomar conta de um email alheio. Se o email do Google já estiver noutra conta, a conta Google é criada sem email.
- Contas só Google não têm palavra-passe e não podem entrar por email. Para as recuperar, basta entrar pelo Google.
- O nome de utilizador é sugerido a partir do nome Google (ou da parte local do email), limpo para 3 a 10 caracteres e com número se já existir.


## Segurança das contas (estado atual)

- **Registo confirmado por email.** O registo exige email e responde sempre `202`, exista ou não o nome ou o email.
  A conta só é criada quando o link de confirmação é aberto (válido 24 h, uso único). Quem já tem conta recebe um aviso.
- **Sessões revogáveis.** O cookie leva só um identificador opaco (256 bits). A sessão vive no Redis (30 dias).
  Logout apaga-a no servidor. Recuperar a palavra-passe ou apagar a conta termina todas as sessões da conta.
- **Links fora do URL de pedidos.** Recuperação e confirmação usam o fragmento (`#reset=`, `#confirm=`), que não é enviado
  ao servidor nem aparece nos registos de acesso. Os tokens são de uso único e guardados só em hash.
- **Ranking.** O tempo declarado não pode exceder o tempo real decorrido desde a criação da tentativa.
- **Limites.** Entrar e registar: 10 pedidos/min por IP e 5/min por nome de conta. Recuperar: 5/min por IP.
- **Variáveis obrigatórias.** `APP_URL` (links de email), `RESEND_API_KEY` e `MAIL_FROM` (envio), `AUTH_SECRET` (estado OAuth).

**Riscos que continuam abertos (aceites):**
- Automação: um script que resolva o nível pode entrar no ranking. Para prémios em dinheiro, não seria adequado.
- O tempo só tem limite superior (não pode ser maior do que o real), não inferior. Um jogador pode declarar um tempo menor
  do que demorou, desde que não seja menor do que o mínimo dos passos executados.
- Um nome de utilizador é visível publicamente no ranking e nos resultados de quem o usa.

## Obstáculos e currículo (versão 3)

| Obstáculo | Regra | Nível |
|---|---|---|
| Parede | Bloqueia o movimento | 5, 6, 7, 9 |
| Buraco | Pisar faz o robô cair: conta um erro e a execução **reinicia sozinha** do início (caixas voltam ao sítio). Esgotados os erros do nível, é game over | 6, 9 |
| Madeira | Bloqueia até `partir()` (conta como comando) | 8, 9 |

- `se_parede()` é verdadeiro perante parede, madeira ou borda. Um buraco não bloqueia, por isso não é "parede".
- A verificação de alcance do gerador trata buracos e paredes como bloqueados, por isso todo o layout tem solução sem cair.
- A versão 3 dos níveis reinicia o progresso e o ranking (os números dos níveis mudaram de tema).

## Portais (nível 10)

- Os portais azuis vão em pares. Entrar numa ponta transporta o robô para a outra, na mesma direção.
- `mover(n)` continua do lado do par com as casas que faltam.
- Caixas e a posição inicial nunca ficam em portais. Portais não são paredes, buracos nem madeira.
- A verificação de alcance do gerador considera o teletransporte.
- O nível 10 é o mais alto. A revisão (nível 9) já não é o último nível.
