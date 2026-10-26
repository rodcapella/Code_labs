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

- `src/engine/interpreter.ts`: regras do jogo (movimento, rotação, recolha, vitória), sem dependências de UI
- `src/levels/`: configuração dos níveis (dados)
- `src/screens/`: ecrãs (onboarding, jogo, ranking)
- `src/constants/translations.ts`: textos em português e inglês

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
- `POST /api/leaderboard` → `201 { ok, score }` ou `400` / `422` / `429` com a razão

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
