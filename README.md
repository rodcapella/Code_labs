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

- `GET /api/leaderboard` → `{ entries: [...] }` (top 10 de cada nível)
- `GET /api/leaderboard?level=2` → só o nível 2
- `POST /api/leaderboard` com `{ name, levelId, commands, errors, time, date, robotColor }`
  → `201` ou `400` com a razão da rejeição

### Limitações conhecidas

- As pontuações são enviadas pelo cliente. Quem souber a API pode enviar valores falsos.
  Para o ranking ser à prova de batota, o servidor teria de re-executar a sequência de comandos.
- Não há limite de pedidos por IP. Se for preciso, adiciona-se `@upstash/ratelimit`.
