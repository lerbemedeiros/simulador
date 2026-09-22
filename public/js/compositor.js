// ============================================================
// COMPOSITOR: pipeline "base final + relight por zona" (Canvas 2D).
//
// A base é o render FINAL (ex. 89.jpg): parede, piso, eletros e luz
// (sol, sombras das folhas) já prontos. O browser NÃO aplica nenhum
// blend em tela cheia — fora das zonas editáveis, o pixel da base
// vai intacto para a tela.
//
// Por zona editável (recortada pela máscara individual):
//   1. source-over -> textura em tiling, re-iluminada com a luz
//      capturada da própria base (fator = luminância_base / REF da
//      zona; preserva manchas de sol e sombras sobre a madeira nova)
//   2. multiply    -> passe de sombras, recortado pela MESMA máscara
//      (detalhe de AO; nunca toca parede/piso/eletros)
//   3. screen      -> passe de reflexos, recortado pela MESMA máscara
//
// Pressuposto: base = render final com marcenaria clara/neutra, para
// que a luminância da base represente só a luz incidente.
// ============================================================

export class Compositor {
  constructor(env) {
    this.env = env; // objeto retornado por carregarAmbiente()
    this.W = env.cfg.width;
    this.H = env.cfg.height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    // Contexto de SOFTWARE (willReadFrequently): leitura de pixels exata
    // e sem sincronização com a GPU (a troca incremental só é idêntica ao
    // render completo com aritmética exata; hardware deixa resíduo de
    // anti-alias nas bordas da máscara). Na sua CPU de edição é rápido.
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Canvas oculto: guarda a cena renderizada SEM destaque, para que
    // o highlight possa ser aplicado/removido sem re-renderizar do zero.
    this._back = document.createElement('canvas');
    this._back.width = this.W;
    this._back.height = this.H;
    this._bctx = this._back.getContext('2d', { willReadFrequently: true });

    // Máscara individual por zona (gerada via flood fill no id_map e
    // refinada pelo PNG da zona) e cache de tiles de textura.
    this._mascaras = new Map(); // zonaId -> canvas (alpha)
    this._maskAlpha = new Map(); // zonaId -> Uint8ClampedArray (alpha recortado p/ bbox)
    this._texCache = new Map(); // texturaId -> HTMLImageElement (original)
    this._idMapData = null; // bytes do id_map p/ detecção de clique

    // Estado: textura ativa por zona
    this.texturas = { ...env.cfg.padraoZona };
    // Sobrescrita da escala do veio por zona (slider "Tamanho do veio").
    this.escalas = {};

    // Fila de render: evita renders sobrepostos quando o usuário clica
    // rápido em várias texturas (segunda causa do "travamento").
    this._renderToken = 0;
    this._rendering = false;
    this._renderPendente = false;
  }

  // ---- Pré-processa o id_map para leitura de cor por pixel ----
  prepareIdMap() {
    const t = document.createElement('canvas');
    t.width = this.W;
    t.height = this.H;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.drawImage(this.env.idMap, 0, 0, this.W, this.H);
    this._idMapData = c.getImageData(0, 0, this.W, this.H).data;
  }

  // Detecção de zona por color picking (seção 3 do spec):
  // lê o pixel exato no id_map e procura a zona cuja cor cadastrada
  // bate com tolerância < 5 por canal. Sem "cor mais próxima":
  // fora de tolerância retorna null (clique em área não editável).
  zonaEm(x, y) {
    if (!this._idMapData) this.prepareIdMap();
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return null;
    const i = (y * this.W + x) * 4;
    const r = this._idMapData[i],
      g = this._idMapData[i + 1],
      b = this._idMapData[i + 2];

    const TOL = 5;
    for (const z of this.env.cfg.zonas) {
      if (Math.abs(z.cor[0] - r) < TOL && Math.abs(z.cor[1] - g) < TOL && Math.abs(z.cor[2] - b) < TOL) {
        return z;
      }
    }
    return null;
  }

  // ---- Máscara individual da zona (seção 1 do spec) ----
  // Ideal: um PNG por zona em `zona.mascara` (branco = dentro da peça).
  // Fallback (assets atuais: um PNG combinado p/ todas as zonas):
  // flood fill 4-conexo no id_map a partir de `zona.seed` com tolerância
  // de cor, isolando só a componente conexa da peça; se houver arquivo
  // de máscara, o alpha dele refina as bordas por intersecção.
  _gerarMascara(zona) {
    if (this._mascaras.has(zona.id)) return this._mascaras.get(zona.id);
    if (!this._idMapData) this.prepareIdMap();

    const mask = document.createElement('canvas');
    mask.width = this.W;
    mask.height = this.H;
    // Contexto de SOFTWARE (willReadFrequently): leitura de pixels sem
    // sincronização com a GPU. GPU + getImageData + trocas rápidas é a
    // receita clássica de "aba congela" em máquinas com placa de vídeo.
    const mc = mask.getContext('2d', { willReadFrequently: true });
    const md = mc.createImageData(this.W, this.H);
    const mpx = md.data;

    const [sx, sy] = zona.seed;
    const d = this._idMapData;
    const [zr, zg, zb] = zona.cor;
    const tol = 22;

    // BFS (flood fill) a partir da semente: isola a componente conexa da peça
    const W = this.W,
      H = this.H;
    const visitado = new Uint8Array(W * H);
    const fila = new Int32Array(W * H);
    let head = 0,
      tail = 0;
    const seedI = sy * W + sx;
    fila[tail++] = seedI;
    visitado[seedI] = 1;

    while (head < tail) {
      const idx = fila[head++];
      const x = idx % W,
        y = (idx / W) | 0;
      const pi = idx * 4;
      // cor dentro da tolerância?
      if (Math.abs(d[pi] - zr) < tol && Math.abs(d[pi + 1] - zg) < tol && Math.abs(d[pi + 2] - zb) < tol) {
        mpx[pi + 3] = 255;
        // vizinhos (4-conexo)
        if (x > 0) {
          const n = idx - 1;
          if (!visitado[n]) {
            visitado[n] = 1;
            fila[tail++] = n;
          }
        }
        if (x < W - 1) {
          const n = idx + 1;
          if (!visitado[n]) {
            visitado[n] = 1;
            fila[tail++] = n;
          }
        }
        if (y > 0) {
          const n = idx - W;
          if (!visitado[n]) {
            visitado[n] = 1;
            fila[tail++] = n;
          }
        }
        if (y < H - 1) {
          const n = idx + W;
          if (!visitado[n]) {
            visitado[n] = 1;
            fila[tail++] = n;
          }
        }
      }
    }

    // Refinamento opcional com arquivo de máscara
    const arquivoMascara = zona.mascara && this.env.mascaras && this.env.mascaras[zona.mascara];
    if (arquivoMascara) {
      const t = document.createElement('canvas');
      t.width = this.W;
      t.height = this.H;
      const tc = t.getContext('2d', { willReadFrequently: true });
      tc.drawImage(arquivoMascara, 0, 0, this.W, this.H);
      const fd = tc.getImageData(0, 0, this.W, this.H).data;
      // Se a máscara é exclusiva da zona (1 arquivo por zona, ex. mask_127_63_191.png),
      // ela é autoritativa: cobre ilhas desconexas que o flood fill de semente única
      // não alcança (caso 127,63,191 com 383k vs 282k). Se compartilhada (ex. cozinha),
      // mantém comportamento de refinamento por intersecção.
      const isPerZona = this.env.cfg.zonas.filter(z => z.mascara === zona.mascara).length === 1;
      if (isPerZona) {
        // Autoritativo: máscara define por completo a zona (suporta múltiplas ilhas)
        for (let p = 0; p < mpx.length; p += 4) {
          const alpha = fd[p + 3];
          const lum = fd[p] * 0.299 + fd[p + 1] * 0.587 + fd[p + 2] * 0.114;
          const maskWhite = alpha > 127 && lum > 100;
          mpx[p + 3] = maskWhite ? 255 : 0;
        }
      } else {
        for (let p = 0; p < mpx.length; p += 4) {
          const lum = fd[p] * 0.299 + fd[p + 1] * 0.587 + fd[p + 2] * 0.114;
          // se o arquivo diz "fora" (escuro), remove; senão mantém
          if (lum <= 100) mpx[p + 3] = 0;
        }
      }
    }

    mc.putImageData(md, 0, 0);
    this._mascaras.set(zona.id, mask);
    // BBox + luminância de referência (mediana da base na zona) p/ relight.
    this._bboxZona(zona.id, mask);
    return mask;
  }

  // BBox da máscara (p/ recortar layers) e REF = mediana da luminância
  // da BASE dentro da zona. Como a marcenaria da base é clara/neutra,
  // essa mediana representa o "branco iluminado" local; o relight usa
  // fator = L_base / REF, que vale ~1 no difuso e cai nas sombras.
  // Também computa o CENTROIDE (p/ posicionar o hotspot pulsante).
  _bboxZona(zonaId, mask) {
    if (!this._bbox) this._bbox = new Map();
    if (!this._refs) this._refs = new Map();
    if (!this._centroides) this._centroides = new Map();
    if (this._bbox.has(zonaId)) return this._bbox.get(zonaId);
    if (!this._luz) this._prepararLuz();
    const mc = mask.getContext('2d');
    const md = mc.getImageData(0, 0, this.W, this.H).data;
    let minX = this.W,
      minY = this.H,
      maxX = 0,
      maxY = 0;
    let sumX = 0,
      sumY = 0,
      count = 0;
    const vals = [];
    // amostragem da mediana (1 a cada 4 px p/ não travar no primeiro load)
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        if (md[(y * this.W + x) * 4 + 3] > 127) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          sumX += x;
          sumY += y;
          count++;
          if (((x + y) & 3) === 0) vals.push(this._luz[y * this.W + x]);
        }
      }
    }
    vals.sort((a, b) => a - b);
    this._refs.set(zonaId, vals.length ? vals[Math.floor(vals.length / 2)] : 200);
    const bb = count
      ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
      : { x: 0, y: 0, w: 0, h: 0 };
    this._bbox.set(zonaId, bb);
    this._centroides.set(
      zonaId,
      count
        ? { x: Math.round(sumX / count), y: Math.round(sumY / count) }
        : { x: Math.round(bb.x + bb.w / 2 || this.W / 2), y: Math.round(bb.y + bb.h / 2 || this.H / 2) }
    );
    return bb;
  }

  // Posição do hotspot em % (0-100) relativa à cena — usada pelo overlay DOM.
  hotspotDe(zonaId) {
    const zona = this.env.cfg.zonas.find(z => z.id === zonaId);
    if (!zona) return null;
    this._gerarMascara(zona);
    const c = this._centroides.get(zonaId);
    if (!c) return null;
    return { x: (c.x / this.W) * 100, y: (c.y / this.H) * 100, px: c.x, py: c.y };
  }

  // REF efetiva da zona p/ relight: a mediana computada, exceto quando
  // a base na zona é escura (ex. porta de vidro fumê — mediana < 60):
  // aí usa o fallback global (mediana das zonas claras), para a textura
  // nova não sair estourada nem apagada.
  _refEfetivo(zonaId) {
    const raw = this._refs ? this._refs.get(zonaId) : null;
    if (raw != null && raw >= 60) return Math.max(1, raw);
    if (!this._refs) this._refs = new Map();
    if (this._refFallback == null) {
      for (const z of this.env.cfg.zonas) {
        if (!this._refs.has(z.id)) this._bboxZona(z.id, this._gerarMascara(z));
      }
      const claras = [...this._refs.values()].filter(v => v >= 60).sort((a, b) => a - b);
      this._refFallback = claras.length ? claras[Math.floor(claras.length / 2)] : 200;
    }
    return Math.max(1, this._refFallback);
  }

  // Mapa de luminância da base (0-255 por pixel), capturado uma vez.
  _prepararLuz() {
    const t = document.createElement('canvas');
    t.width = this.W;
    t.height = this.H;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.drawImage(this.env.base, 0, 0, this.W, this.H);
    const d = c.getImageData(0, 0, this.W, this.H).data;
    const luz = new Float32Array(this.W * this.H);
    for (let i = 0; i < luz.length; i++) {
      luz[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    }
    this._luz = luz;
  }

  // ---- Imagem original da textura (o tiling é feito por createPattern) ----
  _getTexture(texId) {
    if (this._texCache.has(texId)) return this._texCache.get(texId);
    const cat = this._cat; // setado pelo main
    const item = cat && cat[texId];
    if (!item || !item._img) return null;
    this._texCache.set(texId, item._img);
    return item._img;
  }

  // Passo por zona do novo pipeline: textura em tiling RE-ILUMINADA
  // com a luz da base (fator grayscale L/REF por pixel, só dentro da
  // máscara) e recortada pela máscara individual via 'destination-in'.
  // OTIMIZADO: processa APENAS a bbox da zona (ex. 300x300 em vez de
  // 1920x1080) — ~20x mais rápido, elimina o congelamento após várias
  // trocas. O matiz da textura é preservado; só a intensidade acompanha
  // o sol/sombra que já existe na base.
  // - Peças frontais: tiling planar; `zona.escala` reduz o tile.
  // - Peças em ângulo: `zona.quad` deforma em perspectiva antes do recorte.
  _aplicarTexturaEm(c, zona, texId) {
    const imgTextura = this._getTexture(texId);
    if (!imgTextura || !imgTextura.width) return;
    const imgMascara = this._gerarMascara(zona);
    if (!imgMascara) return;
    const W = this.W,
      H = this.H;
    // Escala base (slider) — permite ajuste fino do veio
    const escalaUsuario = (this.escalas && this.escalas[zona.id]) || 1;
    const escalaZona = zona.escala || 1;

    if (!this._refs || !this._refs.has(zona.id)) this._bboxZona(zona.id, imgMascara);
    const bb = this._bbox.get(zona.id);
    if (!bb || bb.w <= 0 || bb.h <= 0) return;
    // margem p/ anti-alias da borda da máscara
    const pad = 2;
    const bx = Math.max(0, bb.x - pad),
      by = Math.max(0, bb.y - pad);
    const bw = Math.min(W - bx, bb.w + pad * 2),
      bh = Math.min(H - by, bb.h + pad * 2);
    if (bw <= 0 || bh <= 0) return;

    const layer = document.createElement('canvas');
    layer.width = bw;
    layer.height = bh;
    const lCtx = layer.getContext('2d', { willReadFrequently: true });

    if (zona.quad) {
      const tile = document.createElement('canvas');
      const sc = imgTextura.width > 0 ? Math.min(imgTextura.width, 512) : 512;
      tile.width = sc;
      tile.height = sc;
      const tc = tile.getContext('2d', { willReadFrequently: true });
      tc.fillStyle = tc.createPattern(imgTextura, 'repeat');
      tc.fillRect(0, 0, tile.width, tile.height);
      lCtx.save();
      lCtx.translate(-bx, -by);
      this._desenharQuad(lCtx, tile, zona.quad, tile.width, tile.height);
      lCtx.restore();
    } else {
      // Mapeamento RealWorldScale: chapa 1850x2750 ↔ bbox, textura tile 4064x4064.
      // Ex: chapa 2750mm = lado longo da bbox, 1850mm = lado curto, 1 tile = 4064mm.
      // Escala = (bbox / chapa) * (tile / img)
      // Sem chapa/textura definidos, tiling 1:1 legado.
      let escala = escalaUsuario * escalaZona;
      const chapa = zona.chapa || this.env.cfg.chapa || null;
      const rep = zona.texturaRepeticao || this.env.cfg.texturaRepeticao || null;
      const chapaW = chapa?.w || chapa?.width || null;
      const chapaH = chapa?.h || chapa?.height || null;
      if (chapaW && chapaH && rep && (imgTextura.naturalWidth || imgTextura.width)) {
        const imgW = imgTextura.naturalWidth || imgTextura.width;
        const imgH = imgTextura.naturalHeight || imgTextura.height;
        // Lado longo da bbox ↔ 2750, lado curto ↔ 1850 (orientação automática)
        const bboxLongo = Math.max(bb.w, bb.h);
        void Math.min(bb.w, bb.h);
        const chapaLongo = Math.max(chapaW, chapaH);
        void Math.min(chapaW, chapaH);
        // Usa o lado longo para derivar escala (preserva aspecto, tiling isotrópico)
        // 1px textura = rep/img px em mm → escala para que rep mm = bboxLongo/chapaLongo px
        const escalaFisica = ((bboxLongo / chapaLongo) * rep) / Math.max(imgW, imgH);
        // Alternativa por altura se quiser: bboxCurto/chapaCurto deve dar mesmo valor (chapa 1850/2750 = 0.672, bbox deve bater)
        escala *= escalaFisica;
      } else if (zona.alturaChapa || this.env.cfg.chapaAltura) {
        const h = imgTextura.naturalHeight || imgTextura.height;
        if (h) escala *= bb.h / h;
      }
      lCtx.save();
      lCtx.scale(escala, escala);
      lCtx.translate(-bx / escala, -by / escala);
      lCtx.fillStyle = lCtx.createPattern(imgTextura, 'repeat');
      lCtx.fillRect(bx / escala, by / escala, bw / escala + 1, bh / escala + 1);
      lCtx.restore();
    }

    // RELIGHT só dentro da bbox (grayscale — não tinge a madeira).
    if (!this._luz) this._prepararLuz();
    const REF = this._refEfetivo(zona.id);
    const mctx = imgMascara.getContext('2d');
    const mdata = mctx.getImageData(bx, by, bw, bh).data;
    const ldata = lCtx.getImageData(0, 0, bw, bh);
    const px = ldata.data;
    const baseOff = by * W + bx;
    for (let j = 0; j < bh; j++) {
      const rowLuz = baseOff + j * W;
      for (let i = 0; i < bw; i++) {
        if (mdata[(j * bw + i) * 4 + 3] > 127) {
          let f = this._luz[rowLuz + i] / REF;
          if (f < 0.25) f = 0.25;
          else if (f > 1.25) f = 1.25;
          const o = (j * bw + i) * 4;
          px[o] *= f;
          px[o + 1] *= f;
          px[o + 2] *= f;
        } else {
          px[(j * bw + i) * 4 + 3] = 0;
        }
      }
    }
    lCtx.putImageData(ldata, 0, 0);

    // Recorta o padrão para ficar APENAS dentro da peça.
    lCtx.globalCompositeOperation = 'destination-in';
    lCtx.drawImage(imgMascara, bx, by, bw, bh, 0, 0, bw, bh);

    // Carimba a textura recortada no canvas principal.
    c.globalCompositeOperation = 'source-over';
    c.drawImage(layer, bx, by);
  }

  // Desenha um passe (sombras/reflexos) recortado pela máscara da zona
  // (layer do tamanho da bbox) com o blend indicado. Fora da zona,
  // nada é tocado — a base final permanece intacta.
  _aplicarPasseEm(c, zona, img, blend) {
    if (!img) return;
    const imgMascara = this._gerarMascara(zona);
    if (!imgMascara) return;
    if (!this._bbox) this._bbox = new Map();
    if (!this._bbox.has(zona.id)) this._bboxZona(zona.id, imgMascara);
    const bb = this._bbox.get(zona.id);
    if (!bb || bb.w <= 0 || bb.h <= 0) return;

    const layer = document.createElement('canvas');
    layer.width = bb.w;
    layer.height = bb.h;
    const lCtx = layer.getContext('2d', { willReadFrequently: true });
    lCtx.drawImage(img, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
    lCtx.globalCompositeOperation = 'destination-in';
    lCtx.drawImage(imgMascara, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);

    c.globalCompositeOperation = blend;
    c.drawImage(layer, bb.x, bb.y);
    c.globalCompositeOperation = 'source-over';
  }

  // Desenha a textura mapeada no quadrilátero [x0,y0,x1,y1,x2,y2,x3,y3]
  // (sentido horário a partir do sup-esq) aproximando perspectiva com subdivisão.
  _desenharQuad(lc, tex, quad, bw, bh) {
    const [p0, p1, p2, p3] = quad; // sup-esq, sup-dir, inf-dir, inf-esq
    const N = 40; // subdivisões por lado (maior N = melhor perspectiva)
    // interpolação bilinear no quadrilátero (perspectiva aproximada)
    const L = (u, v) => ({
      x: (1 - u) * (1 - v) * p0[0] + u * (1 - v) * p1[0] + u * v * p2[0] + (1 - u) * v * p3[0],
      y: (1 - u) * (1 - v) * p0[1] + u * (1 - v) * p1[1] + u * v * p2[1] + (1 - u) * v * p3[1],
    });
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const u0 = i / N,
          u1 = (i + 1) / N;
        const v0 = j / N,
          v1 = (j + 1) / N;
        const a = L(u0, v0),
          b2 = L(u1, v0),
          c2 = L(u1, v1),
          d2 = L(u0, v1);
        lc.save();
        lc.beginPath();
        lc.moveTo(a.x, a.y);
        lc.lineTo(b2.x, b2.y);
        lc.lineTo(c2.x, c2.y);
        lc.lineTo(d2.x, d2.y);
        lc.closePath();
        lc.clip();
        // fonte: recorte correspondente na textura
        const sx = u0 * bw,
          sy = v0 * bh,
          sw = (u1 - u0) * bw,
          sh = (v1 - v0) * bh;
        lc.drawImage(tex, sx, sy, sw, sh, a.x, a.y, b2.x - a.x, d2.y - a.y);
        lc.restore();
      }
    }
  }

  // ---- Render completo no novo pipeline ----
  // Base final intacta; textura + passes SÓ dentro das zonas.
  // Com fila anti-travamento: se uma troca chegar no meio de outra,
  // agenda apenas UM re-render ao final (nunca empilha N renders).
  renderizar() {
    if (this._rendering) {
      this._renderPendente = true;
      return;
    }
    this._rendering = true;
    this._capturarFrameAntigo();
    try {
      this.renderizarAmbiente(this._bctx, this.env.cfg, this.texturas, {
        base: this.env.base,
        sombras: this.env.sombras,
        reflexos: this.env.reflexos,
      });
      // copia p/ o canvas visível (sem destaque — hotspots são DOM)
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.drawImage(this._back, 0, 0);
      this._crossfade();
    } finally {
      this._rendering = false;
      if (this._renderPendente) {
        this._renderPendente = false;
        this.renderizar();
      }
    }
  }

  // Guarda uma cópia do frame atual ANTES de re-renderizar (base p/ crossfade).
  _capturarFrameAntigo() {
    if (!this._fadeAntigo) this._fadeAntigo = null;
    if (this.canvas && this.canvas.width) {
      try {
        const snap = document.createElement('canvas');
        snap.width = this.W;
        snap.height = this.H;
        snap.getContext('2d').drawImage(this.canvas, 0, 0, this.W, this.H);
        this._fadeAntigo = snap;
      } catch (_) {
        this._fadeAntigo = null;
      }
    }
  }

  // Crossfade premium: overlay com o frame antigo em cima do novo,
  // anima 1 -> 0 revelando a textura nova suavemente (~300ms).
  // Funciona em todas as cenas; respeita prefers-reduced-motion.
  _crossfade() {
    const antigo = this._fadeAntigo;
    this._fadeAntigo = null;
    if (!antigo || !this.canvas || !this.canvas.parentElement) return;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (_) {}
    const overlay = document.createElement('canvas');
    overlay.width = this.W;
    overlay.height = this.H;
    overlay.className = 'cena-fade';
    overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;';
    overlay.getContext('2d').drawImage(antigo, 0, 0, this.W, this.H);
    this.canvas.parentElement.appendChild(overlay);
    // força reflow + anima opacidade do frame antigo até revelar o novo
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 300ms var(--ease-out, ease)';
      overlay.style.opacity = '0';
    });
    setTimeout(() => overlay.remove(), 380);
  }

  // Troca UMA textura com garantia de imagem carregada (via diffuse
  // otimizado). Falha transitória retorna false SEM envenenar: o próximo
  // toque tenta carregar de novo (sem precisar de refresh).
  async setTextura(zonaId, texId) {
    const item = this._cat && this._cat[texId];
    if (item && !item._img) {
      try {
        const { carregarImagemTextura } = await import('./loader.js');
        const img = await carregarImagemTextura(item);
        this._texCache.set(texId, img);
      } catch (_) {
        return false;
      }
    }
    if (item && !item._img && !this._texCache.has(texId)) return false;
    this.texturas[zonaId] = texId;
    try {
      this.renderZona(zonaId);
    } catch (_) {
      // Failsafe: se algo no canvas falhar no meio, volta ao render
      // completo em vez de deixar a tela "meio morta".
      this.renderizar();
    }
    return true;
  }

  // Troca GLOBAL (hotspot master): aplica a mesma textura em TODAS as
  // peças de uma vez, com garantia de imagem carregada. Falha retorna
  // false sem alterar nada (a troca é atômica: só commita se a imagem
  // carregou).
  async setTexturaTodas(texId) {
    const item = this._cat && this._cat[texId];
    if (item && !item._img) {
      try {
        const { carregarImagemTextura } = await import('./loader.js');
        const img = await carregarImagemTextura(item);
        this._texCache.set(texId, img);
      } catch (_) {
        return false;
      }
    }
    if (item && !item._img && !this._texCache.has(texId)) return false;
    for (const z of this.env.cfg.zonas) this.texturas[z.id] = texId;
    try {
      this.renderizar();
    } catch (_) {
      return false;
    }
    return true;
  }

  // Render INCREMENTAL (troca premium): re-desenha SÓ a bbox da zona
  // alterada sobre o buffer (_back) e espelha o mesmo recorte no canvas
  // visível. Custo constante por troca (~1/11 do render completo) e sem
  // acúmulo de trabalho — por isso as trocas não degradam com o uso.
  // Seguro porque as máscaras das zonas são disjuntas: o recorte contém
  // só a própria zona + base não-editável.
  renderZona(zonaId) {
    const zona = this.env.cfg.zonas.find(z => z.id === zonaId);
    if (!zona) {
      this.renderizar();
      return;
    }
    const texId = this.texturas[zonaId];
    if (!texId || !this._getTexture(texId)) return;
    this._capturarFrameAntigo();
    const imgMascara = this._gerarMascara(zona);
    const bb = this._bbox.get(zonaId);
    if (!bb || bb.w <= 0 || bb.h <= 0) return;
    const pad = 2;
    const bx = Math.max(0, bb.x - pad),
      by = Math.max(0, bb.y - pad);
    const bw = Math.min(this.W - bx, bb.w + pad * 2);
    const bh = Math.min(this.H - by, bb.h + pad * 2);
    if (bw <= 0 || bh <= 0) return;

    // Compõe base + textura + passes SÓ desta zona num layer local.
    // O contexto traduzido faz as coordenadas absolutas caírem no lugar
    // certo do recorte (vale p/ textura e p/ os passes).
    const layer = document.createElement('canvas');
    layer.width = bw;
    layer.height = bh;
    const l = layer.getContext('2d', { willReadFrequently: true });
    l.drawImage(this.env.base, bx, by, bw, bh, 0, 0, bw, bh);
    l.save();
    l.translate(-bx, -by);
    this._aplicarZonaEm(l, zona, texId, {
      base: this.env.base,
      sombras: this.env.sombras,
      reflexos: this.env.reflexos,
    });
    l.restore();
    // Recorta pela máscara (binária): nunca invade a zona vizinha.
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(imgMascara, bx, by, bw, bh, 0, 0, bw, bh);
    l.globalCompositeOperation = 'source-over';

    // No buffer: apaga o conteúdo antigo SÓ onde a máscara cobre e
    // carimba o novo (o vizinho dentro do recorte fica intacto).
    const b = this._bctx;
    b.globalCompositeOperation = 'destination-out';
    b.drawImage(imgMascara, bx, by, bw, bh, bx, by, bw, bh);
    b.globalCompositeOperation = 'source-over';
    b.drawImage(layer, bx, by);

    // Espelha o recorte no visível (fora da máscara é idêntico nos dois).
    const v = this.ctx;
    v.globalCompositeOperation = 'source-over';
    v.clearRect(bx, by, bw, bh);
    v.drawImage(this._back, bx, by, bw, bh, bx, by, bw, bh);
    this._crossfade();
  }

  // Aplica textura + passes de UMA zona num contexto (recortado p/ bbox).
  _aplicarZonaEm(ctx, zona, idTextura, imagensCarregadas) {
    this._aplicarTexturaEm(ctx, zona, idTextura);
    this._aplicarPasseEm(ctx, zona, imagensCarregadas.sombras, 'multiply');
    this._aplicarPasseEm(ctx, zona, imagensCarregadas.reflexos, 'screen');
  }

  // Pipeline "base final + relight por zona". `imagensCarregadas` usa as
  // chaves { base, sombras, reflexos }; texturas e máscaras vêm do
  // compositor. NENHUM blend em tela cheia: fora das zonas, o pixel da
  // base é copiado 1:1 (parede, piso, eletros e luz intactos).
  renderizarAmbiente(ctx, ambiente, selecoes, imagensCarregadas) {
    const width = ambiente.width ?? this.W;
    const height = ambiente.height ?? this.H;
    const zonas = ambiente.zonas ?? [];
    const W = this.W,
      H = this.H;

    // 1. BASE FINAL (render 89.jpg): vai direto, sem blend.
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(imagensCarregadas.base, 0, 0, W, H);

    // 2. TEXTURAS + PASSES, uma zona por vez, recortados pela máscara.
    for (const zona of zonas) {
      const idTextura =
        (selecoes && selecoes[zona.id]) ?? (ambiente.padraoZona && ambiente.padraoZona[zona.id]);
      if (!idTextura) continue;
      if (!this._getTexture(idTextura)) continue;
      this._aplicarZonaEm(ctx, zona, idTextura, imagensCarregadas);
      void width;
      void height; // dimensões da cena
    }

    // Restaura o modo normal
    ctx.globalCompositeOperation = 'source-over';
  }

  // LEGADO: o destaque azul em canvas foi substituído pelos hotspots
  // pulsantes (overlay DOM). Mantido como no-op p/ compatibilidade —
  // a seleção agora é 100% visual via hotspot ativo.
  aplicarDestaque(_zona) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.drawImage(this._back, 0, 0);
  }

  // Remove o destaque, restaurando a cena renderizada
  limparDestaque() {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.drawImage(this._back, 0, 0);
  }

  // Comparar antes/depois: mostra a base ORIGINAL (sem texturas) ou
  // restaura a cena texturizada a partir do buffer (_back).
  verOriginal(mostrar) {
    const v = this.ctx;
    v.globalCompositeOperation = 'source-over';
    v.clearRect(0, 0, this.W, this.H);
    v.drawImage(mostrar ? this.env.base : this._back, 0, 0);
  }

  // Vincula o catálogo de texturas (com _img carregado) ao compositor
  setCatalogo(cat) {
    this._cat = cat;
  }

  // Exporta a cena atual em PNG com marca d'água: logo branca + nome da
  // textura no canto inferior direito (como pedido).
  exportarPNG({ logo, texturaNome } = {}) {
    const W = this.W,
      H = this.H;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const c = out.getContext('2d');
    c.drawImage(this.canvas, 0, 0, W, H);

    const margem = Math.round(W * 0.018); // ~35px em 1920
    const largLogo = Math.round(W * 0.15); // ~288px
    const altLogo = largLogo * (104.567 / 354.312); // proporção da logo

    c.save();
    // Sombra leve atrás da marca p/ legibilidade sobre fundos claros.
    c.shadowColor = 'rgba(0,0,0,.55)';
    c.shadowBlur = Math.max(6, Math.round(H * 0.012));
    c.shadowOffsetY = 3;

    let yBase = H - margem;
    if (texturaNome) {
      const fontPx = Math.max(18, Math.round(H * 0.026)); // ~28px em 1080
      c.font = `700 ${fontPx}px Roboto, Arial, sans-serif`;
      c.fillStyle = '#ffffff';
      c.textAlign = 'right';
      c.textBaseline = 'alphabetic';
      c.fillText(texturaNome, W - margem, yBase);
      yBase = yBase - fontPx - Math.round(H * 0.014);
    }

    if (logo && logo.width) {
      c.drawImage(logo, W - largLogo - margem, yBase - altLogo, largLogo, altLogo);
    }
    c.restore();
    return out.toDataURL('image/png');
  }
}
