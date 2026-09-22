// ============================================================
// DIAG: caixa-preta em sessionStorage — sobrevive ao refresh.
// Após um congelamento: atualize a página, abra o console e rode
//   window.__diagVer()
// para ver a linha do tempo (trocas, erros, batimentos) até a morte.
// ============================================================
const KEY = 'simDiag_v1';
const MAX = 120;

export function diagPush(ev) {
  try {
    let arr;
    try {
      arr = JSON.parse(sessionStorage.getItem(KEY)) || [];
    } catch (_) {
      arr = [];
    }
    arr.push({ t: Date.now(), ...ev });
    while (arr.length > MAX) arr.shift();
    sessionStorage.setItem(KEY, JSON.stringify(arr));
  } catch (_) {
    /* storage cheio/bloqueado: ignora */
  }
}

export function diagVer() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch (_) {
    return null;
  }
}

if (typeof window !== 'undefined') window.__diagVer = diagVer;
