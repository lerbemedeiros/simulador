# Scripts

| script               | descrição                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build-texturas.mjs` | Gera `thumbs 256 webp` + `diffuse 1024 webp` + `index.json` a partir dos `*.jpg` em `public/assets/texturas/`. Incremental (só reprocessa se src mais novo). Rode após adicionar/remover JPGs ou editar `texturas.json`. |
| `gerar-idmap.mjs`    | Gera `id_map.png` a partir de máscara binária (branco = peça). Uso: `node scripts/gerar-idmap.mjs entrada.png saida.png [WxH]`. Útil ao criar novo `ambiente`.                                                           |

Todos os scripts de debug com `puppeteer` foram removidos — use `vitest` + `vite dev` para diagnóstico.
