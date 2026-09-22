// ============================================================
// INTERACTION: hotspots exclusivamente para troca de texturas.
// UM hotspot ("master"): bola + barra + etiqueta viva com o nome e o
// acabamento da textura majoritária; o clique abre o menu e a textura
// escolhida é aplicada em TODAS as peças de uma vez.
// A edição por peça continua pelo modal "Peças > Editar".
// Clicar na cena NÃO troca textura — apenas os hotspots.
// ============================================================

// Pseudo-zona: representa todas as peças (troca global).
export const ZONA_TODAS = { id: '__todas', label: 'Todas as peças' };

// ============================================================
// POSIÇÃO MANUAL do hotspot master (% da cena, 0–100):
// - x = horizontal (0 = esquerda, 100 = direita)
// - y = vertical   (0 = topo,     100 = base)
// Exemplos: { x: 50, y: 51 } = centro | { x: 20, y: 70 } = baixo-esquerda
// Use null para voltar ao centroide médio automático das peças.
// Arquivo: public/js/interaction.js (é só editar estes 2 números).
// ============================================================

// altera a posição do hotspot (cozinha = master único)

export const POSICAO_MASTER = { x: 34, y: 16 };

// Quando true, cria 1 hotspot por zona com material independente (quarto).
// Cozinha continua com 1 hotspot master — mas o VISUAL (cores/tamanho)
// é unificado com o quarto via CSS.
function modoPorZona(cfg) {
  if (!cfg || !cfg.zonas || !cfg.zonas.length) return false;
  if (cfg.modoHotspots === 'por_zona') return true;
  if (cfg.modoHotspots === 'master') return false;
  if (cfg.id === 'quarto' && cfg.zonas.length >= 2) return true;
  return false;
}

export class Interaction {
  constructor(compositor, callbacks) {
    this.comp = compositor;
    this.cb = callbacks || {};
    this.canvas = compositor.canvas;
    this.zonaAtiva = null;
    this.hotspotsEl = null;
    this._botoes = new Map();
    // Zona pré-selecionada ao montar os hotspots (padrão: master/todas).
    // Cenas futuras podem alterar este valor antes de chamar montarHotspots.
    this.zonaPadrao = ZONA_TODAS;
    this._bind();
  }

  // Cria a camada de hotspots dentro do wrapper da cena (.cena-box tem
  // exatamente o tamanho exibido do canvas, então % alinha em qualquer tela).
  // Cozinha: hotspot ÚNICO (master) no centroide médio.
  // Quarto (2 zonas): 1 hotspot por zona com material independente.
  montarHotspots(cenaBox, zonas) {
    let layer = cenaBox.querySelector('.hotspots');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'hotspots';
      layer.setAttribute('aria-label', 'Ponto de personalização');
      cenaBox.appendChild(layer);
    }
    layer.innerHTML = '';
    this.hotspotsEl = layer;
    this._botoes.clear();

    const porZona = modoPorZona(this.comp.env.cfg);

    if (porZona) {
      // 2 hotspots — um por zona, posição no centroide real da máscara
      this.zonaPadrao = zonas[0] || null;
      for (const zona of zonas) {
        const pos = this.comp.hotspotDe(zona.id);
        let cx = pos ? pos.x : 50,
          cy = pos ? pos.y : 50;
        // override manual por zona: zona.hotspot = {x,y}
        if (zona.hotspot) {
          cx = zona.hotspot.x;
          cy = zona.hotspot.y;
        }
        cx = Math.min(92, Math.max(8, cx));
        cy = Math.min(92, Math.max(8, cy));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hotspot hotspot-zona';
        btn.dataset.zona = zona.id;
        btn.title = `Trocar ${zona.label}`;
        btn.setAttribute('aria-label', `Trocar ${zona.label}`);
        btn.style.left = `${cx}%`;
        btn.style.top = `${cy}%`;
        btn.innerHTML = `
          <span class="hs-pulse" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.56 8.94 7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 0 0 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10 10 5.21 14.79 10H5.21z"/><path fill="#F2B301" d="M19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/></svg>
          </span>
          <span class="hs-trilho" aria-hidden="true"></span>
          <span class="hs-nome" aria-hidden="true">${zona.label}</span>`;
        btn.addEventListener('click', ev => {
          ev.stopPropagation();
          this.selecionar(zona);
        });
        this._botoes.set(zona.id, btn);
        layer.appendChild(btn);
      }
      if (this._rotulosPorZona) this.definirRotulosPorZona(this._rotulosPorZona);
      if (!this.zonaAtiva) this.selecionarPadrao();
      else this._pintarAtivo();
      return;
    }

    // — Master único (cozinha) —
    // Posição: fixa (POSICAO_MASTER) ou centroide médio das peças.
    // Para mover o hotspot, edite POSICAO_MASTER no topo deste arquivo.
    let cx = 50,
      cy = 42;
    if (POSICAO_MASTER) {
      cx = POSICAO_MASTER.x;
      cy = POSICAO_MASTER.y;
    } else {
      let sx = 0,
        sy = 0,
        n = 0;
      for (const zona of zonas) {
        const pos = this.comp.hotspotDe(zona.id);
        if (pos) {
          sx += pos.x;
          sy += pos.y;
          n++;
        }
      }
      if (n) {
        cx = sx / n;
        cy = sy / n;
      }
    }
    cx = Math.min(92, Math.max(8, cx));
    cy = Math.min(92, Math.max(8, cy));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot hotspot-master';
    btn.dataset.zona = ZONA_TODAS.id;
    btn.title = 'Trocar a textura de todas as peças';
    btn.setAttribute('aria-label', 'Trocar a textura de todas as peças');
    btn.style.left = `${cx}%`;
    btn.style.top = `${cy}%`;
    btn.innerHTML = `
      <span class="hs-pulse" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M16.56 8.94 7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 0 0 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10 10 5.21 14.79 10H5.21z"/><path fill="#F2B301" d="M19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/></svg>
      </span>
      <span class="hs-trilho" aria-hidden="true"></span>
      <span class="hs-nome" aria-hidden="true">…</span>`;
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      this.selecionar(ZONA_TODAS);
    });
    this._botoes.set(ZONA_TODAS.id, btn);
    layer.appendChild(btn);
    // Aplica o último rótulo conhecido (o master pode montar depois
    // do primeiro atualizarSelo).
    if (this._rotulo) this.definirRotuloMaster(this._rotulo.nome, this._rotulo.linha);
    if (!this.zonaAtiva) this.selecionarPadrao();
    else this._pintarAtivo();
  }

  // Seleciona a zona padrão (master por padrão). Chamar após montarHotspots.
  selecionarPadrao() {
    this.selecionar(this.zonaPadrao);
  }

  // Rótulo do master: mostra o nome do padrão majoritário ao lado do
  // botão (linha + nome na tela) e atualiza tooltip/aria-label.
  definirRotuloMaster(nome, linha) {
    this._rotulo = { nome, linha };
    const btn = this._botoes.get(ZONA_TODAS.id);
    if (!btn) return;
    const visivel = nome && nome !== '—' ? nome : 'Toque para trocar';
    const n = btn.querySelector('.hs-nome');
    if (n) n.textContent = visivel;
    const sufixo = nome && nome !== '—' ? ` — ${nome}` : '';
    const rotulo = `Trocar a textura de todas as peças${sufixo}`;
    btn.title = rotulo;
    btn.setAttribute('aria-label', rotulo);
  }

  // Quarto: rótulos por zona (nome da textura aplicada em cada peça)
  definirRotulosPorZona(mapa) {
    this._rotulosPorZona = mapa;
    for (const [zonaId, { nome, linha: _linha }] of Object.entries(mapa)) {
      const btn = this._botoes.get(zonaId);
      if (!btn) continue;
      const visivel = nome && nome !== '—' ? nome : btn.dataset.zona;
      const n = btn.querySelector('.hs-nome');
      if (n) n.textContent = visivel;
      const zona = this.comp.env.cfg.zonas.find(z => z.id === zonaId);
      const label = zona ? zona.label : zonaId;
      const rotulo = nome && nome !== '—' ? `${label} — ${nome}` : `Trocar ${label}`;
      btn.title = rotulo;
      btn.setAttribute('aria-label', rotulo);
    }
  }

  // Compat: sem etiquetas, vira no-op (mantido p/ não quebrar chamadas).
  atualizarResumo(_zonaId) {}
  atualizarTodos() {}

  marcarAtivo(zonaId) {
    this.zonaAtiva = this.comp.env.cfg.zonas.find(z => z.id === zonaId) || this.zonaAtiva;
    this._pintarAtivo();
  }

  _pintarAtivo() {
    if (!this._botoes) return;
    for (const [id, btn] of this._botoes) {
      btn.classList.toggle('ativo', !!(this.zonaAtiva && this.zonaAtiva.id === id));
    }
  }

  // Converte coordenadas de evento (cliente) para o espaço do canvas
  _toCanvas(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (this.comp.W / r.width);
    const y = (e.clientY - r.top) * (this.comp.H / r.height);
    return { x, y };
  }

  _bind() {
    // Sem clique na cena — apenas hotspots para troca de textura.
    // Cursor sempre padrão.
  }

  selecionar(zona) {
    this.zonaAtiva = zona;
    this._pintarAtivo();
    // Sem highlight em canvas: o feedback é o hotspot ativo.
    this.comp.limparDestaque();
    if (this.cb.onSelect) this.cb.onSelect(zona);
  }

  // Compat: não há mais destaque em canvas.
  destacar(_zona) {
    this._pintarAtivo();
  }

  limparDestaque() {
    this.comp.limparDestaque();
  }
}
