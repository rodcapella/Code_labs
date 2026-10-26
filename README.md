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
- `npm test`: testes unitários do motor de comandos

## Estrutura

- `src/engine/interpreter.ts`: regras do jogo (movimento, rotação, recolha, vitória), sem dependências de UI
- `src/levels/`: configuração dos níveis (dados)
- `src/screens/`: ecrãs (onboarding, jogo, ranking)
- `src/constants/translations.ts`: textos em português e inglês
