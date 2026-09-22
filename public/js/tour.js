// ============================================================
// TOUR: visita guiada no primeiro acesso (hotspot -> menu ->
// dock -> download). Marca "visto" no localStorage; o botão
// Ajuda do dock reabre à força. Leve e sem dependências.
// ============================================================

const ESPERA_DRAWER = 550; // tempo da transição do painel (css .5s)

function esperar(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function posicionar(tip, alvo) {
  const r = alvo.getBoundingClientRect();
  const tw = tip.offsetWidth,
    th = tip.offsetHeight;
  const vw = window.innerWidth,
    vh = window.innerHeight;
  // Prefere abaixo do alvo; se não couber, acima.
  let top = r.bottom + 12;
  if (top + th + 12 > vh) top = Math.max(12, r.top - th - 12);
  const left = Math.min(Math.max(12, r.left), Math.max(12, vw - tw - 12));
  tip.style.top = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}

export async function iniciarTour(ui, { forcar = false } = {}) {
  try {
    if (!forcar && localStorage.getItem('simTourVisto')) return;
  } catch (_) {
    if (!forcar) return;
  }
  if (document.querySelector('#tour')) return; // já rodando

  const passos = [
    {
      sel: '#painel',
      antes: async () => {
        ui.setAberto(true);
        await esperar(ESPERA_DRAWER);
      },
      titulo: 'Passo 1 de 3',
      texto:
        'Este menu abre sozinho no primeiro acesso. O ponto pulsante já está selecionado — escolha a textura aqui.',
    },
    {
      sel: '.hotspot-master',
      antes: async () => {
        ui.setAberto(false);
        await esperar(ESPERA_DRAWER);
      },
      titulo: 'Passo 2 de 3',
      texto:
        'O ponto pulsante e destacado é o marcador de seleção. Toque nele para trocar a textura de todas as peças de uma vez.',
    },
    {
      sel: '#dock',
      antes: async () => {},
      titulo: 'Passo 3 de 3',
      texto:
        'Aqui você baixa a imagem e compartilha a composição no WhatsApp. Para trocar de ambiente, use o botão central no rodapé.',
    },
  ];

  const raiz = document.createElement('div');
  raiz.id = 'tour';
  raiz.innerHTML = `
    <div class="tour-veu"></div>
    <div class="tour-tip" role="dialog" aria-modal="true" aria-label="Ajuda" tabindex="-1">
      <div class="tour-passo"></div>
      <p id="tourDesc"></p>
      <div class="tour-nav">
        <div class="tour-dots" aria-hidden="true"></div>
        <button class="tour-pular" type="button">Pular</button>
        <button class="tour-prox" type="button">Próximo</button>
      </div>
    </div>`;
  document.body.appendChild(raiz);
  const tip = raiz.querySelector('.tour-tip');
  const passoEl = raiz.querySelector('.tour-passo');
  const textoEl = raiz.querySelector('#tourDesc');
  const dotsEl = raiz.querySelector('.tour-dots');
  const proxBtn = raiz.querySelector('.tour-prox');
  const pularBtn = raiz.querySelector('.tour-pular');
  dotsEl.innerHTML = passos.map((_, i) => `<span data-i="${i}"></span>`).join('');

  let alvoAtual = null;
  let encerrado = false;
  const focoAnterior = document.activeElement;

  const encerrar = () => {
    if (encerrado) return;
    encerrado = true;
    try {
      localStorage.setItem('simTourVisto', '1');
    } catch (_) {}
    if (alvoAtual) alvoAtual.classList.remove('tour-alvo');
    raiz.remove();
    document.removeEventListener('keydown', noEsc);
    document.removeEventListener('keydown', trap);
    if (focoAnterior && focoAnterior.focus)
      try {
        focoAnterior.focus();
      } catch (_) {}
  };
  const noEsc = e => {
    if (e.key === 'Escape') encerrar();
  };
  // focus trap simples
  const trap = e => {
    if (e.key !== 'Tab' || encerrado) return;
    const focaveis = [
      ...tip.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])'),
    ].filter(el => !el.disabled);
    if (!focaveis.length) return;
    const first = focaveis[0],
      last = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', noEsc);
  document.addEventListener('keydown', trap);
  pularBtn.addEventListener('click', encerrar);
  // foca o botão principal
  setTimeout(() => proxBtn.focus(), 50);

  for (let i = 0; i < passos.length; i++) {
    const p = passos[i];
    await p.antes();
    if (encerrado) return;
    const alvo = document.querySelector(p.sel);
    if (!alvo) continue; // sem alvo visível: pula a etapa
    if (alvoAtual) alvoAtual.classList.remove('tour-alvo');
    alvoAtual = alvo;
    alvo.classList.add('tour-alvo');
    passoEl.textContent = p.titulo;
    textoEl.textContent = p.texto;
    dotsEl.querySelectorAll('span').forEach((d, j) => d.classList.toggle('on', j === i));
    proxBtn.textContent = i === passos.length - 1 ? 'Concluir' : 'Próximo';
    tip.style.visibility = 'hidden';
    tip.style.top = '0px';
    tip.style.left = '0px';
    await esperar(30); // deixa o navegador medir o balão
    posicionar(tip, alvo);
    tip.style.visibility = '';
    // acessibilidade: anuncia passo
    tip.setAttribute('aria-describedby', 'tourDesc');
    const avancar = await new Promise(res => {
      const ok = () => {
        proxBtn.removeEventListener('click', ok);
        res(true);
      };
      proxBtn.addEventListener('click', ok, { once: true });
      const pulou = () => {
        encerrar();
        res(false);
      };
      pularBtn.addEventListener('click', pulou, { once: true });
    });
    // devolve foco ao proxBtn a cada passo
    if (!encerrado) proxBtn.focus();
    if (!avancar || encerrado) return;
  }
  encerrar();
}
