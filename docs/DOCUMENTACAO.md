# SapienteAI CodeBot Lab — Documentação técnica e funcional

Versão de referência: commit `68437f1` (sequência de patches `0001`–`0048`). Atualizado para o MVP.
Projeto desenvolvido pela Sapiente AI.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Stack e dependências](#2-stack-e-dependências)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura do repositório](#4-estrutura-do-repositório)
5. [Motor do jogo](#5-motor-do-jogo)
6. [Regras do jogo](#6-regras-do-jogo)
7. [Níveis e currículo](#7-níveis-e-currículo)
8. [Geração de layouts e tentativas](#8-geração-de-layouts-e-tentativas)
9. [Ranking](#9-ranking)
10. [Contas e autenticação](#10-contas-e-autenticação)
11. [API HTTP](#11-api-http)
12. [Estados](#12-estados)
13. [Processos e fluxos](#13-processos-e-fluxos)
14. [Interface e acessibilidade](#14-interface-e-acessibilidade)
15. [Configuração e variáveis de ambiente](#15-configuração-e-variáveis-de-ambiente)
16. [Testes](#16-testes)
17. [Implementação e operação (Vercel)](#17-implementação-e-operação-vercel)
18. [Segurança](#18-segurança)
19. [Problemas conhecidos](#19-problemas-conhecidos)
20. [Possíveis melhorias](#20-possíveis-melhorias)
21. [Histórico de alterações](#21-histórico-de-alterações)
22. [Glossário](#22-glossário)

---

## 1. Visão geral

O **CodeBot Lab** é um jogo educativo para ensinar lógica de programação. O jogador controla um robô numa grelha isométrica e monta um programa, clicando em botões de comando, para recolher todas as caixas. Os conceitos aparecem em níveis progressivos: sequências, argumentos, direção, repetição, decisões, ciclos `enquanto`, paredes, buracos e madeira.

Funcionalidades principais:

- Onboarding (nome, idade, nível de conhecimento, idioma, cor do robô).
- 11 níveis com janela de conceito antes de cada um, incluindo portais e ordem de recolha.
- Motor de execução passo a passo, com pausa, desfazer, reiniciar, velocidade, pré-visualização do caminho e destaque da condição avaliada.
- Pontuação, estrelas por nível, ranking por nível (top 10) e modo demonstração.
- Contas opcionais (email e palavra-passe, ou Google) com "Os meus resultados".
- Definições: modo para daltónicos, reduzir movimento, texto grande, som, idioma e cor do robô.
- Versão web (SPA) publicada na Vercel, com API serverless e Redis gerido.

- Portais azuis que teletransportam o robô (nível 10).
- Caixas com ordem de recolha obrigatória (nível 11).
- Conquistas verificadas no servidor: Velocista, Mestre da Eficiência e Explorador Resiliente.
- Temas do tabuleiro (automático pela hora, laboratório diurno, cyberpunk noturno) e fundos diurnos e noturnos.
- Sons contextuais (superfície, portal, madeira, queda, erro e arpejo de vitória).
- Partilha da solução em GIF, gerado no navegador a partir da passagem vencedora.

Princípio central: **o motor do jogo é um único código, usado no browser e no servidor.** O servidor re-executa as jogadas para validar uma vitória, sem confiar no cliente.

---

## 2. Stack e dependências

| Camada | Tecnologia | Versão (package.json) |
|---|---|---|
| Interface | React + React DOM | 19 |
| Build | Vite | 6 |
| Linguagem | TypeScript | ~5.8 |
| Estilos | Tailwind CSS (v4, plugin Vite) | 4 |
| Animação | motion | 12 |
| Ícones | lucide-react | 0.546 |
| API | `@vercel/node` (tipos) | 27 |
| Base de dados | `@upstash/redis` (REST) | 1.40 |
| Limites de pedidos | `@upstash/ratelimit` | 2.2 |
| Testes unitários | Vitest, jsdom, Testing Library | — |
| Testes ponta a ponta | Playwright | — |

Dependências removidas por não serem usadas: `express`, `dotenv`, `@google/genai`.

---

## 3. Arquitetura

### 3.1 Camadas

```
┌──────────────────────────────────────────────────────────────┐
│ Interface (React)   app/ · features/*/ (ecrãs e componentes) │
├──────────────────────────────────────────────────────────────┤
│ Hooks / estado      useProgramRunner · AccountContext ·      │
│                     SettingsContext                          │
├──────────────────────────────────────────────────────────────┤
│ Motor puro          engine/ (compilador, interpretador,      │
│ (sem React)         simulador, re-execução)                  │
├──────────────────────────────────────────────────────────────┤
│ Domínio partilhado  shared/config (regras) · domain/ (ranking│
│                     e contas: validação, pontuação)          │
├──────────────────────────────────────────────────────────────┤
│ Serviços (cliente)  leaderboardApi · authApi                 │
├──────────────────────────────────────────────────────────────┤
│ API (Vercel)        api/leaderboard.ts · api/auth.ts         │
├──────────────────────────────────────────────────────────────┤
│ Servidor            server/ (sessões, contas, email, Google) │
├──────────────────────────────────────────────────────────────┤
│ Armazenamento       Redis (Upstash) · localStorage (browser) │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Regra de dependências

- `features/*` pode importar de `shared/`.
- Uma feature não importa de outra, com uma exceção: `game` usa `leaderboard/domain` e `leaderboard/leaderboardApi` para submeter resultados e calcular o top.
- `api/` importa do **motor** (`features/game/engine`, `features/game/levels`), do **domínio** (`features/*/domain`) e dos **módulos de servidor** (`features/auth/server`). Nunca importa componentes de UI.
- Ficheiros de imagem não podem ser importados pelo servidor. Por isso o layout dos níveis (`generator.ts`) é separado dos metadados (`levelN.ts`, que importam imagens).

### 3.3 Decisões de arquitetura

| Decisão | Motivo |
|---|---|
| Motor puro partilhado browser/servidor | O servidor valida vitórias por re-execução. |
| `repetir` expandido em tempo de compilação | Mantém a execução linear: pausa, undo e validação ficam simples. |
| `se_caixa`, `se_parede`, `enquanto` com instruções de salto | A condição depende do estado; não pode ser expandida. |
| Layout gerado por semente emitida pelo servidor | O jogador não escolhe um layout favorável. |
| Tentativa de uso único (`GETDEL`) | Impede submeter duas vezes a mesma partida. |
| Decisão de entrada no top feita no servidor | A resposta é exata mesmo com submissões concorrentes. |
| Sessões guardadas no Redis (não assinadas) | Logout e recuperação revogam de facto as sessões. |
| Registo confirmado por email | Não revela se um nome ou email já existe. |
| Tokens no fragmento do URL (`#reset=`, `#confirm=`) | O fragmento não chega ao servidor nem aos registos de acesso. |
| Janelas em portal | `position: fixed` dentro de elementos com `transform` sai do ecrã em telemóveis. |
| Versões do currículo e do ranking | Renumerar níveis muda o tema; resultados antigos deixam de ser comparáveis. |

---

## 4. Estrutura do repositório

```
api/
  leaderboard.ts            GET ranking · GET tentativa · POST submissão
  auth.ts                   Contas: registo, confirmação, login, logout, email,
                            recuperação, apagar, Google OAuth, resultados
e2e/
  mobile.spec.ts            Testes Playwright em emulação de telemóvel
src/
  app/
    App.tsx                 Máquina de ecrãs, perfil, providers
    index.css               Tema, fontes, animações, modo daltónicos
    main.tsx                Entrada React
  shared/
    components/             Logo, Tooltip, Modal, Portal, ArcadeLoader, Footer,
                            SettingsContext/Modal
    config/
      rules.ts              Constantes de regras (erros, tempos, limites, versões)
      robotPalette.ts       12 cores do robô
      settings.ts           Preferências de acessibilidade e som (persistência)
    i18n/translations.ts    Todos os textos (PT e EN)
    types/game.ts           Tipos: LayoutConfig, LevelMeta, GameState, Position…
    utils/audio.ts          Sons sintetizados (Web Audio), com interruptor global
  features/
    home/HomeScreen.tsx     Ecrã inicial: níveis, conta, definições, recuperação
    onboarding/             Configuração inicial do perfil
    game/
      GameScreen.tsx        Orquestra um nível (estado da tentativa, vitória, ranking)
      components/           Grid, Robot, Box, CodeEditor, ControlPanel, GameHeader,
                            LevelIntroModal, LevelTimer, LevelComplete,
                            GameOverOverlay, VictoryOverlay
      hooks/useProgramRunner.ts   Execução passo a passo
      engine/
        interpreter.ts      Executa um comando sobre um estado (função pura)
        program.ts          Compilador e condições de teste
        preview.ts          Simulação do caminho (pré-visualização)
        replay.ts           Re-execução de tentativas (servidor)
        hints.ts            Dicas contextuais e parede destacada
        structures.ts       Contagem de estruturas (desconto de pontuação)
      levels/
        generator.ts        Especificação dos níveis e geração de layouts
        level1..level9.ts   Metadados: cores, textos de conceito, dicas
      testing/              Fixtures e resolvedor (só para testes)
    leaderboard/
      LeaderboardScreen.tsx Ranking por nível, modo demonstração
      RankingNameEntry.tsx  Pedido de nome quando entra no top
      leaderboardApi.ts     Cliente da API, com cópia local
      domain/
        leaderboard.ts      Pontuação, ordenação, cópia local, top
        leaderboardRules.ts Validação de envios e nomes (partilhada com a API)
    auth/
      AccountContext.tsx    Estado da sessão para a interface
      AccountPanel.tsx      Entrar, criar conta, recuperação, email, apagar,
                            confirmação e reposição de palavra-passe
      MyResultsScreen.tsx   "Os meus resultados"
      authApi.ts            Cliente das rotas de conta
      domain/authRules.ts   Regras de nome de conta e palavra-passe
      server/
        session.ts          Hash de palavra-passe, identificadores de sessão, cookies
        accounts.ts         Modelo de dados das contas, sessões, tokens, resultados
        mailer.ts           Envio de email (Resend) e URL pública
        google.ts           OAuth 2.0 com PKCE
vercel.json                 Cabeçalhos de segurança (CSP, HSTS, …)
playwright.config.ts        Perfis móveis e servidor de teste
```

---

## 5. Motor do jogo

Todo o código deste capítulo é puro (sem React e sem efeitos), exceto onde indicado.

### 5.1 Modelo de dados

**`LayoutConfig`** — geometria de uma partida (gerada por semente):

| Campo | Tipo | Significado |
|---|---|---|
| `gridSize` | number | Lado da grelha quadrada |
| `initialRobotPosition` | Position | Casa inicial do robô |
| `initialRobotDirection` | `NORTH`\|`EAST`\|`SOUTH`\|`WEST` | Direção inicial |
| `boxes` | Position[] | Caixas a recolher |
| `walls` | Position[] | Paredes (bloqueiam) |
| `holes` | Position[] | Buracos (fazem cair) |
| `wood` | Position[] | Madeira (bloqueia até `partir()`) |

**`LevelMeta`** — metadados estáticos: `id`, `intro` (PT/EN), `colors` (`robot`, `box`, `grid`), `hints` (PT/EN), `backgroundImage` (opcional).

**`LevelConfig`** = `LevelMeta & LayoutConfig`. É o que o hook recebe.

**`GameState`** — estado de uma execução:

| Campo | Significado |
|---|---|
| `gridSize`, `robotPosition`, `robotDirection` | Posição do robô |
| `boxes[]` (`id`, `position`, `collected`) | Caixas e se já foram recolhidas |
| `walls`, `holes`, `wood` | Obstáculos (copiados do layout) |
| `currentLine` | Linha do editor a destacar (linha de origem) |
| `error` | Mensagem de erro traduzida, ou `null` |
| `fell` | `true` se o último comando fez o robô cair |
| `victory` | `true` quando todas as caixas foram recolhidas |
| `commandCount` | Comandos executados com sucesso nesta passagem |

**`Instruction`** — instrução executável, já expandida pelo compilador:

- `{ kind: 'cmd', text, sourceLine }` — um comando do motor.
- `{ kind: 'check', cond: 'box'|'room'|'blocked', sourceLine, skipTo }` — teste; se for falso, salta para `skipTo`.
- `{ kind: 'jump', target, sourceLine }` — salto incondicional (volta ao teste do `enquanto`, ou fim do ramo `se` antes do `senao`).

`sourceLine` é a linha do editor de onde a instrução vem. Assim o destaque aponta para o texto escrito pelo jogador, e não para a versão expandida.

### 5.2 Comandos

| Comando (PT / EN) | Efeito | Conta como comando? |
|---|---|---|
| `mover()` / `move()` | Anda uma casa na direção atual | Sim |
| `mover(n)` / `move(n)` (n=1..9) | Anda n casas; **tudo-ou-nada** (se uma casa for parede, borda ou madeira, nada se move) | Sim |
| `virar_esquerda()` / `turn_left()` | Roda 90° anti-horário | Sim |
| `virar_direita()` / `turn_right()` | Roda 90° horário | Sim |
| `pegar()` / `pick()` | Recolhe a caixa da casa atual; erro se não houver | Sim |
| `partir()` / `break()` | Remove a madeira à frente; erro se não houver | Sim |
| `repetir(n) { … }` / `repeat(n) { … }` (n=1..9) | Repete o bloco n vezes. Expandido na compilação | Não (o conteúdo conta) |
| `se_caixa() { … }` / `if_box() { … }` | Executa se houver caixa por recolher na casa atual | Não |
| `se_parede() { … }` / `if_wall() { … }` | Executa se a casa à frente for borda, parede ou madeira | Não |
| `senao { … }` / `else { … }` | Ramo alternativo; **só logo após um `se_caixa`** | Não |
| `enquanto_livre() { … }` / `while_free() { … }` | Repete enquanto a casa à frente for livre (dentro da grelha, sem parede nem madeira; buraco conta como livre) | Não |
| `}` | Fecha um bloco | Não |

Regras de disponibilidade por nível de conhecimento (ver 6.1):

- Iniciante: sequências.
- Intermédio: + `repetir`.
- Avançado: + `se_caixa`, `se_parede`, `senao`, `enquanto_livre`.
- `mover(n)` aparece no painel a partir do nível 2; `partir()` a partir do nível 8.

### 5.3 Compilador (`program.ts`)

`compileProgram(linhas, idioma, opções)` produz `Instruction[]` ou um erro de compilação.

Passos:

1. Normaliza as linhas (trim, remove vazias).
2. Lê blocos por recursão. Cada nó é `cmd`, `if` (com `cond` `box` ou `blocked` e `elseBody` opcional) ou `while`.
3. `repetir(n)` copia o corpo n vezes e conta o tamanho.
4. Linearização: `if` vira `check` + corpo (+ `jump` + ramo `senao`); `while` vira `check(room)` + corpo + `jump` de volta.
5. Verifica o limite de instruções expandidas (500).

Erros de compilação (não iniciam a execução e **não contam como erro de jogo**):

| Motivo | Causa |
|---|---|
| `unclosed` | Bloco sem `}` (aponta para a linha de abertura) |
| `unexpectedEnd` | `}` sem bloco aberto |
| `repeatCount` | n fora de 1–9 |
| `loopsNotAllowed` | `repetir` num nível iniciante |
| `conditionalNotAllowed` | `se_caixa`, `se_parede` ou `enquanto` fora do nível avançado |
| `elseWithoutIf` | `senao` sem `se_caixa` imediatamente antes |
| `tooLong` | Mais de 500 instruções expandidas |

### 5.4 Interpretador (`interpreter.ts`)

`executeCommand(estado, comando, idioma) → novoEstado` é uma **função pura**: não altera o estado recebido.

- **Sucesso:** devolve o novo estado com `error = null`, `fell = false` e `commandCount + 1`.
- **Falha:** devolve o estado com `error` preenchido e **sem** incrementar `commandCount`.
- **Queda:** `mover`/`mover(n)` numa casa com buraco devolve `fell = true` e `error = errorHole`, com `robotPosition` na casa do buraco.

Ordem de verificação de `mover`:

1. Fora da grelha → erro `errorOutOfBounds`.
2. Parede ou madeira → erro (`errorWall` ou `errorWood`); o robô não se move.
3. Buraco → queda (`fell`).
4. Caso contrário, move-se.

### 5.5 Condições de teste (`checkCondition`)

| Condição | Verdadeira quando |
|---|---|
| `box` | Há caixa por recolher na casa do robô |
| `room` | A casa à frente existe e não é parede nem madeira (buraco é "livre") |
| `blocked` | Não é `room` (borda, parede ou madeira) |

Esta função é a **mesma** no hook e no servidor.

### 5.6 Execução (`useProgramRunner.ts`)

Ver a máquina de estados da execução em 12.1 e o processo em 13.3. Em resumo:

- Cada instrução é agendada com `setTimeout(velocidade)`; cada passo muda o estado e o efeito seguinte é reagendado.
- `stepsRef` conta os passos da passagem. Limite: **1000** (`MAX_RUN_STEPS`). Ultrapassado, é erro (ciclo sem fim).
- `history` guarda `{estado, pc, passos}` por passo, para o **desfazer**.
- Uma queda **reinicia a execução sozinha**: o estado volta ao inicial, `pc = 0`, `errors + 1`. Só para se `errors + 1 >= maxErrors` (game over).
- Um erro normal (parede, borda, sem caixa, comando inválido) para a execução e conta 1 erro.

### 5.7 Simulação (`preview.ts`)

`previewPath(layout, linhas, idioma, opções, maxErros)` executa o programa **sem animação** e devolve a lista de casas visitadas (numeradas). Segue as mesmas regras que o hook: quedas reiniciam, com o limite de erros. Não altera nada no jogo.

### 5.8 Re-execução no servidor (`replay.ts`)

`replayAttempt(layout, execuções[], idioma, nível)` valida uma submissão:

- Cada execução é compilada com as mesmas opções do nível e executada com o mesmo motor.
- Queda: `errors + 1`; se atingir o limite → falha; senão reinicia `pc = 0`.
- Erro normal: a execução termina com 1 erro.
- Só a **última** execução pode vencer; vitória numa execução anterior é rejeitada.
- Conta os **passos** (para a verificação de tempo) e devolve `structureBonus`.

### 5.8a Mínimo absoluto de comandos (`optimal.ts`)

`minimumCommands(layout)` calcula o menor número de comandos que vence um layout, por pesquisa em largura sobre os estados do tabuleiro (casa, direção, caixas recolhidas, madeira partida). Cada comando custa 1. As regras do motor são espelhadas e verificadas por teste contra o próprio motor. Acima de 400 000 estados a pesquisa desiste e devolve `null`. Ver riscos aceites (secção 23).

### 5.9 Dicas contextuais (`hints.ts`)

`contextualHint(erro)` escolhe a dica pela mensagem de erro (parede, borda, sem caixa, ciclo, `mover(n)`, buraco, madeira, `partir()` sem madeira, comando desconhecido).
`blockedCellAhead(estado)` devolve a primeira parede na direção do robô, para a destacar no tabuleiro.

---

## 6. Regras do jogo

### 6.1 Níveis de conhecimento (escolhido no onboarding)

| Nível | Comandos extra | Erros permitidos por tentativa |
|---|---|---|
| Iniciante (`beginner`) | — | 10 |
| Intermédio (`intermediate`) | `repetir` | 6 |
| Avançado (`advanced`) | `se_caixa`, `se_parede`, `senao`, `enquanto_livre` | 3 |

Os limites `MAX_ERRORS_BY_LEVEL` estão em `shared/config/rules.ts`.

### 6.2 Erros

- **Erro de jogo:** falha de um comando durante a execução (parede, borda, sem caixa, comando inválido, ciclo sem fim). Para a execução e conta 1.
- **Queda:** um buraco. Conta 1, e a execução reinicia sozinha.
- **Erro de compilação:** não conta (ver 5.3).
- Os erros **acumulam entre execuções** até ao reinício da tentativa.
- Ao atingir o limite do nível de conhecimento: **game over** (ecrã de fim, com "Tentar novamente", que pede uma tentativa nova).

### 6.3 Pontuação

```
pontuação = max(0,  comandos
                  + 2 × erros
                  + ⌊tempo_em_segundos / 10⌋
                  − 3 × tipos_de_estrutura_usados)
```

- `comandos`: comandos com sucesso da **última passagem** (a que venceu).
- `erros`: erros de toda a tentativa (incluindo quedas).
- `tipos_de_estrutura_usados`: quantos dos três tipos aparecem na última passagem — `repetir` (1), decisões `se_caixa`/`se_parede`/`senao` (1), `enquanto_livre` (1). Máximo 3 tipos = desconto máximo de 9 pontos. Conta tipos, não blocos.
- Menor é melhor. Em empate, ganha o menor tempo.

O **tempo** é o cronómetro do nível: começa na primeira execução e para na pausa e na vitória.

### 6.4 Estrelas

Calculadas na vitória e guardadas no perfil (só sobe a melhor classificação):

| Estrelas | Condição |
|---|---|
| 1 | Nível concluído |
| 2 | No máximo 1 erro |
| 3 | Sem erros **e** comandos ≤ `2 × caixas + tamanho da grelha` |

### 6.5 Vitória

Vence quem recolhe todas as caixas. A vitória é verificada pelo motor (`victory = true`).

### 6.6 Controlos de jogo

| Controlo | Comportamento |
|---|---|
| Executar | Compila e começa a execução (ou retoma, se em pausa) |
| Pausar | Interrompe o agendamento; o relógio para |
| Desfazer | Volta um passo (só com a execução parada) |
| Reiniciar | Repõe o robô, os erros, o tempo e **limpa a consola**; mantém o layout da tentativa |
| Velocidade | 1,0 s, 0,6 s ou 0,3 s por passo |
| Limpar | Apaga o código da consola (fora da execução) |
| Dica | Até um número de dicas por nível de conhecimento |
| Pré-visualizar caminho | Mostra as casas que o programa visitaria, numeradas (não executa) |

Editar o código invalida a pré-visualização.

### 6.7 Ranking, nome e conta

- Entra no top 10 do nível se houver vaga ou se for estritamente melhor que o 10.º (empate não entra).
- Com conta, o nome é o da conta; sem conta, o jogador escreve 1 a 10 caracteres.
- A verificação de entrada é feita primeiro no cliente (para mostrar o campo do nome) e depois no servidor (decisão final).

### 6.8a Portais

- Os portais vêm em pares. Entrar numa ponta transporta o robô para a outra, na mesma direção.
- O robô nunca para dentro de um portal. `mover(n)` continua do lado do par com as casas que faltam.
- Caixas e a posição inicial nunca ficam em portais. Portais não são paredes, buracos nem madeira.
- A verificação de alcance do gerador considera o teletransporte.

### 6.8b Ordem de recolha (nível 11)

- Cada caixa tem um número de 1 a N, sorteado por partida com a semente.
- `pegar()` só recolhe a caixa com o número mais baixo ainda por recolher. Tentar outra é um erro normal (conta como erro, a caixa não é recolhida).
- A próxima caixa a apanhar aparece destacada com um anel. Os números são visíveis sem depender da cor.

### 6.8c Conquistas (distintivos)

| Conquista | Condição | Quem verifica |
|---|---|---|
| Velocista | Vencer um nível em menos de 30 s | Servidor (tempo validado contra a tentativa) |
| Mestre da Eficiência | Vencer com o número mínimo absoluto de comandos do layout | Servidor (mínimo calculado por pesquisa em largura) |
| Explorador Resiliente | Cair num buraco ou bater numa parede durante a tentativa e, mesmo assim, vencer | Servidor (re-execução) |

- Sem vitória não há conquista. Sem mínimo calculado (layout grande), não há "Mestre da Eficiência".
- A verificação é feita por `POST /api/leaderboard?action=badges`, que **não gasta a tentativa**: o resultado pode ser submetido ao ranking depois.
- Com conta, as conquistas ficam guardadas no servidor. Sem conta, ficam no perfil do navegador.

### 6.8d Partilha da solução (GIF)

- Depois de vencer, o jogador pode criar um GIF curto da passagem vencedora. A animação reexecuta as jogadas, desenha cada estado e codifica tudo no navegador.
- O GIF mostra o nível, a pontuação, as estrelas e o endereço do site. Não mostra o nome do jogador.
- Em telemóveis, a folha nativa de partilha leva o GIF, o texto e o link. Noutros casos, o ficheiro é descarregado.

### 6.8 Limites técnicos

| Limite | Valor |
|---|---|
| Instruções expandidas por programa | 500 |
| Passos por passagem (ciclos sem fim) | 1000 |
| Repetições em `repetir` | 1–9 |
| Casas em `mover(n)` | 1–9 |
| Execuções por submissão | 50 |
| Linhas por execução | 200 |
| Caracteres por linha | 40 |
| Velocidade mínima de passo (validação de tempo) | 300 ms |

---

## 7. Níveis e currículo

Versão 3 do currículo (`levelsVersion = 3`).

| # | Tema | Grelha | Caixas | Paredes | Buracos | Madeira | Comandos novos |
|---|---|---|---|---|---|---|---|
| 1 | Sequências | 6×6 | 6 | 0 | 0 | 0 | `mover()`, virar, `pegar()` |
| 2 | Argumentos | 8×8 | 6 | 0 | 0 | 0 | `mover(n)` |
| 3 | Direção | 8×8 | 8 | 0 | 0 | 0 | — |
| 4 | Repetir | 10×10 | 12 | 0 | 0 | 0 | `repetir(n) {}` |
| 5 | Decisões | 12×12 | 16 | 2 | 0 | 0 | `se_caixa`, `senao` |
| 6 | Enquanto e buracos | 10×10 | 8 | 4 | 2 | 0 | `enquanto_livre`, `se_parede` |
| 7 | Enquanto com paredes | 10×10 | 8 | 6 | 0 | 0 | — |
| 8 | Madeira | 10×10 | 8 | 0 | 0 | 4 | `partir()` |
| 9 | Revisão | 10×10 | 10 | 3 | 1 | 1 | — (junta tudo) |
| 10 | Portais | 10×10 | 8 | 3 | 0 | 0 | Portais azuis em pares (teletransporte) |
| 11 | Ordem de recolha | 10×10 | 6 | 3 | 0 | 0 | Caixas numeradas com ordem obrigatória; portais |

Cada nível tem um texto de conceito (PT/EN) mostrado numa janela antes de começar, e dicas (PT/EN) usadas no botão de dica.

Cores por nível (grelha / caixas): 1 azul / azul claro; 2 laranja; 3 violeta; 4 verde; 5 âmbar; 6 teal; 7 rosa; 8 castanho/âmbar (madeira); 9 rosa forte. Cores exatas em `levelN.ts`.

O nível 11 é o mais alto. Acrescentar um nível exige: entrada em `LEVEL_SPECS`, `LEVEL_IDS` (rules.ts), ficheiro `levelN.ts`, lista `LEVELS` em `GameScreen.tsx`, e subir `levelsVersion` / `RANKING_VERSION` se a numeração mudar.

---

## 8. Geração de layouts e tentativas

### 8.1 Gerador (`generator.ts`)

`generateLayout(nível, semente)` é **determinístico**: a mesma semente dá sempre o mesmo layout. Passos:

1. Cria a lista de todas as casas da grelha.
2. Baralha com Fisher–Yates usando o PRNG **mulberry32**.
3. Atribui: 1.ª casa → robô; seguintes → caixas; depois paredes, buracos e madeira (contagens em `LEVEL_SPECS`).
4. Sorteia a direção inicial.
5. **Verificação de alcance:** por pesquisa em largura, todas as caixas têm de ser alcançáveis a partir do robô, tratando paredes e buracos como bloqueados (madeira é atravessável, porque pode ser partida). Se falhar, repete com o mesmo gerador (até 200 tentativas).

Garantias: nenhuma peça sobre outra; robô e caixas fora de paredes; layout sempre com solução sem cair num buraco.

### 8.2 Tentativa (`/api/leaderboard?attempt=N`)

- O servidor cria `attemptId` (UUID) e uma semente de 32 bits, e guarda `{levelId, seed, createdAt}` no Redis durante **30 minutos**.
- O cliente gera o layout com a semente recebida.
- O servidor, ao validar, regenera o layout com a mesma semente.

Quando muda o layout: ao abrir um nível, ao avançar, ao "Tentar novamente" e ao "Jogar de novo". **Reiniciar mantém o layout.**

Sem servidor (desenvolvimento): o cliente usa uma semente aleatória local; a partida é jogável, mas não vai para o ranking.

---

## 9. Ranking

### 9.1 Modelo de dados (Redis)

| Chave | Tipo | Conteúdo |
|---|---|---|
| `leaderboard:v3:level:{n}` | Sorted set | Top 10 do nível n; membro = JSON da entrada; score = `pontuação × 100000 + min(tempo, 99999)` |
| `attempt:{uuid}` | String JSON | `{levelId, seed, createdAt}`, TTL 30 min, consumida ao submeter |

A versão do ranking está em `RANKING_VERSION` (`shared/config/rules.ts`), usada por `keyFor`. Versão atual: **3**.

Entrada do ranking: `{id, name, levelId, commands, errors, time, date, robotColor, structureBonus?}`.

### 9.2 Fluxo de submissão

1. O cliente, na vitória, calcula a entrada e o desconto de estruturas.
2. Consulta o ranking e decide se **mostra** o campo do nome (`qualifiesForTop`).
3. O jogador confirma o nome (ou usa o da conta).
4. O cliente envia `POST /api/leaderboard` com `attemptId`, `name`, `robotColor`, `date`, `time`, `levelId`, `knowledgeLevel`, `language` e `runs` (as execuções, não o resultado).
5. O servidor:
   1. valida a forma do envio (`validateSubmission`);
   2. consome a tentativa (`GETDEL`) — uso único;
   3. confirma o nível e que o **tempo declarado não excede** o tempo real desde a criação da tentativa (+5 s de folga);
   4. re-executa as execuções (`replayAttempt`) e obtém comandos, erros, passos e desconto;
   5. verifica que o tempo declarado é possível para os passos (`isTimePlausible`: ≥ passos × 0,3 s − 1 s);
   6. grava no sorted set, consulta a posição; se ficar fora do top 10, remove e **não** grava;
   7. se houver conta, regista o resultado em "Os meus resultados" (últimos 100), dentro ou fora do top;
   8. responde `201 {qualified: true, rank, score}` ou `200 {qualified: false, score}`.
6. O cliente mostra "guardado", "fora do top", "o ranking mudou" ou erro.

Limites de pedidos: submissões 5/min por IP; leituras 60/min por IP.

### 9.3 Ecrã do ranking

- Separadores por nível (1 a 9), cada um com o top 10.
- Colunas: posição, nome, pontos, comandos (com erros entre parênteses), tempo.
- Carregamento estilo arcade até o servidor responder (com cópia local como fallback).
- **Modo demonstração:** se o nível selecionado estiver vazio, volta ao início após 5 s (`DEMO_RETURN_MS`). Qualquer toque ou tecla cancela para essa visita.

---

## 10. Contas e autenticação

Opcionais. O jogo funciona sem conta. Para as contas, `AUTH_SECRET` é obrigatório (assina o estado do OAuth); sem ele, as rotas de conta respondem `503`.

### 10.1 Modelo de dados (Redis)

| Chave | Conteúdo | Vida |
|---|---|---|
| `user:{nome minúsculas}` | `{id, username, passwordHash, createdAt, email?, googleSub?}` | Permanente |
| `userid:{id}` | Nome de utilizador (para validar sessões) | Permanente |
| `email:{email}` | `id` do utilizador dono do email (único) | Permanente |
| `google:{sub}` | `id` do utilizador ligado a esse Google | Permanente |
| `session:{sid}` | `{userId, username}` | 30 dias |
| `sessions-of:{userId}` | Conjunto de `sid` da conta | 30 dias |
| `pending:{hash do token}` | `{username, email, passwordHash}` (registo por confirmar) | 24 h |
| `reset:{hash do token}` | `{userId}` (recuperação) | 30 min |
| `results:{userId}` | Lista JSON dos últimos 100 resultados | Permanente |
| `badges:{userId}` | Conjunto dos distintivos ganhos pela conta | Permanente |
| `rl:auth`, `rl:auth-user`, `rl:confirm`, `rl:forgot`, `rl:get`, `rl:post` | Contadores de limites | Janela de 1 min |

Palavras-passe: `scrypt$<sal>$<hash>` (sal de 16 bytes, hash de 64 bytes), comparação em tempo constante. Tokens de uso único: 256 bits aleatórios; no Redis só fica o SHA-256.

### 10.2 Sessão

- Cookie `codebot_session` com um **identificador opaco** (256 bits, base64url), `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 30 dias, `Secure` em produção.
- Validação: o identificador tem de existir em `session:{sid}` **e** a conta ter de existir em `userid:{id}`. Conta apagada → sessão inválida.
- **Logout:** apaga `session:{sid}` e remove-o do conjunto da conta. Um cookie copiado deixa de valer.
- **Recuperar palavra-passe** e **apagar conta:** terminam todas as sessões da conta (`sessions-of`).

### 10.3 Fluxos

**Registo (confirmado por email)**
1. Pede nome (3–10), palavra-passe (8–128) e email. Requer `APP_URL`, `RESEND_API_KEY` e `MAIL_FROM` (senão `503`).
2. Calcula sempre o hash (para o tempo não revelar nada).
3. Se o nome ou o email já existirem: **não cria nada** e envia um aviso ao email.
4. Se estiverem livres: guarda `pending:{hash}` e envia o link `#confirm=TOKEN` (24 h).
5. Responde **sempre `202`** (sem diferença visível).
6. Ao abrir o link, o cliente chama `confirm`: `GETDEL` do pending, cria a conta com `SET NX` (nome e email), cria a sessão e responde `201`.

**Entrar:** nome + palavra-passe. Verifica sempre um hash (mesmo para nomes inexistentes). Limites: 10/min por IP e 5/min por nome. Resposta genérica em caso de erro.

**Alterar email (com conta):** exige a palavra-passe quando a conta tem uma. Email único.

**Recuperar palavra-passe**
1. `forgot` com email: resposta `200` sempre. Se o email existir e pertencer a uma conta, envia o link `#reset=TOKEN` (30 min).
2. `reset` com token e nova palavra-passe: `GETDEL` do token (uso único), atualiza o hash e **termina todas as sessões** da conta.
3. O link usa só `APP_URL` (nunca o cabeçalho `Host`).

**Login com Google (OAuth 2.0 + PKCE)**
1. `google-start`: gera `state` e `code_verifier`, guarda-os num cookie `oauth_state` assinado (10 min, path `/api/auth`) e redireciona para o Google.
2. `google-callback`: valida `state`, troca o código por token no servidor (com o verificador), lê o perfil (`sub`, email verificado, nome).
3. Conta já ligada a este `sub` → reutiliza. Senão cria conta (nome sugerido a partir do nome ou da parte local do email, com sufixo se ocupado). O email só é ligado se **verificado pelo Google e livre**.
4. Nunca se liga automaticamente a uma conta existente por email (os emails das contas por palavra-passe não estão verificados).
5. Redireciona para `/?google=ok` ou `/?google=error`, com a sessão criada.

**Apagar conta:** exige a palavra-passe (exceto contas só Google, que não têm palavra-passe e usam a sessão ativa). Termina sessões, apaga utilizador, email, ligação Google e resultados.

**Os meus resultados:** lista os últimos 100 resultados da conta (incluindo os fora do top), com data, nível, pontos, comandos, erros, tempo e estado no ranking.

### 10.4 Regras de nomes e palavras-passe

- Nome de conta: 3 a 10 caracteres de letras (com acentos), números, `.`, `-`, `_`. Sem espaços. Único sem distinguir maiúsculas.
- Nome no ranking: 1 a 10 caracteres com as mesmas classes (incluindo espaço). Guardado em maiúsculas.
- Palavra-passe: 8 a 128 caracteres, sem outras regras de composição.
- Email: formato simples `x@y.z`, até 254 caracteres, normalizado para minúsculas.

---

## 11. API HTTP

Duas funções serverless: `api/leaderboard.ts` e `api/auth.ts`. Todas as respostas de conta têm `Cache-Control: no-store` quando lêem dados de sessão.

### 11.1 `/api/leaderboard`

| Método | Parâmetros | Resposta | Códigos |
|---|---|---|---|
| GET | — | `{entries: [...]}` (top 10 de cada nível) | 200, 429 |
| GET | `?level=n` | Top 10 do nível n | 200, 400 (nível inválido), 429 |
| GET | `?attempt=n` | `{attemptId, levelId, seed}` | 200, 400, 429 |
| POST | corpo JSON (ver 9.2) | `201 {qualified: true, rank, score, badges}` ou `200 {qualified: false, score, badges}` | 201, 200, 400, 422, 429, 500 |
| POST | `?action=badges` + corpo JSON | `200 {badges}` (não gasta a tentativa) | 200, 400, 422, 429 |

Erros 422 da submissão: tentativa inválida ou expirada; nível não corresponde; tempo maior do que o decorrido; sem execuções; última execução não completa o nível; limite de erros excedido; tempo impossível; programa inválido.

### 11.2 `/api/auth` (`?action=`)

| Método | Ação | Autenticação | Função | Respostas principais |
|---|---|---|---|---|
| GET | `me` | opcional | Estado da sessão e configuração | 200 `{configured, googleEnabled, account}` |
| GET | `results` | sessão | Resultados da conta | 200 `{results}`, 401 |
| GET | `google-start` | — | Redireciona para o Google | 302, 503 |
| GET | `google-callback` | cookie `oauth_state` | Conclui o login Google | 302 `?google=ok|error` |
| POST | `register` | — | Pedido de registo (confirmação por email) | 202, 400, 429, 503 |
| POST | `confirm` | — | Cria conta a partir do token | 201, 400, 409, 429 |
| POST | `login` | — | Entrar | 200, 400, 401, 429 |
| POST | `logout` | opcional | Termina a sessão | 200 |
| POST | `set-email` | sessão | Liga/altera email | 200, 400, 401, 403, 409 |
| POST | `forgot` | — | Pede link de recuperação | 200 (sempre), 429, 503 |
| POST | `reset` | — | Define nova palavra-passe | 200, 400 |
| POST | `delete` | sessão | Apaga a conta | 200, 401, 403 |

Qualquer ação não listada responde `404`. Sem `AUTH_SECRET`, as ações de conta respondem `503` (exceto `me`, que responde `configured: false`, e `logout`).

---

## 12. Estados

### 12.1 Execução (`useProgramRunner`)

| Estado | Significado | Transições |
|---|---|---|
| `idle` | Parado (sem execução ativa) | → `running` (Executar); → `idle` (fim do programa, erro, game over) |
| `running` | Passos agendados | → `paused` (Pausar); → `idle` (fim, erro, vitória, game over) |
| `paused` | Agendamento suspenso | → `running` (Retomar/Executar) |

Sinais derivados: `isExecuting = status ≠ idle`, `isPaused = status = paused`.

Efeitos de cada evento de passo: `move`, `turn`, `pick`, `step` (sons e fala do robô); `fall` (embate e aviso, **sem** janela); `error` (janela com dica); `victory`; `gameover`.

### 12.2 Tentativa (ecrã de jogo)

| Estado | Como se reconhece |
|---|---|
| A preparar | `ready = false` (a aguardar `fetchAttempt`); tabuleiro coberto pelo carregamento |
| Pronto | `ready = true`; executar permitido |
| Em jogo | `started = true` |
| Game over | `isGameOver = errors ≥ maxErrors`; overlay de fim |
| Vitória | `gameState.victory = true`; overlay de vitória, estrelas e nome/ranking |

### 12.3 Submissão ao ranking (`GameScreen`)

`RankingStatus`: `checking` → `enter` (pede nome) ou `out` (não entra) → `sending` → `sent` | `rejected` (servidor disse que não entrou) | `error`.

### 12.4 Sessão (cliente)

`AccountContext`: `loading` (a pedir `me`) → `anónimo` (`account = null`) ou `com conta` (`account = {username, email}`). `configured = false` quando o servidor não tem contas: a interface esconde o painel.

### 12.5 Registo e confirmação

`AccountPanel`: `closed` → `auth` (entrar/criar) → `forgot` (recuperar). Após registo aceite (`202`): mensagem "enviámos um email" (sem sessão). `ConfirmSignupPanel`: `busy` → `done` | `error`.

### 12.6 Cronómetro

Corre quando `started && !isPaused && !victory`. Pausa com a execução; para na vitória.

---

## 13. Processos e fluxos

### 13.1 Arranque

1. `main.tsx` monta `App`.
2. `App` lê o perfil de `localStorage` (`codebot_lab_user_config`). Se `levelsVersion ≠ 3`, repõe os níveis concluídos e as estrelas.
3. Sem perfil → onboarding; com perfil → ecrã inicial.
4. `SettingsProvider` aplica preferências (atributos `data-cvd`, `data-reduce-motion`, tamanho do texto, som) e cria o `MotionConfig`.
5. `AccountProvider` pede `GET /api/auth?action=me`.

### 13.2 Abrir um nível

1. `GameScreen` monta com `currentLevelIdx`.
2. Mostra a janela de conceito (`LevelIntroModal`).
3. Pede tentativa (`GET /api/leaderboard?attempt=N`); enquanto não chega, `ready = false` (carregamento).
4. Gera o layout com a semente (`generateLayout`) e reinicia o hook com o novo `LevelConfig`.
5. Pronto: o jogador pode editar a consola e executar.

### 13.3 Executar um programa

1. Clique em **Executar** → `runCode` → `runner.run(código)`.
2. `parseProgram` → `compileProgram`. Erro de compilação: mostra no editor, não inicia, não conta.
3. Compilado: estado inicial, `runs.push(linhas)`, `status = running`.
4. Efeito agenda o passo seguinte com `setTimeout(velocidade)`:
   - `check` → avalia a condição, `pc` avança ou salta (aviso da condição no tabuleiro);
   - `jump` → `pc` vai para o alvo;
   - `cmd` → `executeCommand`:
     - **queda** → `errors + 1`; se atingir o limite: game over; senão reinicia (`pc = 0`, estado inicial), evento `fall`;
     - **erro** → `errors + 1`, execução para, evento `error` (janela com dica);
     - **sucesso** → novo estado, `pc + 1`, histórico, evento de movimento/recolha/viragem;
     - `victory` → execução para, evento `victory`.
5. Passos > 1000 → erro `errorLoopLimit`.

### 13.4 Vitória

1. `victory = true` → efeito de vitória (uma vez: `savedRef`).
2. Calcula estrelas (`starsFor`), atualiza o perfil (nível concluído, melhor classificação).
3. Consulta o ranking (`fetchLeaderboard`) → `qualifiesForTop`:
   - entra → `enter` (campo do nome; bloqueado se houver conta);
   - não entra → `out` (mensagem).
4. Confirmação → `submitEntry` → `POST /api/leaderboard` → estado final (ver 12.3).

### 13.5 Queda num buraco

1. `mover`/`mover(n)` chega a uma casa com buraco → `fell = true`.
2. `errors + 1`. Se `errors + 1 ≥ maxErrors`: `status = idle`, estado com erro (game over).
3. Senão: estado inicial, `pc = 0`, `status` continua `running`, evento `fall`.
4. A interface treme o robô e mostra o aviso breve; sem janela.

### 13.6 Recuperar palavra-passe

1. Painel → "Esqueci a palavra-passe" → email → `forgot` (sempre 200).
2. Se a conta existir: email com link `…/#reset=TOKEN` (30 min).
3. Ao abrir o link, `HomeScreen` lê o fragmento e mostra `ResetPasswordPanel`.
4. `reset` → nova palavra-passe; sessões terminadas; mensagem de sucesso.

### 13.7 Registo confirmado

1. Painel → criar conta (nome, palavra-passe, **email obrigatório**) → `register` → `202` → "enviámos um email".
2. Link `…/#confirm=TOKEN` → `ConfirmSignupPanel` → `confirm` → conta criada, sessão iniciada, `refresh` do contexto.

### 13.8 Login com Google

1. Botão "Entrar com Google" (só se `googleEnabled`) → `GET google-start`.
2. Google → `GET google-callback` → criação/reutilização → cookie de sessão → redirecionamento `/?google=ok`.
3. `google=error` → mensagem no painel.

---

## 14. Interface e acessibilidade

### 14.1 Ecrãs

| Ecrã | Componente | Conteúdo |
|---|---|---|
| Onboarding | `OnboardingScreen` | Nome, idade, nível de conhecimento, idioma, cor do robô (12) |
| Início | `HomeScreen` | Níveis (estrelas por nível concluído), conta, definições, recuperação/confirmação |
| Jogo | `GameScreen` | Cabeçalho, tabuleiro, consola, paleta, overlays |
| Ranking | `LeaderboardScreen` | Separadores por nível, top 10, modo demonstração |
| Os meus resultados | `MyResultsScreen` | Histórico da conta |

### 14.2 Componentes do jogo

| Componente | Responsabilidade |
|---|---|
| `Grid` | Tabuleiro 3D (CSS `rotateX/rotateZ`); células, caixas, paredes, buracos, madeira; robô (camada animada); pré-visualização; parede destacada; resumo textual para leitores de ecrã |
| `Robot` | Desenho do robô (rotação animada, salto por comando) |
| `Box` | Caixa por recolher |
| `CodeEditor` | Consola **só de leitura** com destaque da linha em execução e marca ✖ de erro |
| `ControlPanel` | Consola, velocidade e paleta em grupos recolhíveis (Movimento, Repetição, Decisões) |
| `GameHeader` | Estatísticas (comandos, erros, caixas) e botões de controlo |
| `LevelIntroModal` | Janela de conceito antes do nível |
| `Modal` | Janela genérica (erro com dica) |
| `LevelTimer` | Cronómetro `mm:ss` |
| `GameOverOverlay` / `VictoryOverlay` | Fim de tentativa e vitória (estrelas, ranking) |
| `LevelComplete` | Animação de vitória |
| `RankingNameEntry` | Campo do nome para o top |

Janelas (`Modal`, `LevelIntroModal`, `SettingsModal`) são renderizadas num **portal** (`Portal`), no `body`.

### 14.3 Acessibilidade

- Estados não dependem só da cor: símbolo ✖ e texto nos erros; contador e texto nas caixas; padrão nas paredes e na madeira; contorno tracejado nos buracos.
- **Modo para daltónicos** (definições): troca vermelho/verde por laranja/azul e acrescenta padrão às bordas de erro.
- **Reduzir movimento** (definições e preferência do sistema): desliga animações (`MotionConfig` e atributo `data-reduce-motion`).
- **Texto grande** (definições): raiz 112%.
- **Som:** interruptor global nos efeitos sonoros.
- **Leitores de ecrã:** `role="dialog"`/`aria-modal` nas janelas, foco no botão ao abrir, Esc fecha; `role="switch"` e `aria-checked` nas definições; `role="radio"` nas cores do robô; `role="tab"` no ranking; `role="status"` nos carregamentos e avisos; resumo textual do tabuleiro (`sr-only`, `aria-live`).
- **Alvos de toque:** botões de comando com altura mínima de 40 px.
- **Foco visível** em todos os botões (contorno ciano).

### 14.4 Definições

| Opção | Chave em `codebot_settings` | Efeito |
|---|---|---|
| Modo para daltónicos | `colorblind` | Troca de cores de erro e padrões |
| Reduzir movimento | `reduceMotion` | Desliga animações |
| Texto grande | `largeText` | 112% |
| Efeitos sonoros | `sound` | Liga/desliga sons |
| Idioma | perfil (`language`) | PT ou EN |
| Cor do robô | perfil (`robotColor`) | Uma das 12 cores |
| Tema do tabuleiro | `theme` | Automático, laboratório ou noturno |

O perfil (idioma e cor) é o mesmo guardado no onboarding; as definições alteram-no no mesmo sítio.

### 14.5 Identidade visual

- Paleta: `#001547` (fundo), `#012050` (painéis), `#0A84FF` (ação), `#5CD4F2` (destaque), `#7A5CFC` (secundário), `#E6F1FF` (texto).
- Tipografia: Inter (texto), Playfair Display (títulos), Press Start 2P (ecrãs arcade: início, ranking, carregamentos), JetBrains Mono (código).
- Logótipo: `src/shared/assets/sapiente-logo.png`, com ligação para sapienteai.com em nova aba.
- Rodapé em todas as páginas: copyright e autoria.

### 14.5a Temas, sons e partilha

- **Tema do tabuleiro** (definições, secção Aspeto): automático (noturno entre as 19h e as 7h), laboratório (diurno) ou noturno. A escolha altera a iluminação do tabuleiro (neon no noturno, casas claras no diurno) e a versão do fundo de cada nível.
- **Sons contextuais** (`audio.ts`): passo numa casa normal, entrada num portal, madeira partida, queda num buraco, erro e arpejo de vitória. Respeitam o interruptor de som.
- **Partilha**: o cartão final tem botão para criar o GIF da solução, com partilha nativa ou descarregamento.

### 14.6 Textos

Todos os textos estão em `src/shared/i18n/translations.ts`, em **duas** estruturas paralelas (PT e EN). Acrescentar um texto exige acrescentá-lo nas duas. Os textos dos níveis (conceito e dicas) estão em `levelN.ts`.

---

## 15. Configuração e variáveis de ambiente

### 15.1 Desenvolvimento local

```bash
npm install
npm run dev            # interface em http://localhost:3000 (sem API)
npm run lint           # verificação de tipos (tsc --noEmit)
npm test               # testes unitários (Vitest)
npm run e2e            # testes móveis (Playwright)
```

Para testar a API localmente: `vercel dev` (com `vercel env pull .env.local`).

### 15.2 Variáveis (servidor, Vercel)

| Variável | Obrigatória para | Descrição |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Ranking e contas | URL REST do Redis (criada pela integração Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | Ranking e contas | Token do Redis (idem) |
| `AUTH_SECRET` | Contas | ≥ 32 caracteres aleatórios; assina o estado OAuth. Gerar com `openssl rand -base64 48` |
| `APP_URL` | Email e Google | URL pública (sem barra final). Base dos links de email e do redirecionamento |
| `RESEND_API_KEY` | Registo e recuperação | Chave da API Resend |
| `MAIL_FROM` | Registo e recuperação | Remetente verificado no Resend |
| `GOOGLE_CLIENT_ID` | Login Google | ID de cliente OAuth |
| `GOOGLE_CLIENT_SECRET` | Login Google | Segredo do cliente OAuth |
| `VERCEL` | (automática) | Ativa `Secure` nos cookies |

Não usar prefixo `VITE_` para segredos (entrariam no bundle). Nenhuma variável do servidor é lida no cliente.

### 15.3 Configuração no Google Cloud (login Google)

- Tipo: aplicação Web.
- URI de redirecionamento autorizado: `https://<APP_URL>/api/auth?action=google-callback` (igual ao `APP_URL`, sem barra final).

### 15.4 Configuração no Resend

- Domínio do remetente verificado; `MAIL_FROM` com esse domínio.

---

## 16. Testes

### 16.1 Suíte unitária (Vitest + jsdom + Testing Library)

**262 testes** (no momento desta documentação). Principais áreas:

| Área | Ficheiros | O que cobre |
|---|---|---|
| Motor | `interpreter.test`, `obstacles.test`, `walls.test` | Movimentos, bordas, paredes, madeira, `partir()`, buracos, `senao` |
| Compilador | `program.test` | `repetir`, `se_caixa`, `senao`, `enquanto`, erros de sintaxe, limites |
| Condições | `structures.test`, `hints.test` | Contagem de estruturas, dicas, parede destacada |
| Simulação | `preview.test`, `replay.test` | Caminho, quedas, re-execução, vitórias forjadas, layouts gerados |
| Hook | `useProgramRunner.test` | Passos, pausa, undo, erros, vitória, ciclos, queda com reinício, game over |
| Níveis | `levels.test` | Tamanhos, contagens, unicidade, reprodutibilidade, alcance |
| Ranking | `leaderboard*.test`, `rankingVersion.test` | Pontuação, ordem, validação, tempo vs tempo real, versão das chaves |
| Contas | `authRules.test`, `accounts.test` | Regras, hash, sessões, tokens, APP_URL, cabeçalhos (`vercel.json`) |
| Componentes | `GameScreen.test`, `LeaderboardScreen.test`, `AccountPanel.test`, `SettingsModal.test`, `Footer.test`, `LevelIntroModal.test`, `LevelTimer.test`, `ArcadeLoader.test` | Fluxos de jogo em Strict Mode, vitória, nome, separadores, definições |
| Configuração | `settings.test`, `stars.test`, `robotPalette.test` | Persistência, estrelas, paleta |

`GameScreen.test` define um tempo limite de 20 s (simula um nível inteiro).

### 16.2 Testes ponta a ponta (Playwright)

`e2e/mobile.spec.ts` corre em três perfis: iPhone 13, Pixel 7 e 360×640. Cobre:

- Ecrã inicial sem scroll horizontal.
- Janela de conceito cabe no ecrã e fecha com toque.
- Comandos com altura ≥ 40 px; sem scroll horizontal no jogo.
- Erro abre a janela com dica dentro do ecrã.
- Ranking sem scroll horizontal.
- Definições: abrir, ligar modo daltónicos, verificar atributo no documento.

Executar: `npm run e2e` (com `CHROMIUM_PATH` se o Playwright não puder descarregar o navegador).

### 16.3 Lacunas de teste

- Nenhum teste da API contra um Redis real.
- Nenhum teste de envio real de email nem do fluxo Google com o Google real.
- Os testes móveis só correm em Chromium (sem Safari/iOS).
- Não há testes de acessibilidade automáticos (axe) nem de contraste.
- Não há testes de carga.

---

## 17. Implementação e operação (Vercel)

### 17.1 Passos

1. Importar o repositório no Vercel (framework Vite; build `vite build`; saída `dist`).
2. Marketplace → Upstash → Redis: criar a base e ligá-la ao projeto.
3. Definir as variáveis da secção 15.2.
4. Configurar o Google Cloud e o Resend (secções 15.3 e 15.4).
5. Deploy. A interface é servida como SPA; `api/*.ts` como funções serverless.

### 17.2 Cabeçalhos (`vercel.json`)

Aplicados a todas as rotas:

- `Content-Security-Policy`: `default-src 'self'`; scripts só do próprio site; estilos próprios e Google Fonts; `img-src 'self' data: blob:`; `connect-src 'self'`; `object-src 'none'`; `frame-ancestors 'none'`; `form-action 'self' https://accounts.google.com`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Strict-Transport-Security` (2 anos, subdomínios).
- `Permissions-Policy`: câmara, microfone, geolocalização e pagamentos desativados.

### 17.3 Limites de pedidos (`@upstash/ratelimit`)

| Chave | Limite | Janela |
|---|---|---|
| `rl:get` (leaderboard GET e tentativas) | 60 por IP | 1 min |
| `rl:post` (submissões) | 5 por IP | 1 min |
| `rl:auth` (login/registo) | 10 por IP | 1 min |
| `rl:auth-user` (login/registo por nome) | 5 por nome | 1 min |
| `rl:confirm` | 10 por IP | 1 min |
| `rl:forgot` | 5 por IP | 1 min |

### 17.4 Monitorização

Não existe monitorização dedicada. Os erros de servidor são escritos com `console.error` (visíveis nos registos da Vercel). Ver 18.4.

---

## 18. Segurança

### 18.1 Controlos implementados

| Ameaça | Controlo |
|---|---|
| Vitórias falsas no ranking | Re-execução no servidor com o mesmo motor; só a última execução pode vencer |
| Reutilizar uma partida | Tentativa de uso único (`GETDEL`), com validade de 30 min |
| Escolher layout favorável | Semente emitida pelo servidor |
| Tempo irreal | Tempo ≤ tempo real desde a criação da tentativa; tempo ≥ passos × 0,3 s |
| Enumeração de contas | Registo responde sempre 202; recuperação responde sempre 200; login com resposta genérica e trabalho de hash igual |
| Força bruta | Limites por IP e por nome de conta |
| Sessão roubada | Sessões revogáveis (logout, recuperação, apagar); alterar email exige palavra-passe |
| Link de recuperação envenenado | `APP_URL` obrigatório; nunca o cabeçalho `Host` |
| Token no URL nos registos | Tokens no fragmento (`#`), que não é enviado ao servidor |
| Token reutilizado | `GETDEL` em confirmação e recuperação |
| Token guardado em claro | Apenas SHA-256 no Redis |
| Palavra-passe em claro | `scrypt` com sal |
| CSRF | Ações de conta exigem JSON (`Content-Type`), que obriga a pedido de origem própria; cookie `SameSite=Lax` |
| XSS | React escapa o texto; sem `innerHTML`, `eval` nem `dangerouslySetInnerHTML` |
| Segredos no cliente | Variáveis do servidor nunca com `VITE_` |
| Clickjacking | `frame-ancestors 'none'` e `X-Frame-Options: DENY` |
| Vazamento de referrer | `Referrer-Policy` restritiva |
| Ciclos infinitos no motor | Limite de 1000 passos por passagem |
| Programas enormes | Limite de 500 instruções, 50 execuções, 200 linhas, 40 caracteres por linha |
| Email de terceiros | Confirmação por link; quem já tem conta recebe aviso |

### 18.2 Riscos aceites

- **Automação:** um script que resolva o nível pode entrar no ranking. Aceitável para um jogo educativo; **não** para prémios em dinheiro.
- **Limite inferior do tempo:** o jogador pode declarar um tempo menor do que o real, desde que não seja menor que o mínimo dos passos.
- **Enumeração em `set-email`:** um utilizador com sessão descobre se um email está ligado a outra conta (409).
- **Nomes públicos:** o nome de conta aparece no ranking; não há anonimização.
- **Logout em dispositivos sem Redis:** não se aplica (sem Redis não há sessões).
- **IP partilhado:** escolas e empresas partilham limites.

### 18.3 Procedimentos de segurança

- Trocar `AUTH_SECRET` se houver suspeita de fuga: invalida o estado OAuth em curso (as sessões são Redis, não assinadas).
- Revogar tokens do GitHub, Resend e Google se forem expostos em conversas, registos ou ficheiros.
- Não commitar `.env`. O `.gitignore` ignora `.env*`, exceto `.env.example` (sem valores).

### 18.4 Lacunas

- Sem monitorização de tentativas de abuso (só contadores de limite).
- Sem rotação automática de segredos.
- Sem auditoria de ações de conta (eliminação, alteração de email).

---

## 19. Problemas conhecidos

| Problema | Estado |
|---|---|
| A versão do ranking estava desfasada entre dois ficheiros (o servidor ainda usava `v2`) | **Corrigido** no patch `0039` (`RANKING_VERSION = 3` numa única constante, com teste de regressão). |
| Resultados antigos de "revisão" (nível 8, v2) não se misturam com os novos após a correção | Resolvido pelo reinício do ranking (v3). |
| Sessões antigas (assinadas) deixam de valer após a migração para sessões no Redis | Esperado: os utilizadores precisam de entrar de novo uma vez. |
| Progresso e estrelas repostos com a versão 3 do currículo | Esperado: a numeração mudou de tema. |
| "Os meus resultados" mostra números de nível de versões antigas | Histórico mantido sem reescrita. |
| Reinício após queda apaga os comandos anteriores da pontuação | Consequência do desenho (só conta a última passagem). |
| Testes de API sem Redis real | Lacuna (ver 16.3). |
| `e2e` depende de Chromium disponível | Em ambientes sem download do Playwright, usar `CHROMIUM_PATH`. |
| Textos dos níveis não são verificados automaticamente contra as regras | Manual. |
| Resolvedor de testes não conhece portais | A garantia de resolubilidade vem da verificação do gerador (testada). |
| Documento desatualizado desde 0040 | **Corrigido** nesta versão. |

---

## 20. Possíveis melhorias

### 20.1 Prioritárias

1. **Testes da API contra Redis real** (instância de teste no Upstash ou Redis local) para: tentativas, submissão, top 10, confirmação, recuperação, logout.
2. **Testes end-to-end de conta** (registo, confirmação e recuperação com um serviço de email de teste, como Mailpit).
3. **Monitorização** (contadores por rota, falhas de Redis e de envio de email) e alertas.
4. **Auditoria de ações sensíveis** (alterar email, recuperar, apagar conta) com registo próprio.
5. **Validação visual** nos 9 níveis em telemóveis reais e com o modo daltónicos ativo.

### 20.2 Jogabilidade e pedagogia

6. Modo "passo a passo" com destaque da condição e do comando atual (já parcial).
7. Níveis adicionais: funções (`definir nome() { … }`), variáveis ou contador.
8. Dica adaptativa (sugerir o conceito quando o jogador falha repetidamente no mesmo tipo de erro).
9. Pontuação por caminho ótimo (comparar com a solução mínima de cada nível, para calibrar o orçamento das estrelas).
10. Modo de treino sem ranking e sem limite de erros.

### 20.3 Técnicas

11. **Mover o estado do hook para um reducer** (`useReducer`) com ações explícitas, para facilitar testes e depuração.
12. **Dividir `GameScreen.tsx`** (ainda grande) em hooks: `useAttempt` (tentativa), `useVictory` (estrelas e ranking), `useTutorialState`.
13. **Tipar os textos** com um tipo derivado de `TRANSLATIONS.pt` e forçar paridade PT/EN em tempo de compilação (um objeto `en` com tipo `typeof pt`).
14. **Gerar a especificação dos níveis a partir de dados** (um JSON/TS único com grelha, contagens e obstáculos), em vez de duplicar em `generator.ts` e nos ficheiros `levelN.ts`.
15. **Sessões com rotação** de identificador a cada login e limite de sessões simultâneas por conta.
16. **Limite de pedidos por IP mais robusto** (uso de `x-real-ip` quando disponível e chaves compostas).
17. **Ranking com paginação** e índice de nome, se houver muitos níveis ou utilizadores.
18. **Migração de dados versionada** (em vez de repor progresso ao mudar `levelsVersion`).
19. **Remover a dependência de `@types/node` duplicada** e rever as dependências de desenvolvimento (npm audit só cobre produção).
20. **Acessibilidade:** teste automático com axe-core e verificação de contraste WCAG AA em todos os temas.
21. **Internacionalização** com um formato padrão (ICU) em vez de funções inline nas traduções.
22. **Documentação viva:** gerar a tabela de comandos e de endpoints a partir do código.

### 20.4 Operação

23. Ambientes separados (preview por branch, produção) com bases Redis distintas.
24. Backups do Redis (ranking e contas) e procedimento de restauro testado.
25. Política de retenção: contas inativas, tokens expirados e resultados antigos.
26. Conformidade: a idade é guardada no perfil local (`localStorage`); avaliar a necessidade e o consentimento para dados de menores.

---

## 21. Histórico de alterações

Sequência de patches (ordem de aplicação, todos sobre `5dbb72e`):

| Patch | Conteúdo |
|---|---|
| 0001 | Regras de erros por nível, novo visual, fundos por nível |
| 0002–0004 | Contraste, animações do robô, caixas ×2 e grelha maior, testes de componente |
| 0005–0006 | Animação de vitória; dicas traduzidas, limpeza de timers, `.gitattributes` |
| 0007 | Ranking em Redis (Upstash) com API no Vercel |
| 0008 | Tempo na pontuação |
| 0009 | Validação de vitórias no servidor (re-execução, tempo plausível, limite por IP) |
| 0010 | Acessibilidade: símbolos além da cor |
| 0011 | Estrutura por áreas (`app`, `features`, `shared`) e componentes do jogo |
| 0012 | Nível 4 |
| 0013 | `repetir(n)` |
| 0014 | Layouts aleatórios por partida (semente emitida pelo servidor) |
| 0015–0016 | Carregamento estilo arcade |
| 0017 | Ranking por nível (top 10) e coluna de pontos |
| 0018 | Modo demonstração no ranking vazio |
| 0019 | Nome (até 10 caracteres) para entrar no top |
| 0020 | Servidor decide e responde se entrou no top |
| 0021 | Contas (registo, entrada, sessão, email, recuperação, resultados, apagar) |
| 0022 | Login com Google (OAuth 2.0 + PKCE) |
| 0023 | Relógio visível sobre o tabuleiro |
| 0024 | Rodapé global; cor da grelha por nível |
| 0025 | Nível 5 (`enquanto`); cor das caixas por nível; janela de conceito; Reiniciar |
| 0026 | Desconto de pontuação por estruturas |
| 0027 | Currículo de 7 níveis; `mover(n)`; `senao`; `se_parede`; paredes; ranking v2 |
| 0028 | Feedback ao errar (embate, parede destacada, modal com dica); resumo para leitores de ecrã; painel recolhível; tipos do React ativados |
| 0029 | Pré-visualização do caminho e condição avaliada |
| 0030 | Estrelas e nível 8 de revisão |
| 0031 | Correções de segurança (APP_URL, revogação, limite por conta, cabeçalhos) |
| 0032 | Sessões revogáveis, registo confirmado por email, tokens no fragmento, tempo limitado |
| 0033 | Testes ponta a ponta em telemóveis; janelas em portal; alvos de toque |
| 0034 | Paleta do robô com 12 cores |
| 0035 | Menu de definições (daltónicos, movimento, texto, som) |
| 0036 | Idioma e cor do robô no menu (padrão = onboarding) |
| 0037 | Buracos (queda) e madeira (`partir()`); madeira no nível 8; revisão no 9; ranking e currículo v3 |
| 0038 | Queda com reinício automático |
| 0039 | Correção da versão do ranking no servidor |
| 0040 | Vitória/ranking e ciclo de vida da tentativa extraídos para hooks (`useVictory`, `useAttempt`) |
| 0041 | Cronómetro, avisos e tutorial extraídos de `GameScreen` (`useCronometro`, `useAvisos`, `TutorialOverlay`) |
| 0042 | Partilha da solução em GIF (gravação da passagem vencedora, desenho, codificação no navegador) |
| 0043 | Portais azuis em pares e nível 10 |
| 0044 | Temas do tabuleiro (automático, laboratório, noturno) e sons contextuais |
| 0045 | Caixas com ordem de recolha e nível 11 |
| 0046 | Conquistas verificadas no servidor e mínimo absoluto de comandos |
| 0047 | Artes de fundo para os níveis 6 a 11 (procedurais) |
| 0048 | Arte própria do nível 2, fundos diurnos e arte dos distintivos |

Mensagens de commit e patches em português, com prefixos `feat:`, `fix:`, `security:`, `test:`, `chore:`, `refactor:`.

---

## 22. Glossário

| Termo | Significado |
|---|---|
| Caixa | Objetivo a recolher com `pegar()` |
| Parede | Obstáculo que bloqueia o movimento |
| Buraco | Casa que faz o robô cair (erro e reinício automático) |
| Madeira | Obstáculo que bloqueia até `partir()` |
| Tentativa (attempt) | Uma partida de um nível, com layout e identificador emitidos pelo servidor |
| Semente (seed) | Número de 32 bits que define o layout de uma tentativa |
| Execução (run) | Uma passagem do programa desde o início; cada "Executar" cria uma |
| Passagem vencedora | A última execução, que recolheu todas as caixas |
| Instrução | Unidade executável após a compilação (comando, teste ou salto) |
| Compilação | Transformação das linhas da consola em instruções (expande `repetir`) |
| Re-execução | Validação no servidor, repetindo as execuções sobre o layout gerado |
| Top 10 | As 10 melhores entradas de um nível |
| Estrelas | Classificação de 1 a 3 por vitória, guardada por nível |
| Sessão | Ligação autenticada no servidor, identificada por um cookie opaco |
| Token de uso único | Valor aleatório enviado por email; válido uma vez |
| Fragmento (`#`) | Parte do URL que não é enviada ao servidor |
| PKCE | Extensão do OAuth que protege o código de autorização |
| Versão do currículo | Número que muda quando os níveis mudam de tema (`levelsVersion`) |
| Versão do ranking | Número que define o prefixo das chaves no Redis (`RANKING_VERSION`) |
| Portal | Par de casas que se ligam: entrar numa transporta o robô para a outra |
| Ordem de recolha | Números 1..N nas caixas do nível 11: só se apanha a de número mais baixo ainda por recolher |
| Mínimo absoluto | Menor número de comandos que vence um layout (calculado por pesquisa) |
| Distintivo (conquista) | Marca desbloqueada por um feito verificado no servidor |
| Tema | Aparência do tabuleiro: automático (pela hora), laboratório (diurno) ou noturno |

---

## 23. Riscos aceites para o MVP

Estes três riscos foram analisados e aceites para o MVP. Não são bugs por corrigir; são limites conhecidos, com a decisão registada.

| Risco | Impacto | Mitigação atual | Quando revisitar |
|---|---|---|---|
| **Mínimo de comandos não calculado em layouts grandes.** A pesquisa desiste acima de 400 000 estados (por exemplo, o nível 5, com 16 caixas). | A conquista "Mestre da Eficiência" não é atribuída nesses níveis. Nenhum distintivo é dado às cegas. | Devolve `null` e nunca atribui por suspeita. | Pós-MVP: calcular o mínimo uma vez por nível e guardar, ou aumentar o limite com mais tempo de servidor. |
| **Automação pode entrar no ranking.** Um script que resolva o nível pode submeter resultados. | O ranking deixa de refletir só pessoas. | Validação completa no servidor (re-execução, tempo plausível, tentativa de uso único, limite por IP). | Só se o ranking vier a ter prémios. Para um jogo educativo, aceite. |
| **Limite de tempo só superior.** O tempo declarado não pode exceder o tempo real desde o início da tentativa, mas pode ser menor que o real, desde que não seja menor que o mínimo dos passos. | Um jogador pode subestimar o tempo que gastou. | Limite inferior baseado nos passos (300 ms por passo, menos 1 s de folga). | Pós-MVP, se o Velocista ou o ranking começarem a ser contestados. |

Os riscos de segurança das contas (enumeração em `set-email`, logout sem invalidação em dispositivos sem Redis, nomes públicos no ranking) estão descritos na secção 18.2.

## 24. Pós-MVP (adiado)

Itens acordados para depois do MVP, não implementados:

1. **Versões diurnas redesenhadas.** As versões atuais são imagens existentes com um véu claro. Uma versão diurna de raiz exige redesenhar os fundos.
2. **Ajuste fino dos sons e do GIF.** Afinar volumes e timbres dos sons contextuais; reduzir o tamanho do GIF (cerca de 200 KB), com menos frames ou menos cores.
3. **Cálculo do mínimo para os layouts grandes.** Ver o primeiro risco da secção 23.
4. **Arte encomendada a um ilustrador.** As artes atuais são procedurais (SVG renderizado). Para ilustrações elaboradas, encomendar a um ilustrador, usando as especificações de cor, composição e dimensões.

Além destes, mantêm-se as melhorias da secção 20.
