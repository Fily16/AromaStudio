import { MatchedBy, NsoStatus } from '../models/api.models';

/**
 * Textos y colores del sistema NSO para el panel admin. PURO (sin Angular): se usa
 * en cualquier pantalla y se testea con Vitest. La dueña NO es técnica: cada estado
 * trae una etiqueta corta, el color de chip `.adm-st` y una explicación de una línea.
 */

/** Color de chip del sistema admin (`.adm-st.gray|blue|amber|green|red`). */
export type NsoChipColor = 'gray' | 'blue' | 'amber' | 'green' | 'red';

export interface NsoStatusInfo {
  status: NsoStatus;
  /** Etiqueta corta para chips y pestañas. */
  label: string;
  color: NsoChipColor;
  /** Qué significa, en una línea y sin tecnicismos. */
  hint: string;
  /** Qué hacer con estos perfumes. */
  action: string;
}

export const NSO_STATUS_INFO: Record<NsoStatus, NsoStatusInfo> = {
  CON_NSO: {
    status: 'CON_NSO',
    label: 'Con NSO',
    color: 'green',
    hint: 'Se muestran en tu tienda.',
    action: 'Nada: ya están listos para vender e importar.',
  },
  EN_REVISION: {
    status: 'EN_REVISION',
    label: 'Por revisar',
    color: 'amber',
    hint: 'Encontramos un NSO parecido: confirma si es el mismo.',
    action: 'Entra y elige «Es este» o «Ninguno de estos».',
  },
  MARCA_CON_NSO: {
    status: 'MARCA_CON_NSO',
    label: 'La marca tiene NSO',
    color: 'blue',
    hint: 'Otro importador ya registró esta marca: puedes pedir acogerte.',
    action: 'Mira quién es el titular y copia su RUC para contactarlo.',
  },
  SIN_NSO: {
    status: 'SIN_NSO',
    label: 'Sin NSO',
    color: 'red',
    hint: 'No encontramos NSO de esta marca en tu lista.',
    action: 'Revisa si la marca está escrita distinto o asigna un código a mano.',
  },
  SIN_VERIFICAR: {
    status: 'SIN_VERIFICAR',
    label: 'Sin verificar',
    color: 'gray',
    hint: 'Todavía no se comparó con tu lista de NSO.',
    action: 'Pulsa «Volver a verificar todo».',
  },
};

/** Orden en que se muestran los estados (de "listo" a "falta hacer algo"). */
export const NSO_STATUS_ORDER: NsoStatus[] = [
  'CON_NSO',
  'EN_REVISION',
  'MARCA_CON_NSO',
  'SIN_NSO',
  'SIN_VERIFICAR',
];

/** Info de un estado; cualquier valor desconocido o vacío cuenta como «Sin verificar». */
export function nsoStatusInfo(status: string | null | undefined): NsoStatusInfo {
  return (status && NSO_STATUS_INFO[status as NsoStatus]) || NSO_STATUS_INFO.SIN_VERIFICAR;
}

export const MATCHED_BY_LABELS: Record<MatchedBy, string> = {
  UPC: 'Por código de barras',
  APROBADO: 'Aprobado por ti',
  NOMBRE: 'Por nombre',
  ALIAS_SKU: 'Aprendido de una decisión anterior',
  ALIAS_NOMBRE: 'Aprendido de una decisión anterior',
  MANUAL: 'Asignado a mano',
};

/** Cómo se reconoció el NSO, en palabras simples ('' si no aplica). */
export function matchedByLabel(matchedBy: string | null | undefined): string {
  return (matchedBy && MATCHED_BY_LABELS[matchedBy as MatchedBy]) || '';
}

// ---------------------------------------------------------------------------
// Códigos NSO
// ---------------------------------------------------------------------------

/** Formato oficial: NSOC + 5 o 6 dígitos + guion + año (2 dígitos) + país CAN. */
export const NSO_CODE_RE = /^NSOC\d{5,6}-\d{2}(PE|CO|BO|EC)$/;

/**
 * Forma tolerante, la MISMA que acepta el backend (NsoCode.canonicalize) tras limpiar:
 * prefijo opcional o incompleto (NSOC, NSO, SOC… o nada) + dígitos + guion + año + país.
 */
const NSO_CODE_TOLERANT_RE = /^(?:N?SOC?)?(\d{5,6})-(\d{2})(PE|CO|BO|EC)$/;

/**
 * Limpia lo que escribe (o pega) la usuaria igual que el backend: sin acentos, mayúsculas,
 * guiones largos de PDF/Excel (– — −) → "-", sin espacios (también el espacio duro) y
 * prefijo completado ("70523-25PE" / "NSO70523-25PE" → "NSOC70523-25PE"). No inventa
 * dígitos: los ceros a la izquierda se conservan. Si no es un código válido devuelve el
 * texto limpio (para que la validación falle y se vea qué se escribió).
 */
export function normalizeNsoCode(raw: string | null | undefined): string {
  const s = (raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, '');
  const m = NSO_CODE_TOLERANT_RE.exec(s);
  return m ? `NSOC${m[1]}-${m[2]}${m[3]}` : s;
}

export function isValidNsoCode(raw: string | null | undefined): boolean {
  return NSO_CODE_RE.test(normalizeNsoCode(raw));
}

const COUNTRY_NAMES: Record<string, string> = {
  PE: 'Perú',
  CO: 'Colombia',
  BO: 'Bolivia',
  EC: 'Ecuador',
};

export function countryName(country: string | null | undefined): string {
  if (!country) return '';
  return COUNTRY_NAMES[country.toUpperCase()] ?? country;
}

/** NSO emitido en otro país de la CAN (cuenta, pero se etiqueta). */
export function isOtherCanCountry(country: string | null | undefined): boolean {
  return !!country && country.toUpperCase() !== 'PE';
}

/** País de un código NSO: las 2 últimas letras ("NSOC70523-25CO" → "CO"); null si no es válido. */
export function countryOfNsoCode(code: string | null | undefined): string | null {
  const c = normalizeNsoCode(code);
  return NSO_CODE_RE.test(c) ? c.slice(-2) : null;
}

/** El NSO dura 7 años: pasado eso solo se AVISA "¿vigente?" (no se bloquea). */
export function isPossiblyExpired(
  nsoYear: number | null | undefined,
  currentYear = new Date().getFullYear(),
): boolean {
  return nsoYear != null && nsoYear + 7 < currentYear;
}

/**
 * Clave de marca aproximada a la del backend: sin acentos, minúsculas, & → and, espacios
 * colapsados. Sirve para agrupar marcas repetidas en pantalla; al backend se le puede
 * mandar la marca tal cual (POST brand-aliases la pliega con su propia función).
 */
export function brandKeyOf(brand: string | null | undefined): string {
  return (brand ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Selectores de compra (lanzar a stock, promociones): con el filtro NSO activo solo se ofrecen los
 * perfumes que se pueden volver a comprar; el resto se cuenta para avisar «N ocultos por no tener NSO».
 * `isHidden` es NsoStateService.isHidden (devuelve false con el filtro apagado).
 */
export function splitHiddenByNso<T extends { id: number }>(
  list: readonly T[],
  isHidden: (productId: number) => boolean,
): { visible: T[]; hiddenCount: number } {
  const visible: T[] = [];
  let hiddenCount = 0;
  for (const p of list) {
    if (isHidden(p.id)) hiddenCount++;
    else visible.push(p);
  }
  return { visible, hiddenCount };
}

/** Algunos campos del contrato pueden venir como lista o como conteo: devuelve el número. */
export function countOf(v: unknown[] | number | null | undefined): number {
  if (Array.isArray(v)) return v.length;
  return typeof v === 'number' ? v : 0;
}
