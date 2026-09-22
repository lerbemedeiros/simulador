// ============================================================
// MAIN: orquestra loader, compositor, interação e UI premium.
// Correções profissionais:
// - Texturas carregadas via diffuse WEBP em lotes (não 60 JPGs full).
// - Render bbox-only + fila anti-travamento (compositor).
// - Hotspots pulsantes no lugar do highlight azul.
// - Drawer recolhe ao aplicar; hamburger/hotspot reabre.
// ============================================================
import {
  AMBIENTES,
  BASE_URL,
  AMBIENTES_DISPONIVEIS,
  AMBIENTE_ATUAL,
  resolverAmbienteAtual,
} from './config.js';
import { carregarAmbiente, carregarCatalogo, ensureTextura, preloadTexturas, loadImage } from './loader.js';
import { diagPush } from './diag.js';
import { Compositor } from './compositor.js';
import { Interaction, ZONA_TODAS } from './interaction.js';
import { UI } from './ui.js';
import { iniciarTour } from './tour.js';
import { lerHashComposicao, textoHashComposicao, aplicarHashComposicao, HASH_VERSION } from './hash.js';

const IS_DEV =
  typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

// PWA: registra o Service Worker (instalável + cache). Falha silenciosa
// fora de contexto seguro (ex. file://) ou sem suporte.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const AMB_ID = resolverAmbienteAtual();
// Expõe para diagnóstico e para o seletor de ambientes
if (typeof window !== 'undefined') window.__ambId = AMB_ID;

let _pctAlvo = 0;
let _pctAtual = 0;
let _pctRaf = null;
function _aplicarHouse(pct) {
  const bar = document.querySelector('#loadBar');
  const fill = document.querySelector('#houseFillRect');
  const wave = document.querySelector('#houseWaveGroup');
  const pctEl = document.querySelector('#housePercent');
  const sub = document.querySelector('#loadSub');
  const v = Math.max(0, Math.min(1, pct));
  const pctInt = Math.round(v * 100);
  if (bar) bar.style.width = `${pctInt}%`;
  if (fill) {
    const h = 110 * v;
    const y = 110 - h;
    fill.setAttribute('y', String(y));
    fill.setAttribute('height', String(h));
  }
  if (wave) {
    const y = 110 - 110 * v;
    wave.style.setProperty('--wave-y', `${y}px`);
    // fallback transform for browsers without CSS var in animation
    wave.setAttribute('transform', `translate(0,${y})`);
  }
  if (pctEl) {
    pctEl.textContent = `${pctInt}%`;
    pctEl.classList.toggle('pct-dark', v < 0.32);
    // pulso suave a cada 10%
    if (pctInt % 10 === 0 && pctInt !== 0) {
      pctEl.classList.remove('pulse');
      void pctEl.offsetWidth;
      pctEl.classList.add('pulse');
    }
  }
  // esconde bolhas quando quase vazio
  const bubbles = document.querySelectorAll('.bubble');
  bubbles.forEach(b => {
    b.style.opacity = v > 0.08 ? '' : '0';
  });
  if (sub && v >= 0.75 && v < 1) sub.textContent = 'Quase lá — finalizando…';
  // Planta baixa — linhas brancas preenchendo de dourado sequencialmente
  const segs = [
    { id: 'wallOuterGold', s: 0, e: 0.38 },
    { id: 'wallV1Gold', s: 0.38, e: 0.54 },
    { id: 'wallV2Gold', s: 0.54, e: 0.68 },
    { id: 'wallH1Gold', s: 0.68, e: 0.8 },
    { id: 'wallH2Gold', s: 0.8, e: 0.92 },
    { id: 'doorA1Gold', s: 0.88, e: 0.96 },
    { id: 'doorA2Gold', s: 0.94, e: 1.0 },
  ];
  let hasPlant = false;
  segs.forEach(({ id, s, e }) => {
    const el = document.getElementById(id);
    if (!el) return;
    hasPlant = true;
    // init dash len
    if (!el.dataset.lenInit) {
      try {
        const len = el.getTotalLength ? el.getTotalLength() : id === 'wallOuterGold' ? 282 : 26;
        el.style.setProperty('--len', String(len));
        el.style.strokeDasharray = String(len);
        el.style.strokeDashoffset = String(len);
        el.dataset.lenInit = '1';
      } catch (_) {}
    }
    const len = parseFloat(getComputedStyle(el).getPropertyValue('--len')) || 260;
    const segPct = Math.max(0, Math.min(1, (v - s) / (e - s)));
    el.style.strokeDashoffset = String(len * (1 - segPct));
    el.style.opacity = segPct > 0 ? '1' : '0';
  });
  if (hasPlant) {
    const fg = document.getElementById('furnGold');
    if (fg) fg.style.opacity = v > 0.86 ? String(Math.min(1, (v - 0.86) / 0.14)) : '0';
    const pctDark = document.querySelector('.house-percent.pct-dark');
    // planta tem fundo branco central, manter branco no início, dourado ao final
    if (pctEl) pctEl.classList.toggle('pct-dark', v < 0.28);
  }
}
function progresso(msg, pct, subMsg) {
  const txt = document.querySelector('#loadMsg');
  const sub = document.querySelector('#loadSub');
  if (txt && msg) txt.textContent = msg;
  if (sub && subMsg) sub.textContent = subMsg;
  if (pct == null) return;
  _pctAlvo = Math.max(0, Math.min(1, pct));
  if (_pctRaf) return;
  const tick = () => {
    // interpolação suave 0.12 — elegante sem travar
    _pctAtual += (_pctAlvo - _pctAtual) * 0.18;
    if (Math.abs(_pctAlvo - _pctAtual) < 0.003) {
      _pctAtual = _pctAlvo;
      _aplicarHouse(_pctAtual);
      _pctRaf = null;
      return;
    }
    _aplicarHouse(_pctAtual);
    _pctRaf = requestAnimationFrame(tick);
  };
  _pctRaf = requestAnimationFrame(tick);
}
// API pública p/ preloader de atividades (qualquer módulo pode usar)
if (typeof window !== 'undefined') window.__houseProgresso = progresso;

// Sugestões prontas: combinações curadas aplicadas com 1 toque.
const PRESETS = [
  {
    nome: 'Contraste Preto',
    icone: '◨',
    mapa: {
      sup_painel: 'Freijo_Nativo_Grann',
      sup_portas: 'Freijo_Nativo_Grann',
      sup_centro: 'Freijo_Nativo_Grann',
      col_estreita: 'Freijo_Nativo_Grann',
      gaveta_1: 'Freijo_Nativo_Grann',
      gaveta_2: 'Freijo_Nativo_Grann',
      gaveta_3: 'Freijo_Nativo_Grann',
      gaveta_4: 'Freijo_Nativo_Grann',
      inf_faixa: 'Preto_TX',
      inf_centro: 'Preto_TX',
      inf_dir: 'Preto_TX',
    },
  },
  {
    nome: 'Branco e Nogal',
    icone: '◩',
    mapa: {
      sup_painel: 'Branco_Micro',
      sup_portas: 'Branco_Micro',
      sup_centro: 'Branco_Micro',
      col_estreita: 'Branco_Micro',
      gaveta_1: 'Branco_Micro',
      gaveta_2: 'Branco_Micro',
      gaveta_3: 'Branco_Micro',
      gaveta_4: 'Branco_Micro',
      inf_faixa: 'Branco_Micro',
      inf_centro: 'Nogal-Artezzano_Grann',
      inf_dir: 'Nogal-Artezzano_Grann',
    },
  },
  {
    nome: 'Toque Azul',
    icone: '◧',
    mapa: {
      sup_painel: 'Branco_Micro',
      sup_portas: 'Branco_Micro',
      sup_centro: 'Azul_TX',
      col_estreita: 'Branco_Micro',
      gaveta_1: 'Branco_Micro',
      gaveta_2: 'Azul_TX',
      gaveta_3: 'Branco_Micro',
      gaveta_4: 'Branco_Micro',
      inf_faixa: 'Preto_TX',
      inf_centro: 'Branco_Micro',
      inf_dir: 'Branco_Micro',
    },
  },
];

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

async function init() {
  diagPush({ ev: 'init', hw: navigator.hardwareConcurrency || null, ram: navigator.deviceMemory || null });
  window.addEventListener('error', e =>
    diagPush({ ev: 'js-error', msg: String((e && e.message) || 'erro').slice(0, 200) })
  );
  window.addEventListener('unhandledrejection', e =>
    diagPush({
      ev: 'promise-error',
      msg: String((e && e.reason && e.reason.message) || e.reason || 'rejeição').slice(0, 200),
    })
  );
  // Batimento a cada 5s: se parar, a thread principal morreu ali.
  setInterval(() => diagPush({ ev: 'beat' }), 5000);
  progresso('Catálogo de texturas…', 0.08, 'Lendo acabamentos disponíveis');
  const cat = await carregarCatalogo();

  // 2. Ambiente + camadas (base/id_map) primeiro p/ mostrar a cena rápido
  progresso('Carregando ambiente…', 0.22, 'Baixando renders e máscaras');
  const env = await carregarAmbiente(AMB_ID);
  const nomeAmbiente = document.querySelector('#brandAmbiente');
  if (nomeAmbiente && env.cfg.nome) nomeAmbiente.textContent = env.cfg.nome;
  const comp = new Compositor(env);
  comp.setCatalogo(cat);
  if (IS_DEV) {
    window.__comp = comp;
    window.__ambiente = env.cfg;
  }
  // Composição vinda de link compartilhado — antes do primeiro paint.
  const veioDeLink = aplicarHashComposicao(comp, cat);

  // 3. UI premium (drawer + hamburger)
  const ui = new UI({
    onPickTexture: async texId => {
      if (!ui.zonaSelecionada) return false;
      const foto = tirarFoto();
      // Hotspot master: aplica a mesma textura em TODAS as peças de uma vez.
      const ok =
        ui.zonaSelecionada.id === ZONA_TODAS.id
          ? await comp.setTexturaTodas(texId)
          : await comp.setTextura(ui.zonaSelecionada.id, texId);
      if (ok) {
        empilharHistorico(foto);
        try {
          interaction.atualizarResumo(ui.zonaSelecionada.id);
          sincronizarHash();
          atualizarSelo();
        } catch (err) {
          // A troca já foi aplicada e registrada: falha aqui é só de
          // sincronização visual (nunca pode virar "Falha" nem duplicar).
          console.error('[simulador] falha pós-apply:', err);
        }
      }
      return ok;
    },
  });
  const painel = document.querySelector('#painel');
  ui.montar(painel, env.cfg.zonas);
  if (IS_DEV) window.__ui = ui;
  ui.onSelectZona = zona => {
    interaction.selecionar(zona);
    ui.setAberto(true);
  };

  // Hamburger
  const burger = document.querySelector('#hamburger');
  burger.addEventListener('click', () => ui.alternar());
  burger.addEventListener('pointermove', e => {
    const r = burger.getBoundingClientRect();
    burger.style.setProperty('--mx', `${e.clientX - r.left}px`);
    burger.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  // Logo branca p/ a marca d'água do download (carregada uma vez).
  const logoBranco = await loadImage(`${BASE_URL}images/logo-branco.svg`).catch(() => null);

  // Download da cena em PNG com marca d'água (logo + nome da textura da zona selecionada).
  const btnDownload = document.querySelector('#dockBaixar');
  if (btnDownload)
    btnDownload.addEventListener('click', () => {
      const nome = nomeTexturaSelecionada();
      try {
        const dataUrl = comp.exportarPNG({ logo: logoBranco, texturaNome: nome });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = nomeArquivoImagem();
        document.body.appendChild(a);
        a.click();
        a.remove();
        ui.toast(nome ? `Imagem baixada: ${nome}` : 'Imagem baixada', 'ok');
      } catch (_) {
        ui.toast('Falha ao baixar imagem', 'erro');
      }
    });

  // ---- Rótulo do hotspot ----
  // Textura da seleção atual: majoritária no master, senão a da peça.
  function texturaZonaSel() {
    const z = ui.zonaSelecionada;
    if (!z) return undefined;
    return z.id === ZONA_TODAS.id ? texturaMajoritaria() : comp.texturas[z.id];
  }
  // Textura mais usada nas peças (rótulo do hotspot master).
  function texturaMajoritaria() {
    const votos = new Map();
    for (const z of env.cfg.zonas) {
      const t = comp.texturas[z.id];
      if (!t) continue;
      votos.set(t, (votos.get(t) || 0) + 1);
    }
    let melhor = null,
      max = 0;
    for (const [t, n] of votos) {
      if (n > max) {
        max = n;
        melhor = t;
      }
    }
    return melhor;
  }
  function atualizarRotuloMaster() {
    const t = texturaMajoritaria();
    const item = t && cat[t];
    interaction.definirRotuloMaster(
      t ? ui.nomeDaTextura(t) || t : '—',
      item ? item.acabamento || item.categoria || '' : ''
    );
  }
  // Quarto: rótulos individuais por zona (cada hotspot mostra sua textura)
  function atualizarRotulosPorZona() {
    const mapa = {};
    for (const z of env.cfg.zonas) {
      const texId = comp.texturas[z.id];
      const item = texId && cat[texId];
      mapa[z.id] = {
        nome: texId ? ui.nomeDaTextura(texId) || texId : '—',
        linha: item ? item.acabamento || item.categoria || '' : '',
      };
    }
    interaction.definirRotulosPorZona(mapa);
  }
  function atualizarSelo() {
    const porZona = env.cfg.id === 'quarto' && env.cfg.zonas.length >= 2;
    if (porZona) atualizarRotulosPorZona();
    else atualizarRotuloMaster();
  }

  // ---- URL sempre reflete a composição (base do link compartilhável) ----
  function sincronizarHash() {
    try {
      const base = textoHashComposicao(comp);
      const envPart = AMB_ID !== 'cozinha' ? `&env=${AMB_ID}` : '';
      const novo = `#c=${encodeURIComponent(base)}${envPart}`;
      // Preserva / adiciona env sem quebrar composição
      history.replaceState(null, '', novo);
    } catch (_) {}
  }

  function contarPersonalizadas() {
    return env.cfg.zonas.filter(z => {
      const esc = comp.escalas[z.id] || 1;
      return comp.texturas[z.id] !== env.cfg.padraoZona[z.id] || Math.abs(esc - 1) > 0.001;
    }).length;
  }

  // ---- Ficha técnica (impressão) ----
  function imprimirFicha() {
    const thumb = comp.exportarPNG({ logo: logoBranco, texturaNome: nomeTexturaSelecionada() });
    const linhas = env.cfg.zonas
      .map(z => {
        const texId = comp.texturas[z.id];
        const t = cat[texId];
        const nome = escapeHtml(ui.nomeDaTextura(texId) || 'Original');
        const acab = escapeHtml((t && t.acabamento) || '—');
        const esc = comp.escalas[z.id];
        const veio = esc && Math.abs(esc - 1) > 0.001 ? ` · veio ${Number(esc).toFixed(2)}×` : '';
        return `<tr><td>${escapeHtml(z.label)}</td><td>${nome}${veio}</td><td>${acab}</td></tr>`;
      })
      .join('');
    document.querySelector('#ficha').innerHTML = `
      <img class="ficha-logo" src="assets/images/logo.svg" alt="">
      <h1 class="ficha-titulo">Ficha técnica — ${escapeHtml(env.cfg.nome)} (${contarPersonalizadas()} de ${env.cfg.zonas.length} peças personalizadas)</h1>
      <p class="ficha-data">Gerada em ${new Date().toLocaleString('pt-BR')}</p>
      <img class="ficha-cena" src="${thumb}" alt="Composição">
      <table class="ficha-tab"><thead><tr><th>Peça</th><th>Textura</th><th>Acabamento</th></tr></thead><tbody>${linhas}</tbody></table>
      <p class="ficha-rodape">Simulador de Ambientes — imagem ilustrativa da composição.</p>`;
    window.print();
  }
  const btnDockImprimir = document.querySelector('#dockImprimir');
  if (btnDockImprimir) btnDockImprimir.addEventListener('click', imprimirFicha);

  // ---- Histórico p/ Desfazer (fotos de texturas + escalas) ----
  const historico = [];
  const MAX_HISTORICO = 50;
  function tirarFoto() {
    return { texturas: { ...comp.texturas }, escalas: { ...comp.escalas } };
  }
  function empilharHistorico(foto) {
    historico.push(foto);
    if (historico.length > MAX_HISTORICO) historico.shift();
    atualizarDockUndo();
  }
  function atualizarDockUndo() {
    const el = document.querySelector('#dockDesfazer') || document.querySelector('#dockUndo');
    if (el) {
      const vazio = historico.length === 0;
      el.classList.toggle('off', vazio);
      el.disabled = vazio;
      el.setAttribute('aria-disabled', String(vazio));
    }
  }
  async function garantirTexturas() {
    const ids = [...new Set(Object.values(comp.texturas).filter(Boolean))];
    await Promise.all(ids.map(id => ensureTextura(cat, id)));
  }
  function sincronizarAposMudanca() {
    sincronizarHash();
    atualizarSelo();
    if (ui.zonaSelecionada) {
      ui.setZona(ui.zonaSelecionada, texturaZonaSel());
    }
  }
  async function desfazer() {
    const foto = historico.pop();
    atualizarDockUndo();
    if (!foto) {
      ui.toast('Nada para desfazer', 'info');
      return;
    }
    comp.texturas = { ...foto.texturas };
    comp.escalas = { ...foto.escalas };
    await garantirTexturas();
    comp.renderizar();
    sincronizarAposMudanca();
    ui.toast('Alteração desfeita', 'ok');
  }

  // ---- Reset por peça / geral ----
  async function resetarZona(zid) {
    const padrao = env.cfg.padraoZona[zid];
    if (!padrao) return;
    const foto = tirarFoto();
    comp.texturas[zid] = padrao;
    delete comp.escalas[zid];
    await ensureTextura(cat, padrao);
    try {
      comp.renderZona(zid);
    } catch (_) {
      comp.renderizar();
    }
    empilharHistorico(foto);
    sincronizarAposMudanca();
    ui.toast('Peça restaurada ao padrão');
  }
  async function restaurarTudo() {
    const foto = tirarFoto();
    await garantirTexturasPadrao();
    comp.texturas = { ...env.cfg.padraoZona };
    comp.escalas = {};
    comp.renderizar();
    empilharHistorico(foto);
    sincronizarAposMudanca();
    ui.toast('Texturas padrão restauradas');
  }
  async function garantirTexturasPadrao() {
    const ids = [...new Set(Object.values(env.cfg.padraoZona).filter(Boolean))];
    await Promise.all(ids.map(id => ensureTextura(cat, id)));
  }
  const dockReset = document.querySelector('#dockReset');
  if (dockReset) dockReset.addEventListener('click', restaurarTudo);

  // ---- Desfazer: Ctrl+Z + botão do dock ----
  const dockDesfazer = document.querySelector('#dockDesfazer');
  // compat: #dockUndo legado
  const dockUndo = dockDesfazer || document.querySelector('#dockUndo');
  if (dockUndo) dockUndo.addEventListener('click', desfazer);
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.shiftKey || e.key.toLowerCase() !== 'z') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    desfazer();
  });
  atualizarDockUndo();

  // ---- Compartilhar: imagem direto no WhatsApp; senão link; senão copia ----
  function nomeTexturaSelecionada() {
    return ui.nomeDaTextura(texturaZonaSel());
  }
  function nomeArquivoImagem() {
    const nome = nomeTexturaSelecionada();
    return `simulador-ambiente${nome ? '-' + nome.replace(/\s+/g, '-') : ''}.png`;
  }
  async function compartilhar() {
    sincronizarHash();
    const url = `${location.href.split('#')[0]}#c=${encodeURIComponent(textoHashComposicao(comp))}`;
    // 1) Imagem com marca d'água direto no app de destino (WhatsApp etc.)
    try {
      const dataUrl = comp.exportarPNG({ logo: logoBranco, texturaNome: nomeTexturaSelecionada() });
      const blob = await (await fetch(dataUrl)).blob();
      const arquivo = new File([blob], nomeArquivoImagem(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: 'Simulador de Ambientes',
          text: `Minha composição: ${url}`,
        });
        ui.toast('Imagem enviada!', 'ok');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // usuário cancelou: silêncio
    }
    // 2) Link via menu de compartilhar do sistema
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Simulador de Ambientes', text: 'Veja minha composição:', url });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    // 3) Copia o link (área de transferência)
    const okMsg = 'Link copiado! Cole no WhatsApp';
    try {
      await navigator.clipboard.writeText(url);
      ui.toast(okMsg, 'info');
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        ui.toast(okMsg, 'info');
      } catch (_) {
        prompt('Copie o link da composição:', url);
      }
      ta.remove();
    }
  }
  const dockShareBtn = document.querySelector('#dockShare');
  if (dockShareBtn)
    dockShareBtn.addEventListener('click', () => {
      // Usa fluxo completo: Web Share com imagem > link > clipboard > WhatsApp fallback
      compartilhar().catch(() => {
        sincronizarHash();
        const url = `${location.href.split('#')[0]}#c=${encodeURIComponent(textoHashComposicao(comp))}`;
        const mensagem = encodeURIComponent(
          `Olha essa composição de texturas que montei no Simulador de Ambientes:\n\n${url}`
        );
        window.open(`https://api.whatsapp.com/send?text=${mensagem}`, '_blank');
      });
    });

  // ---- Tela cheia ----
  const dockFull = document.querySelector('#dockFull');
  const dockFullTxt = dockFull.querySelector('.dock-txt');
  function atualizarDockFullTxt(on) {
    if (dockFullTxt) dockFullTxt.textContent = on ? 'Sair' : 'Ampliar';
  }
  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) {
      const foco = document.body.classList.toggle('modo-foco');
      dockFull.classList.toggle('ativo', foco);
      atualizarDockFullTxt(foco);
      if (foco) ui.setAberto(false);
    }
  }
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    document.body.classList.toggle('tela-cheia', on);
    dockFull.classList.toggle('ativo', on);
    atualizarDockFullTxt(on);
    if (on) ui.setAberto(false);
  });
  dockFull.addEventListener('click', alternarTelaCheia);

  // ---- Ajuda: reabre o tour ----
  document.querySelector('#dockAjuda').addEventListener('click', () => {
    iniciarTour(ui, { forcar: true }).catch(() => {});
  });

  // ---- Seletor de ambientes (Mudar ambiente) ----
  const envModal = document.querySelector('#envModal');
  const envCardRow = document.querySelector('#envCardRow');
  function fecharSeletorAmbientes() {
    if (envModal) {
      envModal.classList.remove('aberto');
      envModal.setAttribute('aria-hidden', 'true');
    }
  }
  function abrirSeletorAmbientes() {
    if (!envModal) return;
    envModal.classList.add('aberto');
    envModal.setAttribute('aria-hidden', 'false');
  }
  // Troca para um ambiente (fonte única AMBIENTES).
  function trocarPara(envId) {
    const e = AMBIENTES[envId] || AMBIENTES_DISPONIVEIS[envId];
    if (!e) return;
    if (e.indisponivel) {
      ui.toast(`${e.nome} — em breve`, 'info');
      return;
    }
    if (e.projeto) {
      location.href = e.projeto;
      return;
    }
    // Mesmo projeto: se for outro ambiente com camadas, recarrega via hash
    // Usa hash puro (sem pathname) para funcionar tanto em vite (/public/index.html) quanto em serve (/)
    if (envId !== AMB_ID && AMBIENTES[envId]?.camadas) {
      const base = location.href.split('#')[0];
      const novo = `${base}#env=${envId}`;
      // Força SW a buscar config fresca na próxima carga
      if ('caches' in window) {
        // limpa cache da versão antiga em background (não bloqueia navegação)
        caches
          .keys()
          .then(keys =>
            keys.forEach(k => {
              if (k !== 'simulador-v8') caches.delete(k);
            })
          )
          .catch(() => {});
      }
      location.href = novo;
      // reload com delay para garantir hash gravado; bypass de cache via timestamp
      setTimeout(() => {
        // force-reload que invalida http cache
        location.reload();
      }, 80);
    } else {
      ui.toast(`Ambiente ${e.nome} carregado`, 'ok');
    }
  }
  if (envCardRow) {
    const ambientes = Object.values(AMBIENTES_DISPONIVEIS);
    const envDots = document.querySelector('#envDots');
    const envCount = document.querySelector('#envCount');
    if (envCount)
      envCount.textContent = `${ambientes.length} ${ambientes.length === 1 ? 'ambiente' : 'ambientes'}`;
    envCardRow.innerHTML = ambientes
      .map(
        e => `
      <button class="env-card ${e.id === AMB_ID ? 'ativo' : ''}" data-env="${e.id}" role="option" aria-selected="${e.id === AMB_ID}" type="button">
        <img class="env-img" src="${e.imagem}" alt="${e.nome}" loading="lazy" decoding="async">
        <span class="env-nome"><i class="fa-solid ${e.icone}" aria-hidden="true"></i> ${e.nome}</span>
        <span class="env-check" aria-hidden="true"><i class="fa-solid fa-check"></i> Selecionado</span>
      </button>`
      )
      .join('');
    if (envDots) {
      envDots.innerHTML = ambientes
        .map(
          (_, i) =>
            `<button class="dot${i === 0 ? ' ativo' : ''}" data-i="${i}" type="button" aria-label="Ir para ambiente ${i + 1}"></button>`
        )
        .join('');
    }
    const cards = [...envCardRow.querySelectorAll('.env-card')];
    const dots = envDots ? [...envDots.querySelectorAll('.dot')] : [];
    function atualizarDots() {
      if (!cards.length) return;
      const alvo = Math.round(envCardRow.scrollLeft / (cards[0].offsetWidth + 18));
      const idx = Math.max(0, Math.min(cards.length - 1, alvo));
      dots.forEach((d, i) => d.classList.toggle('ativo', i === idx));
    }
    function rolarPara(idx) {
      const el = cards[idx];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    envCardRow.addEventListener('scroll', atualizarDots, { passive: true });
    window.addEventListener('resize', atualizarDots);
    dots.forEach((d, i) => d.addEventListener('click', () => rolarPara(i)));
    envCardRow.addEventListener('keydown', ev => {
      const base = Math.max(
        0,
        cards.findIndex(c => c === document.activeElement)
      );
      if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        rolarPara(Math.min(cards.length - 1, base + 1));
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        rolarPara(Math.max(0, base - 1));
      } else if (ev.key === 'Home') {
        ev.preventDefault();
        rolarPara(0);
      } else if (ev.key === 'End') {
        ev.preventDefault();
        rolarPara(cards.length - 1);
      }
    });
    cards.forEach(card => {
      card.addEventListener('click', () => {
        fecharSeletorAmbientes();
        trocarPara(card.dataset.env);
      });
      const img = card.querySelector('.env-img');
      if (img) {
        if (img.complete) card.classList.add('carregado');
        else img.addEventListener('load', () => card.classList.add('carregado'), { once: true });
      }
    });
    if (
      window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      cards.forEach(card => {
        card.addEventListener('pointermove', ev => {
          const r = card.getBoundingClientRect();
          const px = (ev.clientX - r.left) / r.width - 0.5;
          const py = (ev.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-6px)`;
        });
        card.addEventListener('pointerleave', () => {
          card.style.transform = '';
        });
      });
    }
  }
  // dockAmbiente legado removido — selector agora via envBar (rodapé)
  const dockAmbiente = document.querySelector('#dockAmbiente');
  if (dockAmbiente)
    dockAmbiente.addEventListener('click', () => {
      ui.setAberto(false);
      abrirSeletorAmbientes();
    });
  document
    .querySelectorAll('[data-env-fechar]')
    .forEach(el => el.addEventListener('click', fecharSeletorAmbientes));
  if (envModal)
    envModal.addEventListener('click', e => {
      if (e.target === envModal) fecharSeletorAmbientes();
    });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && envModal && envModal.classList.contains('aberto')) fecharSeletorAmbientes();
  });

  // ---- Casinha de ambientes (rodapé central): abre o mesmo seletor premium ----
  const envBarBtn = document.querySelector('#envBarBtn');
  const envBarTxt = document.querySelector('#envBarTxt');
  const abrirAmbientesPeloRodape = () => abrirSeletorAmbientes();
  if (envBarBtn) envBarBtn.addEventListener('click', abrirAmbientesPeloRodape);
  if (envBarTxt) envBarTxt.addEventListener('click', abrirAmbientesPeloRodape);

  // 4. Interação + hotspots
  const interaction = new Interaction(comp, {
    onSelect: zona => {
      ui.setZona(zona, zona.id === ZONA_TODAS.id ? texturaMajoritaria() : comp.texturas[zona.id]);
      ui.setAberto(true); // clicar no hotspot reabre o menu
      atualizarSelo();
    },
  });

  // 5. Texturas padrão ANTES do primeiro paint: o modelo já abre
  // texturizado (antes o preload em 2º plano deixava as peças no
  // cinza da base até terminar). Só as distintas do padraoZona.
  progresso('Aplicando texturas…', 0.42, 'Preparando acabamentos premium');
  const padroes = [...new Set(Object.values(comp.texturas).filter(Boolean))];
  await Promise.all(padroes.map(id => ensureTextura(cat, id)));

  // 6. Primeira renderização (texturas padrão) + canvas na tela
  progresso('Compondo cena…', 0.68, 'Renderizando ambiente em alta');
  await new Promise(r => setTimeout(r, 40)); // deixa o loading pintar
  comp.renderizar();
  if (IS_DEV) {
    window.__beat = Date.now();
    setInterval(() => {
      window.__beat = Date.now();
    }, 1000);
  }
  const cenaBox = document.querySelector('#cenaBox');
  const cenaEl = document.querySelector('#cena');
  cenaEl.appendChild(comp.canvas);
  comp.canvas.className = 'cena-canvas';

  // Zona padrão: cozinha = GLOBAL (master); quarto = por zona (primeiro hotspot)
  const porZona = env.cfg.id === 'quarto' && env.cfg.zonas.length >= 2;
  if (porZona) {
    const primeira = env.cfg.zonas[0];
    ui.setZona(primeira, comp.texturas[primeira.id]);
  } else {
    ui.setZona(ZONA_TODAS, texturaMajoritaria());
  }

  // Hotspots após máscaras prontas (fora do caminho crítico).
  // Seleciona o hotspot padrão APÓS montarHotspots para garantir
  // que o botão já existe e recebe a classe "ativo" (seleção visual).
  // Quarto já tem zonaPadrao = primeira zona; cozinha = master.
  if (porZona) interaction.zonaPadrao = env.cfg.zonas[0];
  setTimeout(() => {
    interaction.montarHotspots(cenaBox, env.cfg.zonas);
    interaction.selecionarPadrao();
    // Atualiza rótulos após montar (centroides calculados)
    atualizarSelo();
  }, 50);
  if (veioDeLink) {
    sincronizarHash();
    ui.toast('Composição compartilhada carregada', 'info');
  }

  progresso('Ambiente pronto!', 1, 'Personalize do seu jeito ✦');
  await new Promise(r => setTimeout(r, 520));
  document.querySelector('#preloader')?.classList.add('done');
  document.querySelector('#preloader')?.setAttribute('aria-busy', 'false');
  document.querySelector('#loading')?.classList.add('done');
  document.querySelector('#app').style.display = 'flex';
  requestAnimationFrame(() => document.body.classList.add('pronto'));
  if (IS_DEV) window.__initDone = true;

  // Tour guiado no primeiro acesso (só abre sozinho uma vez).
  setTimeout(() => {
    iniciarTour(ui).catch(() => {});
  }, 1500);

  // 7. Preload das texturas em segundo plano (prioriza majoritária + idle).
  const idle = window.requestIdleCallback || (cb => setTimeout(() => cb({ timeRemaining: () => 16 }), 300));
  idle(() => {
    const majoritaria = texturaMajoritaria();
    const priorizadas = majoritaria ? [majoritaria] : [];
    preloadTexturas(cat, {
      priorizadas,
      onProgress: (done, total) => {
        const el = document.querySelector('#preloadTag');
        if (el) el.textContent = done >= total ? 'Texturas prontas' : `Texturas ${done}/${total}`;
      },
    })
      .then(() => {
        comp.renderizar();
        if (ui.zonaSelecionada) ui.setZona(ui.zonaSelecionada, comp.texturas[ui.zonaSelecionada.id]);
        if (IS_DEV) window.__preloadDone = true;
      })
      .catch(() => {});
  });
}

init().catch(err => {
  const l = document.querySelector('#preloader') || document.querySelector('#loading');
  if (l) {
    l.classList.add('erro');
    const msg = l.querySelector('#loadMsg') || document.querySelector('#loadMsg');
    const sub = l.querySelector('#loadSub') || document.querySelector('#loadSub');
    if (msg) msg.textContent = `Erro: ${err.message}`;
    if (sub) sub.textContent = 'Recarregue a página para tentar novamente';
    const pct = l.querySelector('#housePercent');
    if (pct) pct.textContent = '!';
  }
  console.error(err);
});
