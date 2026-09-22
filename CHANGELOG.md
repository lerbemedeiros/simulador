# Changelog

Todas as mudanças notáveis serão documentadas aqui. Formato baseado em Keep a Changelog e SemVer.

## [Unreleased]

### Added

- Fundação profissional: `.gitignore`, `.editorconfig`, `.nvmrc`, `README`, `LICENSE`
- ESLint + Prettier + jsconfig + lint-staged
- `vite.config.js` com hash de build, coverage e otimizações
- CI GitHub Actions (lint, test, build, Lighthouse)
- Dockerfile + nginx (SPA fallback, cache headers, CSP)
- `robots.txt`, `sitemap.xml`, manifest com screenshots/share_target
- Cobertura de testes hash/loader/compositor

### Changed

- `package.json` com engines, browserslist, scripts `lint/format/coverage`
- `index.html` com SRI, preconnect e CSP meta

### Security

- Sanitização XSS em `ui.js` e validação de hash em `hash.js`

## [1.0.0] - 2026-09-21

- Release inicial: cozinha + quarto, compositor bbox-only, hotspots pulsantes, hash v1, PWA.
