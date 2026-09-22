// ============================================================
// schema.js — validação e invariantes (sem dependência externa)
// ============================================================

/**
 * @typedef {{id:string,label:string,cor:[number,number,number],seed:[number,number],mascara:string,escala?:number,quad?:number[][],chapa?:{w:number,h:number},texturaRepeticao?:number,alturaChapa?:number}} Zona
 * @typedef {{id:string,nome:string,icone:string,imagem:string,width:number,height:number,chapa:{w:number,h:number},texturaRepeticao:number,camadas:{base:string,sombras:string,reflexos:string}|null,idMap:string|null,zonas:Zona[],padrao:string|null,padraoZona:Record<string,string>,indisponivel?:boolean}} Ambiente
 */

function assert(cond, msg) {
  if (!cond) throw new Error(`[config] ${msg}`);
}

function isNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}
function isString(s) {
  return typeof s === 'string' && s.length > 0;
}
function isRGB(c) {
  return Array.isArray(c) && c.length === 3 && c.every(v => Number.isInteger(v) && v >= 0 && v <= 255);
}
function isSeed(s) {
  return Array.isArray(s) && s.length === 2 && s.every(v => Number.isInteger(v) && v >= 0);
}

/**
 * Valida uma zona isoladamente
 * @param {Zona} z
 * @param {string} ambId
 */
export function validarZona(z, ambId) {
  assert(isString(z.id), `zona sem id em "${ambId}"`);
  assert(isString(z.label), `zona "${z.id}" sem label em "${ambId}"`);
  assert(
    isRGB(z.cor),
    `zona "${z.id}" cor deve ser [r,g,b] 0-255 em "${ambId}" — recebido ${JSON.stringify(z.cor)}`
  );
  assert(isSeed(z.seed), `zona "${z.id}" seed deve ser [x,y] int >=0 em "${ambId}"`);
  assert(isString(z.mascara), `zona "${z.id}" sem máscara em "${ambId}"`);
  if (z.escala !== undefined)
    assert(
      isNumber(z.escala) && z.escala > 0 && z.escala <= 5,
      `zona "${z.id}" escala deve ser 0-5 em "${ambId}"`
    );
  if (z.chapa) {
    assert(
      isNumber(z.chapa.w) && isNumber(z.chapa.h) && z.chapa.w > 0 && z.chapa.h > 0,
      `zona "${z.id}" chapa inválida em "${ambId}"`
    );
  }
  if (z.texturaRepeticao !== undefined)
    assert(
      isNumber(z.texturaRepeticao) && z.texturaRepeticao > 0,
      `zona "${z.id}" texturaRepeticao inválida`
    );
  if (z.quad) {
    assert(
      Array.isArray(z.quad) &&
        z.quad.length === 4 &&
        z.quad.every(p => Array.isArray(p) && p.length === 2 && p.every(isNumber)),
      `zona "${z.id}" quad deve ser [[x,y]x4]`
    );
  }
}

/**
 * Valida um ambiente completo
 * @param {Ambiente} amb
 */
export function validarAmbiente(amb) {
  assert(isString(amb.id), `ambiente sem id`);
  assert(isString(amb.nome), `ambiente "${amb.id}" sem nome`);
  assert(isString(amb.icone), `ambiente "${amb.id}" sem icone`);
  assert(isString(amb.imagem), `ambiente "${amb.id}" sem imagem`);
  assert(isNumber(amb.width) && amb.width > 0, `ambiente "${amb.id}" width inválido`);
  assert(isNumber(amb.height) && amb.height > 0, `ambiente "${amb.id}" height inválido`);
  assert(amb.chapa && isNumber(amb.chapa.w) && isNumber(amb.chapa.h), `ambiente "${amb.id}" chapa inválida`);
  assert(
    isNumber(amb.texturaRepeticao) && amb.texturaRepeticao > 0,
    `ambiente "${amb.id}" texturaRepeticao inválida`
  );

  if (amb.indisponivel) {
    // placeholders não precisam de camadas/zonas
    return;
  }
  assert(
    amb.camadas &&
      isString(amb.camadas.base) &&
      isString(amb.camadas.sombras) &&
      isString(amb.camadas.reflexos),
    `ambiente "${amb.id}" camadas incompletas`
  );
  assert(isString(amb.idMap), `ambiente "${amb.id}" sem idMap`);
  assert(Array.isArray(amb.zonas) && amb.zonas.length > 0, `ambiente "${amb.id}" deve ter ao menos 1 zona`);
  const ids = new Set();
  for (const z of amb.zonas) {
    validarZona(z, amb.id);
    assert(!ids.has(z.id), `ambiente "${amb.id}" zona duplicada "${z.id}"`);
    ids.add(z.id);
  }
  if (amb.padrao)
    assert(
      ids.has(amb.padrao) || amb.padrao === null,
      `ambiente "${amb.id}" padrao "${amb.padrao}" não existe nas zonas`
    );
  if (amb.padraoZona) {
    for (const [zid, tex] of Object.entries(amb.padraoZona)) {
      assert(ids.has(zid), `ambiente "${amb.id}" padraoZona zona "${zid}" não existe`);
      assert(isString(tex), `ambiente "${amb.id}" padraoZona[${zid}] deve ser string`);
    }
  }
}

/**
 * Valida todos os ambientes e congela
 * @param {Record<string, Ambiente>} ambientes
 */
export function validarTodos(ambientes) {
  assert(ambientes && typeof ambientes === 'object', 'AMBIENTES deve ser objeto');
  for (const amb of Object.values(ambientes)) {
    validarAmbiente(amb);
  }
}
