# Simulador de Ambientes — Premium

Visualizador 2.5D para texturas Berneck em ambientes reais (cozinha, quarto). Render bbox-only + máscara por zona, hotspots pulsantes, share via hash e export PNG com marca d'água.

![Node](https://img.shields.io/badge/node-%3E%3D20-339933)
![Vite](https://img.shields.io/badge/vite-5.x-646CFF)
![Tests](https://img.shields.io/badge/tests-vitest-6E9F18)

## Stack

- **Frontend:** Vanilla JS (ES Module), Canvas 2D pipeline (`public/js/compositor.js:21`), Vite 5
- **PWA:** Service Worker `public/sw.js:1` (stale-while-revalidate + LRU 80)
- **Texturas:** `sharp` gera `thumbs 256 webp` + `diffuse 1024 webp` (`scripts/build-texturas.mjs:1`)
- **Testes:** Vitest + jsdom

## Quick start

```bash
npm ci
npm run build:texturas   # gera thumbs/diffuse + index.json (incremental, sharp)
npm run dev              # http://localhost:3000  (Vite --host)
npm test                 # vitest run + coverage
npm run build:vite       # build produção -> dist/
npm run preview          # serve dist/
```

> Requer Node 20+ (`sharp`).

## Estrutura

```
public/
  index.html              # SPA shell, dock, drawer, hotspots
  css/style.css           # tema Berneck (#1B5244), drawer, chips, dock
  js/
    main.js               # orquestração loader->compositor->ui
    compositor.js         # pipeline base+relight por zona
    loader.js             # CATALOGO, loadImage com timeout, preload em lotes
    ui.js                 # drawer, busca, filtros, grade, toast, favs
    hash.js               # hash versionado v1; da composição
    config/               # barreira: ambientes.js, texturas.js, schema.js
  assets/
    ambientes/{cozinha_01,quarto_01}/base + mascaras
    texturas/*.jpg        # origem (não commitada em thumbs/diffuse)
  sw.js / manifest.webmanifest
scripts/build-texturas.mjs
tests/*.test.js
vite.config.js
```

## Config — adicionar ambiente

Edite só `public/js/config/ambientes.js:6` via `defineAmbiente` (`defaults.js:43`):

```js
const sala = defineAmbiente({
  id: 'sala', nome: 'Sala', icone: 'fa-couch',
  imagem: 'assets/ambientes/sala_01/base/bg_neutro.png',
  width: 1920, height: 1080,
  camadas: { base: 'ambientes/sala_01/base/bg_neutro.png', sombras: '...', reflexos: '...' },
  idMap: 'ambientes/sala_01/mascaras/id_map.png',
  zonas: [ zona({ id:'parede', label:'Parede', cor:[...], seed:[...], mascara:'...' }) ],
  padrao: 'parede',
  padraoZona: { parede: 'Freijo_Nativo_Grann' },
});
```

`AMBIENTES_DISPONIVEIS` e rotas `#env=sala` são derivados — sem regex manual (`config/index.js:63`).

## Texturas

- Fonte editável: `public/assets/texturas/texturas.json` (espelho Berneck). Fallback `TEXTURAS` em `config/texturas.js`.
- `index.json` é **gerado** — não edite manualmente.
- `CATALOGO[id].thumb = .../thumbs/{id}.webp`, `diffuse = .../diffuse/{id}.webp`.

## Scripts

| script           | descrição                                                      |
| ---------------- | -------------------------------------------------------------- |
| `build:texturas` | `node scripts/build-texturas.mjs` — thumbs/diffuse incremental |
| `build`          | alias `build:texturas`                                         |
| `build:vite`     | `vite build` -> `dist/`                                        |
| `dev`            | `vite --host` porta 3000                                       |
| `preview`        | `vite preview`                                                 |
| `serve`          | `serve public -l 3000` (sem build)                             |
| `test`           | `vitest run`                                                   |
| `test:watch`     | `vitest`                                                       |
| `test:coverage`  | `vitest run --coverage`                                        |
| `lint`           | `eslint .`                                                     |
| `lint:fix`       | `eslint . --fix`                                               |
| `format`         | `prettier --write .`                                           |
| `format:check`   | `prettier --check .`                                           |

## Qualidade

- ESLint + Prettier (`.eslintrc.cjs`, `.prettierrc`)
- `jsconfig.json` para tipos JSDoc
- CI: `.github/workflows/ci.yml` — lint + test + build + Lighthouse
- Coverage: `npm run test:coverage` — gate atual 33% linhas / 55% branches (`vite.config.js:28`), 52 testes. Meta progressiva 45% → 60% → 70% (unidade + E2E para `compositor/ui/main`)

## Deploy — Azure Static Web Apps

1. Crie um Static Web App no portal Azure (ou `az staticwebapp create`).
2. Copie o **Deployment Token** em `Visão geral -> Gerenciar token de implantação`.
3. No GitHub: `Settings -> Secrets -> New repository secret` nome `AZURE_STATIC_WEB_APPS_API_TOKEN` com o token.
4. Push em `main` dispara `.github/workflows/deploy.yml:1` — `dist` sobe via `Azure/static-web-apps-deploy@v1`.
5. Sem token, o workflow só publica `dist` como artifact (fallback).

Config SPA: `staticwebapp.config.json:1` (fallback `/index.html`, cache `assets/* immutable`, headers `CSP`).

- **Static puro:** `npm run build:vite` -> `dist/` (servir com SPA fallback)
- **Docker:** `docker build -t simulador . && docker run -p 8080:80 simulador` (nginx + SPA fallback + cache headers)
- **Vercel / Netlify:** `output: dist`, `build: npm run build:vite`

## Segurança

- CDN com SRI (`index.html`), `CSP` via `nginx.conf` / header, sanitização em `ui.js`
- `loadImage` com timeout 15s (`loader.js:45`) — sem Promise pendente infinita

## Licença

MIT — ver `LICENSE`.
