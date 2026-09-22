// Hash versionado da composição — testável isoladamente
export const HASH_VERSION = 'v1';

export function lerHashComposicao(hash = typeof location !== 'undefined' ? location.hash : '') {
  const m = (hash || '').match(/#c=([^&]*)/);
  if (!m) return null;
  let texto;
  try {
    texto = decodeURIComponent(m[1]);
  } catch (_) {
    texto = m[1];
  }
  if (!texto) return null;
  let payload = texto;
  if (payload.startsWith('v1;')) payload = payload.slice(3);
  else if (/^v\d+;/.test(payload)) return null;
  const mapa = {};
  for (const par of payload.split(';')) {
    if (!par) continue;
    const i = par.indexOf(':');
    if (i > 0) mapa[par.slice(0, i)] = par.slice(i + 1);
  }
  return Object.keys(mapa).length ? mapa : null;
}

export function textoHashComposicao(comp) {
  const body = Object.entries(comp.texturas)
    .map(([z, t]) => {
      const e = comp.escalas[z];
      const esc = e && Math.abs(e - 1) > 0.001 ? `@${(+e).toFixed(2)}` : '';
      return `${z}:${t}${esc}`;
    })
    .join(';');
  return `v1;${body}`;
}

export function aplicarHashComposicao(comp, cat, hash) {
  const mapa = lerHashComposicao(
    hash !== undefined ? hash : typeof location !== 'undefined' ? location.hash : ''
  );
  if (!mapa) return false;
  const zonas = new Set(comp.env.cfg.zonas.map(z => z.id));
  let aplicada = false;
  for (const [zid, bruto] of Object.entries(mapa)) {
    if (!zonas.has(zid)) continue;
    const [tex, esc] = String(bruto).split('@');
    if (!cat[tex]) continue;
    comp.texturas[zid] = tex;
    const e = parseFloat(esc);
    if (Number.isFinite(e) && e >= 0.5 && e <= 2) comp.escalas[zid] = Math.round(e * 100) / 100;
    aplicada = true;
  }
  return aplicada;
}
