import {
  MATCHED_BY_LABELS,
  NSO_STATUS_INFO,
  NSO_STATUS_ORDER,
  brandKeyOf,
  countOf,
  countryName,
  countryOfNsoCode,
  isOtherCanCountry,
  isPossiblyExpired,
  isValidNsoCode,
  matchedByLabel,
  normalizeNsoCode,
  nsoStatusInfo,
  splitHiddenByNso,
} from './nso-labels';

describe('nso-labels', () => {
  it('cada estado tiene etiqueta, color de chip y explicación', () => {
    const colors = new Set(['gray', 'blue', 'amber', 'green', 'red']);
    for (const s of NSO_STATUS_ORDER) {
      const info = NSO_STATUS_INFO[s];
      expect(info.status).toBe(s);
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.hint.length).toBeGreaterThan(0);
      expect(colors.has(info.color)).toBe(true);
    }
    expect(NSO_STATUS_ORDER.length).toBe(5);
  });

  it('textos acordados con la dueña', () => {
    expect(NSO_STATUS_INFO.CON_NSO.hint).toContain('Se muestran en tu tienda');
    expect(NSO_STATUS_INFO.EN_REVISION.label).toBe('Por revisar');
    expect(NSO_STATUS_INFO.MARCA_CON_NSO.label).toBe('La marca tiene NSO');
    expect(NSO_STATUS_INFO.SIN_NSO.color).toBe('red');
    expect(NSO_STATUS_INFO.SIN_VERIFICAR.color).toBe('gray');
  });

  it('estado desconocido o faltante = Sin verificar', () => {
    expect(nsoStatusInfo(null).status).toBe('SIN_VERIFICAR');
    expect(nsoStatusInfo(undefined).status).toBe('SIN_VERIFICAR');
    expect(nsoStatusInfo('LO_QUE_SEA').status).toBe('SIN_VERIFICAR');
    expect(nsoStatusInfo('CON_NSO').label).toBe('Con NSO');
  });

  it('cómo se reconoció, en palabras simples', () => {
    expect(matchedByLabel('UPC')).toBe('Por código de barras');
    expect(matchedByLabel('APROBADO')).toBe('Aprobado por ti');
    expect(matchedByLabel('NOMBRE')).toBe('Por nombre');
    expect(matchedByLabel('ALIAS_SKU')).toBe('Aprendido de una decisión anterior');
    expect(matchedByLabel('ALIAS_NOMBRE')).toBe('Aprendido de una decisión anterior');
    expect(matchedByLabel('MANUAL')).toBe('Asignado a mano');
    expect(matchedByLabel(null)).toBe('');
    expect(Object.keys(MATCHED_BY_LABELS).length).toBe(6);
  });

  it('valida y normaliza códigos NSO', () => {
    expect(isValidNsoCode('NSOC70523-25PE')).toBe(true);
    expect(isValidNsoCode('NSOC780229-25PE')).toBe(true); // 6 dígitos
    expect(isValidNsoCode('NSOC06935-11PE')).toBe(true); // cero a la izquierda
    expect(isValidNsoCode('NSOC7052-25PE')).toBe(false); // 4 dígitos
    expect(isValidNsoCode('NSOC70523-25US')).toBe(false); // país fuera de la CAN
    expect(isValidNsoCode('')).toBe(false);
    expect(normalizeNsoCode(' nsoc 70523-25 pe ')).toBe('NSOC70523-25PE');
    expect(normalizeNsoCode('70523-25co')).toBe('NSOC70523-25CO');
    expect(normalizeNsoCode('soc81196-26pe')).toBe('NSOC81196-26PE');
    expect(normalizeNsoCode('NSOC06935-11PE')).toBe('NSOC06935-11PE');
  });

  it('acepta lo mismo que el backend (NsoCode.canonicalize): guiones de PDF, prefijo incompleto', () => {
    // Guion largo / raya / signo menos copiados de un PDF o Excel de DIGEMID
    expect(normalizeNsoCode('NSOC81196–26PE')).toBe('NSOC81196-26PE'); // U+2013
    expect(normalizeNsoCode('NSOC81196—26PE')).toBe('NSOC81196-26PE'); // U+2014
    expect(normalizeNsoCode('NSOC81196−26PE')).toBe('NSOC81196-26PE'); // U+2212
    expect(isValidNsoCode('NSOC81196–26PE')).toBe(true);
    // Prefijo incompleto: NSO / SO / NSOC
    expect(normalizeNsoCode('NSO81196-26PE')).toBe('NSOC81196-26PE');
    expect(normalizeNsoCode('nso 70523 - 25 pe')).toBe('NSOC70523-25PE');
    expect(normalizeNsoCode('SO70523-25CO')).toBe('NSOC70523-25CO');
    // Espacio duro (U+00A0) pegado desde la web: se quita y se manda el código limpio
    expect(normalizeNsoCode('NSOC70523-25 PE')).toBe('NSOC70523-25PE');
    expect(isValidNsoCode(' NSOC70523-25PE')).toBe(true);
    // Lo que el backend rechaza, aquí también
    expect(isValidNsoCode('NSOC7052-25PE')).toBe(false);
    expect(isValidNsoCode('NSOCC70523-25PE')).toBe(false);
    expect(isValidNsoCode('XNSOC70523-25PE')).toBe(false);
    expect(isValidNsoCode('NSOC70523-2025PE')).toBe(false);
    // Nunca inventa dígitos: si no valida, devuelve el texto limpio
    expect(normalizeNsoCode(' nsoc 7052-25 pe ')).toBe('NSOC7052-25PE');
  });

  it('país y vigencia', () => {
    expect(countryName('PE')).toBe('Perú');
    expect(countryName('co')).toBe('Colombia');
    expect(countryName(null)).toBe('');
    expect(isOtherCanCountry('PE')).toBe(false);
    expect(isOtherCanCountry('BO')).toBe(true);
    expect(isOtherCanCountry(null)).toBe(false);
    expect(isPossiblyExpired(2018, 2026)).toBe(true);
    expect(isPossiblyExpired(2019, 2026)).toBe(false);
    expect(isPossiblyExpired(null, 2026)).toBe(false);
  });

  it('país sacado del código NSO', () => {
    expect(countryOfNsoCode('NSOC70523-25PE')).toBe('PE');
    expect(countryOfNsoCode('NSOC780229-24CO')).toBe('CO');
    expect(countryOfNsoCode(' nsoc 70523-25 ec ')).toBe('EC');
    expect(countryOfNsoCode('NSOC70523-25US')).toBeNull();
    expect(countryOfNsoCode('')).toBeNull();
    expect(countryOfNsoCode(null)).toBeNull();
  });

  it('clave de marca como el backend', () => {
    expect(brandKeyOf('Dolce & Gabbana')).toBe('dolce and gabbana');
    expect(brandKeyOf('  LANCÔME  ')).toBe('lancome');
    expect(brandKeyOf('Mont   Blanc')).toBe('mont blanc');
    expect(brandKeyOf(null)).toBe('');
  });

  it('selectores de compra: separa los ocultos por NSO y los cuenta', () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const hidden = new Set([2, 4]);
    const r = splitHiddenByNso(list, (id) => hidden.has(id));
    expect(r.visible.map((p) => p.id)).toEqual([1, 3]);
    expect(r.hiddenCount).toBe(2);
    // filtro apagado (isHidden siempre false): todo visible, 0 ocultos
    const off = splitHiddenByNso(list, () => false);
    expect(off.visible.length).toBe(4);
    expect(off.hiddenCount).toBe(0);
    expect(splitHiddenByNso([], () => true)).toEqual({ visible: [], hiddenCount: 0 });
  });

  it('conteo tolerante a lista o número', () => {
    expect(countOf(['a', 'b'])).toBe(2);
    expect(countOf(3)).toBe(3);
    expect(countOf(null)).toBe(0);
  });
});
