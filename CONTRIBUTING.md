# Contributing

## Fluxo

1. `git checkout -b feat/minha-feature`
2. `npm ci && npm run build:texturas` (se mexeu em texturas)
3. `npm run lint:fix && npm run format && npm test`
4. Commit com Conventional Commits (`feat:`, `fix:`, `chore:`)
5. PR — CI deve passar (lint, test, build)

## Padrões

- Não edite `public/assets/texturas/index.json` manualmente — gerado por `build:texturas`.
- Novos ambientes: edite só `public/js/config/ambientes.js` via `defineAmbiente`.
- Validação via `public/js/config/schema.js:10` — testes devem quebrar se inválido.
- Textura nova: adicione JPG em `public/assets/texturas/` + entrada em `texturas.json`, rode `build:texturas`.

## Testes

- `npm test` — Vitest jsdom
- `npm run test:coverage` — gate 50% (subir progressivamente)
