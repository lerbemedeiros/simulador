// ============================================================
// UI PREMIUM: drawer lateral (hamburger) com busca, filtros e grade.
// - Ao escolher uma textura: aplica, mostra toast e RECOLHE o drawer
//   (o usuário reabre pelo hamburger ou clicando num hotspot).
// - Exibe estado de carregamento por item (skeleton -> img) e marca
//   a textura ativa da zona atual com selo "Em uso".
// ============================================================
import { CATALOGO } from './loader.js';
import { GRUPOS } from './config.js';
import { diagPush } from './diag.js';

// Categorias no padrão visual do visualizador Berneck: cor, ícone e chave
// usadas nos chips (data-key) e na borda lateral dos cards de textura.
const CAT_UI = {
  Todas: { key: 'todos', icon: 'fa-border-all' },
  Amadeirados: { key: 'madeirados', icon: 'fa-tree' },
  Unicolor: { key: 'unicolor', icon: 'fa-palette' },
  'Unicolor Especial': { key: 'unicolor_especial', icon: 'fa-wand-magic-sparkles' },
  Metalizados: { key: 'metalizados', icon: 'fa-bolt' },
  Pedras: { key: 'fantasia', icon: 'fa-mountain' },
  Tecido: { key: 'fantasia', icon: 'fa-scroll' },
};
const catKey = label => (CAT_UI[label] || CAT_UI['Todas']).key;
const catIcon = label => (CAT_UI[label] || CAT_UI['Todas']).icon;

export class UI {
  constructor({ onPickTexture, onToggleDrawer }) {
    this.onPickTexture = onPickTexture;
    this.onToggleDrawer = onToggleDrawer;
    this.filtro = 'Todas';
    this.acabamento = '';
    this.busca = '';
    this.zonaSelecionada = null;
    this.aberto = true;
    this._aplicando = false;
    this._pendente = null; // último toque chegado durante uma troca (last-wins)
    this.listaEspecial = null; // 'favs' | null
    this._favs = new Set();
    try {
      const f = JSON.parse(localStorage.getItem('simFavs') || '[]');
      if (Array.isArray(f)) this._favs = new Set(f.filter(x => typeof x === 'string'));
    } catch (_) {
      /* armazenamento indisponível: segue sem persistir */
    }
    this._toastQueue = [];
    this._toastBusy = false;
    this._toastTimer = null;
    this._toastHideTimer = null;
  }

  montar(container, zonas) {
    this.zonas = zonas;
    this._io = null;
    this._gradeScrollTop = 0;
    this._texturaAtivaId = null;
    container.innerHTML = `
      <div class="sheet-handle" aria-hidden="true"></div>
      <img class="drawer-logo" src="assets/images/logo.svg" alt="Simulador de Ambientes">
      <div class="drawer-search">
        <span class="search-ico" aria-hidden="true"><i class="fa-solid fa-magnifying-glass"></i></span>
        <input id="buscaTex" type="search" placeholder="Buscar padrão..." autocomplete="off" aria-label="Buscar textura">
      </div>
      <div class="acabamentos-bar-wrap">
        <button class="cat-arrow" id="catLeft" aria-label="Anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
        <div class="chips-scroll" id="chipsScroll">
          <div class="acabamentos-bar" id="chipsBar" role="tablist" aria-label="Filtrar por categoria"></div>
          <span class="chips-fade chips-fade-l" aria-hidden="true"></span>
          <span class="chips-fade chips-fade-r" aria-hidden="true"></span>
        </div>
        <button class="cat-arrow" id="catRight" aria-label="Próximo"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
      </div>
      <div class="cat-status-bar" id="catStatus" aria-live="polite"></div>
      <div class="grade" id="grade" role="grid" aria-label="Grade de texturas"></div>
      <div class="drawer-more">
        <span class="drawer-foot-hint"><span class="dot-live"></span> Toque nos pontos pulsantes</span>
      </div>
    `;
    this.gradeEl = container.querySelector('#grade');
    this.statusEl = container.querySelector('#catStatus');
    this.chipsBar = container.querySelector('#chipsBar');
    this.chipsScroll = container.querySelector('#chipsScroll');
    this.catLeftEl = container.querySelector('#catLeft');
    this.catRightEl = container.querySelector('#catRight');
    this.drawer = container;
    this.buscaEl = container.querySelector('#buscaTex');

    this.backdrop = document.querySelector('#backdrop');
    if (this.backdrop) this.backdrop.addEventListener('click', () => this.setAberto(false));
    this._sheetDrag(container);
    this.buscaEl.addEventListener('input', () => {
      this.busca = this.buscaEl.value.trim().toLowerCase();
      this._buildGrade();
    });
    // setas — idêntico ao referência (120px fixo, como estava antes e funcionando)
    const SCROLL_CHIPS = 120;
    container
      .querySelector('#catLeft')
      .addEventListener('click', () => this.chipsBar.scrollBy({ left: -SCROLL_CHIPS, behavior: 'smooth' }));
    container
      .querySelector('#catRight')
      .addEventListener('click', () => this.chipsBar.scrollBy({ left: SCROLL_CHIPS, behavior: 'smooth' }));
    this.chipsBar.addEventListener('scroll', () => this._atualizarSetas(), { passive: true });
    window.addEventListener('resize', () => this._atualizarSetas());
    setTimeout(() => this._atualizarSetas(), 150);

    this._buildFiltros();
    this._buildGrade();
  }

  // Arrastar a alça redimensiona o bottom sheet no mobile (35%–78% da tela).
  _sheetDrag(container) {
    const handle = container.querySelector('.sheet-handle');
    if (!handle || !window.PointerEvent) return;
    let ativo = false,
      startY = 0,
      startH = 0;
    const mover = e => {
      if (!ativo) return;
      const delta = startY - e.clientY;
      const vh = window.innerHeight;
      const novo = Math.max(0.35 * vh, Math.min(0.78 * vh, startH + delta));
      container.style.height = `${Math.round(novo)}px`;
    };
    const parar = () => {
      if (!ativo) return;
      ativo = false;
      container.classList.remove('redimensionando');
      this._alturaSheet = container.style.height;
    };
    handle.addEventListener('pointerdown', e => {
      if (window.innerWidth > 900) return;
      ativo = true;
      startY = e.clientY;
      startH = container.getBoundingClientRect().height;
      container.classList.add('redimensionando');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', mover);
    handle.addEventListener('pointerup', parar);
    handle.addEventListener('pointercancel', parar);
  }

  // Grupos Berneck (chips): contagem por categoria.
  _grupos() {
    const map = new Map();
    for (const t of Object.values(CATALOGO)) {
      map.set(t.categoria, (map.get(t.categoria) || 0) + 1);
    }
    const ordem = GRUPOS.map(g => g.label);
    return [...map.entries()]
      .sort((a, b) => {
        const ia = ordem.indexOf(a[0]);
        const ib = ordem.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([nome, count]) => ({ nome, count }));
  }

  _buildFiltros() {
    const grupos = this._grupos();
    const total = Object.keys(CATALOGO).length;

    // Chips no padrão Berneck: ícone + rótulo + contador, com cor por categoria.
    // Favoritos fica por último, separado por um divisor das categorias.
    const chipEsp = () => {
      const ativo = this.listaEspecial === 'favs';
      return `<span class="acb-sep" aria-hidden="true"></span><button class="acabamento-btn${ativo ? ' active' : ''}" data-esp="favs" data-key="favoritos" role="tab" aria-selected="${ativo}"><span class="acb-nature" aria-hidden="true"></span><i class="fa-solid fa-heart acabamento-icon" aria-hidden="true"></i><span class="acabamento-label">Favoritos</span><span class="acabamento-count" data-count="favs">${this._favs.size}</span></button>`;
    };
    const chipCat = (label, count, ativo) =>
      `<button class="acabamento-btn${ativo ? ' active' : ''}" data-cat="${label}" data-key="${catKey(label)}" role="tab" aria-selected="${ativo}"><span class="acb-nature" aria-hidden="true"></span><i class="fa-solid ${catIcon(label)} acabamento-icon" aria-hidden="true"></i><span class="acabamento-label">${label}</span><span class="acabamento-count">${count}</span></button>`;

    this.chipsBar.innerHTML =
      chipCat('Todas', total, this.filtro === 'Todas' && !this.listaEspecial) +
      grupos.map(g => chipCat(g.nome, g.count, this.filtro === g.nome && !this.listaEspecial)).join('') +
      chipEsp();
    this.chipsBar.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => this.setFiltro(btn.dataset.cat));
    });
    this.chipsBar.querySelectorAll('[data-esp]').forEach(btn => {
      btn.addEventListener('click', () => this.setEspecial(btn.dataset.esp));
    });
    this._atualizarSetas();
  }

  // Estado das setas e dos gradientes — 2px threshold idêntico ao referência, como estava antes
  _atualizarSetas() {
    if (!this.chipsBar) return;
    const podeEsq = this.chipsBar.scrollLeft > 2;
    const podeDir = this.chipsBar.scrollLeft + this.chipsBar.clientWidth < this.chipsBar.scrollWidth - 2;
    if (this.catLeftEl) this.catLeftEl.disabled = !podeEsq;
    if (this.catRightEl) this.catRightEl.disabled = !podeDir;
    if (this.chipsScroll) {
      this.chipsScroll.classList.toggle('pode-esq', podeEsq);
      this.chipsScroll.classList.toggle('pode-dir', podeDir);
    }
  }

  // Traz a categoria selecionada para o centro da barra (fácil de achar).
  _rolarChipAtivo() {
    const ativo = this.chipsBar && this.chipsBar.querySelector('.acabamento-btn.active');
    if (!ativo) return;
    ativo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  setFiltro(cat) {
    this.filtro = cat;
    this.listaEspecial = null;
    this.chipsBar.querySelectorAll('[data-cat]').forEach(b => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.chipsBar.querySelectorAll('[data-esp]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    this._buildGrade();
    this._atualizarSetas();
    this._rolarChipAtivo();
  }

  // Lista especial: favoritos (cruzam com busca/filtros).
  setEspecial(modo) {
    this.listaEspecial = modo;
    this.chipsBar.querySelectorAll('[data-esp]').forEach(b => {
      const on = b.dataset.esp === modo;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.chipsBar.querySelectorAll('[data-cat]').forEach(b => {
      const on = !modo && b.dataset.cat === this.filtro;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    this._buildGrade();
    this._atualizarSetas();
    this._rolarChipAtivo();
  }

  _listaFiltrada() {
    let lista = Object.values(CATALOGO).filter(t => {
      const okGrupo = this.filtro === 'Todas' || t.categoria === this.filtro;
      const okBusca =
        !this.busca || t.nome.toLowerCase().includes(this.busca) || t.id.toLowerCase().includes(this.busca);
      return okGrupo && okBusca;
    });
    if (this.listaEspecial === 'favs') {
      lista = lista.filter(t => this._favs.has(t.id));
    }
    return lista;
  }

  // Favoritar/desfavoritar sem perder o scroll da grade.
  _alternarFav(texId) {
    if (this._favs.has(texId)) this._favs.delete(texId);
    else this._favs.add(texId);
    try {
      localStorage.setItem('simFavs', JSON.stringify([...this._favs]));
    } catch (_) {}
    this._atualizarChipsEspeciais();
    const on = this._favs.has(texId);
    this.gradeEl.querySelectorAll(`[data-fav="${texId}"]`).forEach(el => {
      el.classList.toggle('ativo', on);
      el.setAttribute('aria-pressed', String(on));
      const ic = el.querySelector('i');
      if (ic) ic.className = on ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    });
    if (this.listaEspecial === 'favs' && !on) {
      const ativa = this.gradeEl.querySelector('.item.ativo')?.dataset.id;
      this._buildGrade(ativa);
    }
  }

  _atualizarChipsEspeciais() {
    const f = this.chipsBar.querySelector('[data-count="favs"]');
    if (f) f.textContent = this._favs.size;
  }

  _escape(s) {
    return String(s).replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  // Nome sem repetir o acabamento no final ("Amantea Tatto" → "Amantea").
  _nomeLimpo(t) {
    const ac = t.acabamento;
    if (ac && t.nome.toLowerCase().endsWith(ac.toLowerCase())) {
      return t.nome.slice(0, t.nome.length - ac.length).trim();
    }
    return t.nome;
  }

  // Nome de exibição da textura (mesmo critério dos cards), usado na marca d'água.
  nomeDaTextura(texId) {
    const t = CATALOGO[texId];
    return t ? this._nomeLimpo(t) : '';
  }

  _setupIO() {
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
    if (typeof IntersectionObserver === 'undefined') return;
    this._io = new IntersectionObserver(
      entries => {
        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          const img = ent.target;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
          }
          this._io.unobserve(img);
        }
      },
      { root: this.drawer, rootMargin: '200px 0px', threshold: 0.01 }
    );
  }

  _buildGrade(texturaAtivaId) {
    // Usa última textura ativa se não for passada (mantém seleção entre filtros/busca)
    if (texturaAtivaId === undefined) texturaAtivaId = this._texturaAtivaId;
    else this._texturaAtivaId = texturaAtivaId;
    const todos = this._listaFiltrada();
    const rotulo =
      this.listaEspecial === 'favs' ? 'Favoritos' : this.filtro === 'Todas' ? 'Todos' : this.filtro;
    const icone = this.listaEspecial === 'favs' ? 'fa-heart' : catIcon(this.filtro);
    this.statusEl.innerHTML = `
      <span class="csb-icon"><i class="fa-solid ${icone}" aria-hidden="true"></i></span>
      <span class="csb-label">${rotulo}</span>
      <span class="csb-count">${todos.length} ${todos.length === 1 ? 'padrão' : 'padrões'}</span>`;
    if (!todos.length) {
      const isFav = this.listaEspecial === 'favs';
      if (isFav) {
        this.gradeEl.innerHTML = `<div class="vazio vazio-fav"><div class="vazio-ico fav"><i class="fa-regular fa-heart"></i></div><p class="esf-title">Nenhum favorito ainda</p><p class="esf-sub">Toque no <i class="fa-regular fa-heart esf-inline-heart"></i> em qualquer textura para salvá-la aqui. No celular, deslize para a direita para favoritar.</p></div>`;
      } else {
        const termo = this.busca
          ? ` para &quot;${String(this.busca).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])}&quot;`
          : '';
        this.gradeEl.innerHTML = `<div class="vazio"><div class="vazio-ico"><i class="fa-solid fa-magnifying-glass"></i></div><p class="es-title">Nenhum resultado${termo}</p><p class="es-sub">Tente outro nome, acabamento ou limpe os filtros ativos.</p><button class="es-clear" type="button" id="vazioLimpar"><i class="fa-solid fa-xmark"></i> Limpar busca</button></div>`;
      }
      const btnLimpar = this.gradeEl.querySelector('#vazioLimpar');
      if (btnLimpar)
        btnLimpar.addEventListener('click', () => {
          this.busca = '';
          if (this.buscaEl) this.buscaEl.value = '';
          this.filtro = 'Todas';
          this.listaEspecial = null;
          this._buildFiltros();
          this._buildGrade();
        });
      return;
    }
    // Mostra todas de uma vez — sem paginação / sem botão "Ver mais"
    const itens = todos;
    this.gradeEl.innerHTML = itens
      .map((t, i) => {
        const fav = this._favs.has(t.id);
        const ativo = t.id === texturaAtivaId;
        const k = catKey(t.categoria);
        const catCls =
          k === 'madeirados'
            ? 'cat-madeirados'
            : k === 'fantasia'
              ? 'cat-fantasia'
              : k === 'unicolor'
                ? 'cat-unicolors'
                : k === 'metalizados'
                  ? 'cat-metalizados'
                  : k === 'unicolor_especial'
                    ? 'cat-metalizados_especiais'
                    : 'cat-fantasia';
        const escNome = this._escape(t.nome);
        const escNomeLimpo = this._escape(this._nomeLimpo(t));
        const escCat = this._escape(t.categoria);
        const escAcab = this._escape(t.acabamento || t.categoria);
        const escId = this._escape(t.id);
        return `
      <button class="item ${ativo ? 'ativo' : ''}" data-id="${escId}" data-key="${k}" title="${escNome}" role="gridcell" style="animation-delay:${Math.min(i, 14) * 26}ms; content-visibility:auto; contain-intrinsic-size:140px 160px">
        <span class="item-thumb"><img data-src="${this._escape(t.thumb)}" alt="${escNome}" decoding="async" loading="lazy"></span>
        <span class="item-info">
          <span class="item-nome">${escNomeLimpo}</span>
          <span class="item-acabamento">${escAcab}</span>
          <span class="tex-category-badge ${catCls}">${escCat}</span>
        </span>
        <span class="item-fav ${fav ? 'ativo' : ''}" data-fav="${escId}" role="button" tabindex="0" aria-pressed="${fav}" aria-label="Favoritar ${escNome}" title="Favoritar"><i class="fa-${fav ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i></span>
      </button>`;
      })
      .join('');

    this._setupIO();
    this.gradeEl.querySelectorAll('.item img[data-src]').forEach(img => {
      if (this._io) this._io.observe(img);
      else {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
      img.addEventListener(
        'error',
        () => {
          img.closest('.item')?.classList.add('sem-thumb');
        },
        { once: true }
      );
    });

    this.gradeEl.querySelectorAll('.item').forEach(el => {
      el.addEventListener('click', () => this._clicarItem(el));
    });
    this.gradeEl.querySelectorAll('[data-fav]').forEach(el => {
      const alternar = e => {
        e.stopPropagation();
        e.preventDefault();
        this._alternarFav(el.dataset.fav);
      };
      el.addEventListener('click', alternar);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alternar(e);
        }
      });
    });
  }

  // Último toque vence: se chegar um toque no meio de uma troca, ele
  // entra na fila (só o mais recente) em vez de ser descartado — por
  // isso toques rápidos nunca "morrem" nem travam o menu.
  async _clicarItem(el) {
    const texId = el?.dataset?.id;
    if (!texId) return;
    if (this._aplicando) {
      this._pendente = texId;
      return;
    }
    this._aplicando = true;
    try {
      let id = texId;
      while (id) {
        this._pendente = null;
        await this._aplicarUm(id);
        id = this._pendente;
      }
    } finally {
      this._aplicando = false;
    }
  }

  async _aplicarUm(texId) {
    // Re-localiza o botão (a grade pode ter sido reconstruída no meio).
    const el = this.gradeEl.querySelector(`.item[data-id="${texId}"]`);
    if (el) el.classList.add('carregando');
    // Cede a thread p/ o shimmer pintar ANTES do render síncrono:
    // sem isso o toque parece "morto" em aparelho mais lento.
    await new Promise(r => setTimeout(r, 30));
    diagPush({ ev: 'swap-start', tex: texId });
    // Timeout de segurança: se o load da textura pendurar, destrava o
    // menu para as próximas trocas (antes, uma imagem lenta bloqueava TUDO).
    const TIMEOUT_TROCA = 20000;
    const comTimeout = p =>
      Promise.race([
        p,
        new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('timeout-troca')), TIMEOUT_TROCA)),
      ]);
    try {
      const t0 = performance.now();
      const ok = await comTimeout(this.onPickTexture(texId));
      const ms = performance.now() - t0;
      const IS_DEV_UI = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (IS_DEV_UI) {
        (window.__swaps = window.__swaps || []).push({ tex: texId, ms: Math.round(ms), ok });
        if (window.__swaps.length > 40) window.__swaps.shift();
      }
      if (ms > 1500 || ok === false)
        console.warn('[simulador] troca lenta/falha:', texId, `${Math.round(ms)}ms`, ok);
      diagPush({ ev: ok === false ? 'swap-fail' : 'swap-ok', tex: texId, ms: Math.round(ms) });
      if (ok === false) {
        this.toast('Falha ao carregar textura. Tente outra.', 'erro');
      } else {
        const atual = this.gradeEl.querySelector(`.item[data-id="${texId}"]`);
        this._marcarAtivo(atual);
        const nome = atual?.querySelector('.item-nome')?.textContent || texId;
        const thumb = atual?.querySelector('.item-thumb img')?.getAttribute('src') || null;
        const acab = atual?.querySelector('.item-acabamento')?.textContent?.trim() || null;
        this.toast(`Aplicado: ${nome}`, 'ok', thumb, acab);
        // Sai da tela após escolher — reabre pelo hamburger/hotspot.
        this.setAberto(false);
      }
    } catch (_) {
      diagPush({ ev: 'swap-fail', tex: texId, ms: -1 });
      this.toast('Falha ao carregar textura. Tente outra.', 'erro');
    } finally {
      // Respira antes de liberar: deixa o toast/shimmer pintar e os
      // toques acumulados coalescerem num só (anti-espiral em aparelho lento).
      await new Promise(r => setTimeout(r, 0));
      if (el) el.classList.remove('carregando');
    }
  }

  _marcarAtivo(el) {
    this.gradeEl.querySelectorAll('.item').forEach(i => {
      i.classList.remove('ativo');
      const badge = i.querySelector('.item-badge');
      if (badge) badge.innerHTML = '';
    });
    if (el) {
      el.classList.add('ativo');
      const badge = el.querySelector('.item-badge');
      if (badge) badge.innerHTML = '<i class="fa-solid fa-check"></i> Em uso';
      this._texturaAtivaId = el.dataset.id;
      // Salva scroll para restaurar ao reabrir
      if (this.drawer) this._gradeScrollTop = this.drawer.scrollTop;
    }
  }

  setZona(zona, texturaAtivaId) {
    this.zonaSelecionada = zona;
    if (texturaAtivaId !== undefined) this._texturaAtivaId = texturaAtivaId;
    this._buildGrade(this._texturaAtivaId);
  }

  setAberto(aberto) {
    // Ao fechar, salva scroll para restaurar depois
    if (!aberto && this.drawer) {
      this._gradeScrollTop = this.drawer.scrollTop;
    }
    this.aberto = aberto;
    document.body.classList.toggle('drawer-fechado', !aberto);
    if (this.drawer) {
      if (aberto) {
        // Re-triggera a animação de entrada (menuIn) a cada abertura (desktop).
        if (window.innerWidth > 900) {
          this.drawer.classList.remove('menu-in');
          void this.drawer.offsetWidth;
          this.drawer.classList.add('menu-in');
        }
        if (this._alturaSheet && window.innerWidth <= 900) {
          this.drawer.style.height = this._alturaSheet;
        } else {
          this.drawer.style.height = '';
        }
        setTimeout(() => {
          this._atualizarSetas();
          this._rolarChipAtivo();
          // Restaura scroll na textura selecionada — mantém posição entre aberturas
          const salvo = this._gradeScrollTop;
          if (salvo != null && salvo > 0) {
            this.drawer.scrollTop = salvo;
          } else {
            const ativo = this.gradeEl && this.gradeEl.querySelector('.item.ativo');
            if (ativo) ativo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }, 120);
      } else {
        this.drawer.classList.remove('menu-in');
        this.drawer.style.height = '';
      }
    }
    const burger = document.querySelector('#hamburger');
    if (burger) {
      burger.classList.toggle('aberto', aberto);
      burger.setAttribute('aria-expanded', String(aberto));
      burger.setAttribute('aria-label', aberto ? 'Fechar menu de texturas' : 'Abrir menu de texturas');
      const ic = burger.querySelector('i');
      if (ic) ic.className = aberto ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    }
    if (this.onToggleDrawer) this.onToggleDrawer(aberto);
  }

  alternar() {
    this.setAberto(!this.aberto);
  }

  // Fila de toasts — 1 por vez, idêntico ao #aviso-ilustrativo Berneck (sem sobreposição)
  toast(msg, tipo = 'ok', thumbUrl = null, acabamento = null) {
    if (!this._toastQueue) this._toastQueue = [];
    this._toastQueue.push({ msg, tipo, thumbUrl, acabamento });
    if (!this._toastBusy) this._mostrarProximoToast();
  }

  _mostrarProximoToast() {
    if (!this._toastQueue || this._toastQueue.length === 0) {
      this._toastBusy = false;
      return;
    }
    this._toastBusy = true;
    const { msg, tipo, thumbUrl, acabamento } = this._toastQueue.shift();
    let t = document.querySelector('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      t.setAttribute('aria-atomic', 'true');
      document.body.appendChild(t);
    }
    const esc = s =>
      String(s).replace(
        /[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
      );
    const norm = String(tipo || 'ok').toLowerCase();
    const isErro = norm === 'erro' || norm === 'error' || norm === 'danger';
    const isInfo = norm === 'info' || norm === 'aviso' || norm === 'warning';
    void (isErro ? 'erro' : isInfo ? 'info' : 'ok');

    const pickIcon = () => {
      if (isErro) return 'fa-triangle-exclamation';
      const m = String(msg).toLowerCase();
      if (/compartilhada|compartilhar/.test(m)) return 'fa-link';
      if (/copiado|link/.test(m)) return 'fa-link';
      if (/baixad/.test(m)) return 'fa-download';
      if (/enviad/.test(m)) return 'fa-paper-plane';
      if (/desfeit/.test(m)) return 'fa-rotate-left';
      if (/restaurad|padrão/.test(m)) return 'fa-rotate';
      if (/nada para desfazer/.test(m)) return 'fa-circle-info';
      if (/em breve/.test(m)) return 'fa-clock';
      if (/carregad/.test(m)) return 'fa-circle-check';
      if (/favorit/.test(m)) return 'fa-heart';
      return 'fa-check';
    };
    const iconName = pickIcon();

    // --- título / subtítulo idêntico ao .aviso-texto (strong + span) ---
    let titulo = String(msg).trim();
    let subtitulo = '';
    if (thumbUrl && !isErro && /^Aplicado:/.test(msg)) {
      titulo = msg.replace(/^Aplicado:\s*/, '').trim();
      subtitulo = acabamento ? String(acabamento).trim() : '';
      if (!subtitulo) subtitulo = 'Toque novamente para trocar';
    } else if (isErro) {
      titulo = 'Erro';
      subtitulo = String(msg).trim();
    } else if (/^Composição compartilhada carregada$/i.test(titulo)) {
      titulo = 'Composição carregada';
      subtitulo = 'Link compartilhável aberto';
    } else if (/^Link copiado!/i.test(titulo)) {
      titulo = 'Link copiado!';
      subtitulo = 'Cole no WhatsApp para compartilhar';
    } else if (/^Imagem baixada/i.test(titulo)) {
      subtitulo = titulo.includes(':') ? '' : '';
      // mantém titulo como está; subtitulo vazio deixa só 1 linha forte
      if (!titulo.includes(':')) subtitulo = 'Download concluído';
      else {
        const base = titulo;
        titulo = base;
        subtitulo = 'Download concluído';
      }
    } else if (/^Imagem enviada/i.test(titulo)) {
      subtitulo = '';
    } else if (/^Nada para desfazer/i.test(titulo)) {
      subtitulo = 'Nenhuma alteração para desfazer';
      titulo = 'Nada para desfazer';
    } else if (/em breve/i.test(titulo)) {
      const base = titulo.replace(/ — em breve/i, '').trim();
      titulo = base;
      subtitulo = 'Em breve';
    } else if (/carregado$/i.test(titulo) && titulo.includes('Ambiente')) {
      subtitulo = '';
    }

    const isCard = thumbUrl && !isErro && /^Aplicado:/.test(msg);
    const dur = /copiado|compartilhada/i.test(msg) ? 3800 : 3200;
    const barraCls = isErro ? 'toast-barra erro' : 'toast-barra';

    if (isCard) {
      // — card idêntico ao #product-card do Berneck, porém no topo central —
      const texId = String(thumbUrl)
        .split('/')
        .pop()
        .replace(/\.[^.]+$/, '');
      const entry = CATALOGO[texId] || CATALOGO[titulo] || null;
      const categoria = entry?.categoria || '';
      const k = categoria ? catKey(categoria) : acabamento ? catKey(acabamento) : 'todos';
      const catCls =
        k === 'madeirados'
          ? 'cat-madeirados'
          : k === 'fantasia'
            ? 'cat-fantasia'
            : k === 'unicolor'
              ? 'cat-unicolors'
              : k === 'metalizados'
                ? 'cat-metalizados'
                : k === 'unicolor_especial'
                  ? 'cat-metalizados_especiais'
                  : '';
      const badgeHtml = categoria
        ? `<span class="tex-category-badge ${catCls}">${esc(categoria)}</span>`
        : '';
      t.className = 'toast--card';
      if (k) t.setAttribute('data-cat', k);
      else t.removeAttribute('data-cat');
      t.innerHTML = `
        <div class="toast-content toast-content--card">
          <img class="toast-pc-image" src="${esc(thumbUrl)}" alt="${esc(titulo)}" style="display:block">
          <div class="toast-product-info">
            <h3 class="toast-pc-name">${esc(titulo)}</h3>
            <p class="toast-pc-finish">${esc(subtitulo)}</p>
            ${badgeHtml}
          </div>
          <button class="toast-close" type="button" aria-label="Fechar notificação"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="${barraCls}" aria-hidden="true" style="--toast-dur:${dur}ms"></div>
      `;
    } else {
      let iconHtml = '';
      const icCls = isErro ? 'toast-icon erro' : isInfo ? 'toast-icon info' : 'toast-icon';
      iconHtml = `<div class="${icCls}" aria-hidden="true"><i class="fa-solid ${iconName}"></i></div>`;
      const subHtml = subtitulo ? `<span>${esc(subtitulo)}</span>` : '';
      t.className = isErro ? 'erro' : '';
      t.classList.remove('toast--card');
      t.removeAttribute('data-cat');
      t.innerHTML = `
        <div class="toast-content">
          ${iconHtml}
          <div class="toast-texto">
            <strong>${esc(titulo)}</strong>
            ${subHtml}
          </div>
          <button class="toast-close" type="button" aria-label="Fechar notificação"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="${barraCls}" aria-hidden="true" style="--toast-dur:${dur}ms"></div>
      `;
    }
    // força reflow e mostra
    void t.offsetWidth;
    requestAnimationFrame(() => t.classList.add('show'));
    const barra = t.querySelector('.toast-barra');
    if (barra) barra.style.setProperty('--toast-dur', `${dur}ms`);

    clearTimeout(this._toastTimer);
    clearTimeout(this._toastHideTimer);

    const fechar = () => {
      t.classList.remove('show');
      clearTimeout(this._toastTimer);
      // após transição (350ms) libera próximo da fila
      this._toastHideTimer = setTimeout(() => this._mostrarProximoToast(), 380);
    };

    const btn = t.querySelector('.toast-close');
    if (btn) btn.addEventListener('click', fechar, { once: true });

    // auto-fecha
    this._toastTimer = setTimeout(fechar, dur);

    // pausa no hover (barra + timer)
    let pausado = false,
      rest = dur,
      inicio = Date.now(),
      pausaEm = 0;
    const pausar = () => {
      if (pausado) return;
      pausado = true;
      pausaEm = Date.now();
      clearTimeout(this._toastTimer);
      if (barra) barra.style.animationPlayState = 'paused';
    };
    const retomar = () => {
      if (!pausado) return;
      pausado = false;
      const decorrido = pausaEm - inicio;
      rest = Math.max(0, rest - decorrido);
      inicio = Date.now();
      if (barra) barra.style.animationPlayState = 'running';
      if (rest <= 0) fechar();
      else this._toastTimer = setTimeout(fechar, rest);
    };
    t.onmouseenter = pausar;
    t.onmouseleave = retomar;
    // clique fora do X não fecha (mantém idêntico ao aviso Berneck: só X fecha)
  }
}
