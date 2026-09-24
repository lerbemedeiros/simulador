// ============================================================
// AJUDA PREMIUM — Central de Ajuda + Tour guiado (refeito do zero)
// - Ícone ? do dock abre a Central (modal premium) com TODAS as funcionalidades.
// - Dentro da Central: botão "Fazer tour guiado" inicia tour interativo de 7 passos.
// - Tour: spotlight + card posicionado, navegação avanti/voltar, Esc, foco preso.
// - Primeiro acesso: tour abre sozinho (localStorage simTourVisto).
// - Sem dependências externas, tema claro/escuro, mobile, acessível.
// ============================================================

const ESPERA_DRAWER = 520;
const STORAGE_TOUR = 'simTourVisto';

function esperar(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function q(sel) {
  return document.querySelector(sel);
}

// Posiciona o balão perto do alvo: prefere abaixo, senão acima; clamp horizontal.
function posicionar(tip, alvo) {
  const r = alvo.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const M = 12;
  let top = r.bottom + 14;
  const cabeAcima = r.top - th - 14 >= M;
  const cabeAbaixo = top + th + M <= vh;
  if (!cabeAbaixo && cabeAcima) top = r.top - th - 14;
  else if (!cabeAbaixo && !cabeAcima) top = Math.max(M, Math.min(vh - th - M, top));
  // Clamp lateral: tenta centralizar no alvo, mas nunca sai da viewport.
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(M, Math.min(vw - tw - M, left));
  // Se alvo é largo (painel/dock), alinha melhor em telas pequenas.
  if (vw <= 560) left = Math.max(M, Math.min(vw - tw - M, r.left));
  tip.style.top = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}

// ------------------------------------------------------------
// CENTRAL DE AJUDA — conteúdo premium cobrindo 100% dos recursos
// ------------------------------------------------------------
const SECS = [
  {
    id: 'menu',
    icon: 'fa-bars',
    cor: '#1B5244',
    titulo: 'Menu de Texturas',
    resumo: 'Hamburger, drawer lateral e bottom sheet no mobile',
    body: `
      <ul>
        <li><strong>Botão <i class="fa-solid fa-bars"></i>/<i class="fa-solid fa-xmark"></i> (topo direito)</strong> abre e fecha o menu. No mobile, arraste a alça superior para redimensionar o painel.</li>
        <li><strong>Logo Berneck</strong> no topo do drawer — só visual.</li>
        <li><strong>Dica:</strong> ao escolher uma textura o drawer recolhe sozinho; reabra pelo hamburger ou clicando num ponto pulsante.</li>
        <li><strong>Atalho:</strong> <kbd>Esc</kbd> fecha o drawer quando o foco está nele (backdrop também fecha).</li>
      </ul>`,
  },
  {
    id: 'busca',
    icon: 'fa-magnifying-glass',
    cor: '#7A9A8E',
    titulo: 'Busca e Filtros',
    resumo: 'Encontre qualquer padrão em segundos',
    body: `
      <ul>
        <li><strong>Busca</strong> (<i class="fa-solid fa-magnifying-glass"></i>) filtra por nome ou código — ex. <em>Freijo</em>, <em>Branco</em>.</li>
        <li><strong>Chips de categoria</strong> (Todas, Amadeirados, Unicolor …) — o contador mostra quantos padrões existem. Clique para filtrar.</li>
        <li><strong>Setas <i class="fa-solid fa-chevron-left"></i> / <i class="fa-solid fa-chevron-right"></i></strong> navegam entre categorias sem precisar arrastar. O chip ativo sempre rola para o centro.</li>
        <li><strong>Favoritos <i class="fa-solid fa-heart"></i></strong> — salve padrões; filtro <em>Favoritos</em> mostra só os seus (persiste no navegador).</li>
        <li><strong>Barra de status</strong> indica categoria ativa e total de padrões exibidos.</li>
      </ul>`,
  },
  {
    id: 'grade',
    icon: 'fa-table-cells-large',
    cor: '#3D8870',
    titulo: 'Grade de Texturas',
    resumo: 'Cards, favoritar, “Em uso” e aplicação instantânea',
    body: `
      <ul>
        <li><strong>Card</strong> mostra miniatura, nome, acabamento e selo de categoria. <em>Toque/clique</em> para aplicar na zona selecionada.</li>
        <li><strong><i class="fa-regular fa-heart"></i> Favoritar</strong> — coração no canto do card. Também via teclado: foque e pressione <kbd>Enter</kbd> ou <kbd>Espaço</kbd>.</li>
        <li><strong>Estado “Em uso” / borda colorida</strong> marca a textura ativa da zona atual. A cor da borda varia por categoria.</li>
        <li><strong>Carregamento</strong>: shimmer enquanto a textura é aplicada. Toques rápidos são enfileirados (last-wins) — nada se perde.</li>
        <li><strong>Vazio:</strong> mensagem com botão <em>Limpar busca</em> quando nenhum resultado.</li>
      </ul>`,
  },
  {
    id: 'hotspots',
    icon: 'fa-location-dot',
    cor: '#D47A2A',
    titulo: 'Pontos Pulsantes (Hotspots)',
    resumo: 'O coração da interação com a cena',
    body: `
      <ul>
        <li><strong>Cozinha</strong>: um único ponto <em>master</em> — trocar ali aplica a mesma textura em <strong>todas as peças</strong> de uma vez.</li>
        <li><strong>Quarto</strong>: um ponto por material (Material 1/2/3) — cada um troca só sua peça.</li>
        <li><strong>Visual</strong>: bola branca pulsante; ao selecionar fica verde <code>#1B5244</code> com anel animado. Só o hotspot clicável troca textura — clique na cena não faz nada.</li>
        <li><strong>Clicar no hotspot</strong> além de selecionar, <strong>reabre o menu</strong> se estiver fechado.</li>
      </ul>`,
  },
  {
    id: 'dock',
    icon: 'fa-table-columns',
    cor: '#1B5244',
    titulo: 'Barra de Ferramentas (Dock)',
    resumo: 'Todas as ações rápidas em um só lugar',
    body: `
      <div class="central-dock-grid">
        <div class="central-dock-item"><span class="central-dock-ic"><i class="fa-solid fa-circle-down"></i></span><div><strong>Baixar</strong><span>Exporta PNG em alta com marca-d’água (logo + nome da textura)</span></div></div>
        <div class="central-dock-item"><span class="central-dock-ic"><i class="fa-solid fa-print"></i></span><div><strong>Imprimir</strong><span>Gera ficha técnica para <kbd>Ctrl</kbd>+<kbd>P</kbd> (tabela + imagem da composição)</span></div></div>
        <div class="central-dock-item"><span class="central-dock-ic gold"><i class="fa-solid fa-share-nodes"></i></span><div><strong>Compartilhar</strong><span>1º tenta enviar imagem no app (WhatsApp), 2º link do sistema, 3º copia URL com <code>#c=</code> + <code>env</code></span></div></div>
        <div class="central-dock-item"><span class="central-dock-ic"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></span><div><strong>Tela cheia</strong><span>Fullscreen nativo; se bloqueado, ativa modo foco (esconde topo)</span></div></div>
        <div class="central-dock-item"><span class="central-dock-ic"><i class="fa-solid fa-moon"></i></span><div><strong>Tema</strong><span>Alterna claro/escuro e persiste. Respeita o sistema na 1ª visita</span></div></div>
        <div class="central-dock-item"><span class="central-dock-ic"><i class="fa-solid fa-circle-question"></i></span><div><strong>Ajuda</strong><span>Abre esta Central (você está aqui!)</span></div></div>
      </div>
      <p class="central-hint"><i class="fa-solid fa-lightbulb"></i> Passe o mouse no desktop para ver o tooltip de cada botão.</p>`,
  },
  {
    id: 'ambientes',
    icon: 'fa-house',
    cor: '#8B7536',
    titulo: 'Trocar de Ambiente',
    resumo: 'Vitrine premium de ambientes',
    body: `
      <ul>
        <li><strong>Botão “SELECIONAR AMBIENTE”</strong> no rodapé central abre a vitrine.</li>
        <li><strong>Vitrine</strong> com cards em carrossel (scroll-snap + dots). Card ativo tem selo <em>Selecionado</em> e brilho dourado.</li>
        <li><strong>Troca</strong>: ambientes com camadas (<em>Cozinha/Quarto</em>) recarregam a página com <code>?t=</code> + <code>#env=</code>; “Em breve” mostra toast <em>Em breve</em>.</li>
        <li><strong>Navegação:</strong> arraste, use dots, ou teclado <kbd>←</kbd> <kbd>→</kbd> <kbd>Home</kbd> <kbd>End</kbd>. Efeito 3D no hover (desktop).</li>
      </ul>`,
  },
  {
    id: 'dicas',
    icon: 'fa-wand-magic-sparkles',
    cor: '#59A28C',
    titulo: 'Atalhos & Dicas',
    resumo: 'Seja ninja no simulador',
    body: `
      <ul>
        <li><kbd>Esc</kbd> fecha modais/tour/drawer.</li>
        <li>Link compartilhável: copie a URL — ela contém <code>#c=</code> (composição) e <code>env</code> (ambiente). Quem abrir vê igual.</li>
        <li>Favoritos e tema ficam salvos em <code>localStorage</code> (chaves <code>simFavs</code> e <code>simulador_tema</code>).</li>
        <li>Toast no topo: confirma ações (<em>Aplicado, Baixado, Compartilhado</em>). Fica mais tempo em “Link copiado”.</li>
        <li>No mobile, gire para paisagem se o overlay “Gire a tela” aparecer — a experiência é melhor na horizontal.</li>
      </ul>`,
  },
];

let _centralRef = null;
let _uiRef = null;

function buildCentral() {
  if (q('#centralAjuda')) return q('#centralAjuda');
  const root = document.createElement('div');
  root.id = 'centralAjuda';
  root.className = 'central-ajuda';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="central-backdrop" data-central-fechar aria-hidden="true"></div>
    <div class="central-panel" role="dialog" aria-modal="true" aria-labelledby="centralTitulo" tabindex="-1">
      <div class="central-head">
        <span class="central-head-icon" aria-hidden="true"><i class="fa-solid fa-circle-question"></i></span>
        <div class="central-head-text">
          <h2 id="centralTitulo">Central de Ajuda</h2>
          <p>Tudo para dominar o simulador — do primeiro toque ao compartilhamento</p>
        </div>
        <span class="central-badge" aria-hidden="true">${SECS.length} guias</span>
        <button class="central-close" type="button" data-central-fechar aria-label="Fechar ajuda">✕</button>
      </div>
      <div class="central-cta">
        <button id="centralTourBtn" class="central-tour-btn" type="button">
          <span class="central-tour-icon"><i class="fa-solid fa-person-walking-arrow-right" aria-hidden="true"></i></span>
          <span class="central-tour-text">
            <strong>Fazer tour guiado</strong>
            <span>7 passos • ~1 min • destaca cada recurso</span>
          </span>
          <span class="central-tour-go" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>
        </button>
        <p class="central-cta-hint"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> O tour abre o menu, destaca os pontos pulsantes e o dock passo a passo.</p>
      </div>
      <div class="central-body" id="centralBody"></div>
      <footer class="central-foot">
        <span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Dica: pressione <kbd>?</kbd> a qualquer momento para abrir esta central.</span>
        <button class="central-foot-link" type="button" data-central-fechar>Fechar</button>
      </footer>
    </div>
  `;
  document.body.appendChild(root);

  const body = root.querySelector('#centralBody');
  body.innerHTML = SECS.map(
    (s, idx) => `
    <section class="central-sec ${idx === 0 ? 'aberto' : ''}" data-sec="${s.id}">
      <button class="central-sec-head" type="button" aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="central-sec-${s.id}">
        <span class="central-sec-icon" style="--sec-cor:${s.cor}"><i class="fa-solid ${s.icon}" aria-hidden="true"></i></span>
        <span class="central-sec-titles">
          <strong>${s.titulo}</strong>
          <span>${s.resumo}</span>
        </span>
        <span class="central-sec-chev" aria-hidden="true"><i class="fa-solid fa-chevron-down"></i></span>
      </button>
      <div class="central-sec-body" id="central-sec-${s.id}" ${idx === 0 ? '' : 'hidden'}>
        ${s.body}
      </div>
    </section>
  `
  ).join('');

  body.querySelectorAll('.central-sec-head').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.central-sec');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const willOpen = !expanded;
      // accordion: fecha outros, abre clicado (se já aberto, mantém? aqui toggle)
      body.querySelectorAll('.central-sec').forEach(el => {
        if (el !== sec) {
          el.classList.remove('aberto');
          const b = el.querySelector('.central-sec-head');
          const bd = el.querySelector('.central-sec-body');
          if (b) b.setAttribute('aria-expanded', 'false');
          if (bd) bd.hidden = true;
        }
      });
      sec.classList.toggle('aberto', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
      const bd = sec.querySelector('.central-sec-body');
      if (bd) bd.hidden = !willOpen;
    });
  });

  return root;
}

export function abrirCentralAjuda(ui) {
  if (ui) _uiRef = ui;
  const root = buildCentral();
  _centralRef = root;
  root.classList.add('aberto');
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('central-aberta');
  const panel = root.querySelector('.central-panel');
  const focoAnterior = document.activeElement;
  root._focoAnterior = focoAnterior;
  // focus trap
  const onKey = e => {
    if (!root.classList.contains('aberto')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      fecharCentralAjuda();
    }
    if (e.key === 'Tab') {
      const focaveis = [
        ...panel.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])'),
      ].filter(el => !el.disabled && el.offsetParent !== null);
      if (!focaveis.length) return;
      const first = focaveis[0];
      const last = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  root._onKey = onKey;
  document.addEventListener('keydown', onKey);
  root.querySelectorAll('[data-central-fechar]').forEach(el => {
    el.addEventListener('click', fecharCentralAjuda);
  });
  const tourBtn = root.querySelector('#centralTourBtn');
  if (tourBtn) {
    tourBtn.addEventListener('click', () => {
      fecharCentralAjuda();
      setTimeout(() => {
        iniciarTour(_uiRef || ui, { forcar: true }).catch(() => {});
      }, 280);
    });
  }
  // backdrop click already via data-central-fechar delegation? root backdrop has it
  const backdrop = root.querySelector('.central-backdrop');
  if (backdrop) backdrop.addEventListener('click', fecharCentralAjuda);
  setTimeout(() => {
    const firstBtn = panel.querySelector('#centralTourBtn');
    if (firstBtn) firstBtn.focus();
    else panel.focus();
  }, 60);
  // prevent body scroll
  document.documentElement.style.overflow = 'hidden';
}

export function fecharCentralAjuda() {
  const root = _centralRef || q('#centralAjuda');
  if (!root) return;
  root.classList.remove('aberto');
  root.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('central-aberta');
  document.documentElement.style.overflow = '';
  if (root._onKey) {
    document.removeEventListener('keydown', root._onKey);
    root._onKey = null;
  }
  const prev = root._focoAnterior;
  if (prev && prev.focus) {
    try {
      prev.focus();
    } catch (_) {}
  }
}

// ------------------------------------------------------------
// TOUR — 7 passos, navegação completa (voltar/próximo), Esc, ?
// ------------------------------------------------------------
const PASSOS_TOUR = [
  {
    sel: '#painel',
    fallbackSel: null,
    antes: async ui => {
      if (ui) {
        ui.setAberto(true);
        await esperar(ESPERA_DRAWER);
      }
    },
    eyebrow: 'Passo 1 de 7 — Comece aqui',
    titulo: 'Menu de Texturas',
    texto:
      'Este painel abre sozinho no primeiro acesso. Aqui ficam a busca, os filtros e todos os padrões Berneck. Ao aplicar, ele recolhe — reabra pelo hamburger ou clicando num ponto pulsante.',
    dica: 'No mobile, arraste a alça superior para ajustar a altura.',
  },
  {
    sel: '#buscaTex',
    fallbackSel: '.drawer-search',
    antes: async () => {},
    eyebrow: 'Passo 2 de 7 — Encontre rápido',
    titulo: 'Busca e Filtros',
    texto:
      'Digite um nome (ex. “Freijo”) ou toque num chip: Todas, Amadeirados, Unicolor, etc. O contador mostra quantos padrões há em cada grupo. Use as setas para navegar entre categorias.',
    dica: 'Toque em Favoritos para ver só o que você salvou.',
  },
  {
    sel: '#grade',
    fallbackSel: '#painel',
    antes: async () => {},
    eyebrow: 'Passo 3 de 7 — Escolha',
    titulo: 'Grade de Texturas',
    texto:
      'Cada card mostra miniatura, nome e acabamento. Toque para aplicar na peça selecionada. O coração favorita; a borda colorida indica a textura em uso.',
    dica: 'Os cards carregam sob demanda — role para ver mais.',
  },
  {
    sel: '.hotspot',
    fallbackSel: '#cenaBox',
    antes: async ui => {
      if (ui) {
        ui.setAberto(false);
        await esperar(ESPERA_DRAWER);
      }
    },
    eyebrow: 'Passo 4 de 7 — Interaja na cena',
    titulo: 'Pontos Pulsantes',
    texto:
      'O ponto branco pulsante é o seu controle na cena. Na Cozinha (ponto único) a troca afeta todas as peças; no Quarto, cada ponto controla um material diferente.',
    dica: 'Clicar no ponto já reabre o menu automaticamente.',
  },
  {
    sel: '#dock',
    fallbackSel: '#dock',
    antes: async () => {},
    eyebrow: 'Passo 5 de 7 — Exporte e compartilhe',
    titulo: 'Baixar, Imprimir e Compartilhar',
    texto:
      'Baixar gera um PNG com marca-d’água. Imprimir abre a ficha técnica (tabela + imagem). Compartilhar tenta enviar a imagem no WhatsApp, senão copia o link com a composição (#c= + env).',
    dica: 'Quem abrir seu link verá exatamente a mesma composição.',
  },
  {
    sel: '#envBar',
    fallbackSel: '#envBarBtn',
    antes: async () => {},
    eyebrow: 'Passo 6 de 7 — Mude o cenário',
    titulo: 'Selecionar Ambiente',
    texto:
      'O botão oval no rodapé abre a vitrine de ambientes (carrossel com dots). Escolha Cozinha ou Quarto — “Em breve” mostra um aviso.',
    dica: 'Dá para navegar com ← → Home End e arrastando.',
  },
  {
    sel: '#dock',
    fallbackSel: '#dock',
    antes: async () => {},
    eyebrow: 'Passo 7 de 7 — Finalize',
    titulo: 'Tema e Tela Cheia',
    texto:
      'O dock ainda tem Tema (claro/escuro, persiste) e Tela cheia (fullscreen). Você dominou o simulador — personalize à vontade!',
    dica: 'Pressione ? a qualquer momento para reabrir esta ajuda.',
  },
];

function resolverAlvoTour(passo) {
  let alvo = passo.sel ? q(passo.sel) : null;
  if (!alvo && passo.fallbackSel) alvo = q(passo.fallbackSel);
  // Hotspot: pega o primeiro visível se houver múltiplos
  if (passo.sel === '.hotspot' && !alvo) {
    alvo = q('.hotspot-master') || q('.hotspot') || q('#cenaBox');
  }
  return alvo;
}

export async function iniciarTour(ui, { forcar = false } = {}) {
  _uiRef = ui || _uiRef;
  try {
    if (!forcar && localStorage.getItem(STORAGE_TOUR)) return;
  } catch (_) {
    if (!forcar) return;
  }
  if (q('#tour')) return;

  // Se a central estiver aberta, fecha antes
  const central = q('#centralAjuda');
  if (central && central.classList.contains('aberto')) fecharCentralAjuda();
  await esperar(120);

  const total = PASSOS_TOUR.length;
  let idx = 0;
  let alvoAtual = null;
  let encerrado = false;
  const focoAnterior = document.activeElement;

  // DOM do tour
  const raiz = document.createElement('div');
  raiz.id = 'tour';
  raiz.innerHTML = `
    <div class="tour-veu" aria-hidden="true"></div>
    <div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tourTitulo" aria-describedby="tourDesc" tabindex="-1">
      <div class="tour-top">
        <span class="tour-eyebrow" id="tourEyebrow"></span>
        <button class="tour-fechar" type="button" aria-label="Fechar tour">✕</button>
      </div>
      <h3 class="tour-titulo" id="tourTitulo"></h3>
      <p id="tourDesc" class="tour-desc"></p>
      <p class="tour-dica" id="tourDica" aria-hidden="true"></p>
      <div class="tour-progress" aria-hidden="true"><span class="tour-progress-fill"></span></div>
      <div class="tour-nav">
        <div class="tour-dots" aria-hidden="true"></div>
        <div class="tour-actions">
          <button class="tour-pular" type="button">Pular</button>
          <button class="tour-voltar" type="button">Voltar</button>
          <button class="tour-prox" type="button">Próximo</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(raiz);
  const tip = raiz.querySelector('.tour-tip');
  const eyebrowEl = raiz.querySelector('#tourEyebrow');
  const tituloEl = raiz.querySelector('#tourTitulo');
  const textoEl = raiz.querySelector('#tourDesc');
  const dicaEl = raiz.querySelector('#tourDica');
  const fillEl = raiz.querySelector('.tour-progress-fill');
  const dotsEl = raiz.querySelector('.tour-dots');
  const proxBtn = raiz.querySelector('.tour-prox');
  const voltarBtn = raiz.querySelector('.tour-voltar');
  const pularBtn = raiz.querySelector('.tour-pular');
  const fecharBtn = raiz.querySelector('.tour-fechar');

  dotsEl.innerHTML = PASSOS_TOUR.map((_, i) => `<span data-i="${i}" aria-hidden="true"></span>`).join('');

  const encerrar = () => {
    if (encerrado) return;
    encerrado = true;
    try {
      localStorage.setItem(STORAGE_TOUR, '1');
    } catch (_) {}
    if (alvoAtual) alvoAtual.classList.remove('tour-alvo');
    raiz.remove();
    document.removeEventListener('keydown', onKey);
    if (focoAnterior && focoAnterior.focus) {
      try {
        focoAnterior.focus();
      } catch (_) {}
    }
  };

  const onKey = e => {
    if (encerrado) return;
    if (e.key === 'Escape') encerrar();
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < total - 1) irPara(idx + 1);
      else encerrar();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) irPara(idx - 1);
    }
  };

  // focus trap
  const trap = e => {
    if (e.key !== 'Tab' || encerrado) return;
    const focaveis = [
      ...tip.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])'),
    ].filter(el => !el.disabled);
    if (!focaveis.length) return;
    const first = focaveis[0];
    const last = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', onKey);
  document.addEventListener('keydown', trap);
  pularBtn.addEventListener('click', encerrar);
  fecharBtn.addEventListener('click', encerrar);
  raiz.querySelector('.tour-veu').addEventListener('click', encerrar);
  voltarBtn.addEventListener('click', () => {
    if (idx > 0) irPara(idx - 1);
  });
  proxBtn.addEventListener('click', () => {
    if (idx === total - 1) encerrar();
    else irPara(idx + 1);
  });

  // dots clicáveis
  dotsEl.querySelectorAll('span').forEach(sp => {
    sp.style.cursor = 'pointer';
    sp.addEventListener('click', () => {
      const i = Number(sp.dataset.i);
      if (!Number.isNaN(i)) irPara(i);
    });
  });

  async function renderPasso(i) {
    const p = PASSOS_TOUR[i];
    // antes hook pode abrir/fechar drawer
    if (p.antes) {
      try {
        await p.antes(_uiRef);
      } catch (_) {}
      if (encerrado) return;
    }
    const alvo = resolverAlvoTour(p);
    if (!alvo) {
      // sem alvo: pula para próximo se não for o último
      if (i < total - 1) {
        idx = i + 1;
        return renderPasso(idx);
      }
    }
    if (alvoAtual) alvoAtual.classList.remove('tour-alvo');
    alvoAtual = alvo;
    if (alvoAtual) alvoAtual.classList.add('tour-alvo');

    eyebrowEl.textContent = p.eyebrow;
    tituloEl.textContent = p.titulo;
    textoEl.textContent = p.texto;
    dicaEl.textContent = p.dica ? `💡 ${p.dica}` : '';
    dicaEl.hidden = !p.dica;

    dotsEl.querySelectorAll('span').forEach((d, j) => d.classList.toggle('on', j === i));
    proxBtn.textContent = i === total - 1 ? 'Concluir' : 'Próximo';
    voltarBtn.hidden = i === 0;
    voltarBtn.disabled = i === 0;
    voltarBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
    if (fillEl) fillEl.style.width = `${((i + 1) / total) * 100}%`;

    tip.style.visibility = 'hidden';
    tip.style.top = '0px';
    tip.style.left = '0px';
    await esperar(30);
    if (alvoAtual) posicionar(tip, alvoAtual);
    tip.style.visibility = '';
    // anuncia e foca prox
    setTimeout(() => proxBtn.focus(), 40);
  }

  async function irPara(novoIdx) {
    idx = Math.max(0, Math.min(total - 1, novoIdx));
    await renderPasso(idx);
  }

  // start
  await renderPasso(0);

  // keep promise alive until encerrar; return when done
  await new Promise(resolve => {
    const obs = new MutationObserver(() => {
      if (!document.body.contains(raiz) || encerrado) {
        obs.disconnect();
        document.removeEventListener('keydown', trap);
        resolve();
      }
    });
    obs.observe(document.body, { childList: true });
  });
}

// Atalho global "?" abre a central (quando não está em input)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (e.key !== '?' && e.key !== '/') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    // evita quando já há tour ou central aberta
    if (q('#tour') || (q('#centralAjuda') && q('#centralAjuda').classList.contains('aberto'))) return;
    e.preventDefault();
    abrirCentralAjuda(_uiRef);
  });
}

// Expõe para debug/E2E
if (typeof window !== 'undefined') {
  window.__abrirCentralAjuda = abrirCentralAjuda;
  window.__fecharCentralAjuda = fecharCentralAjuda;
}
