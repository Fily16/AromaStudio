import { CartItem, PromoCartItem } from '../models/api.models';

/**
 * Perfumes que la tienda ya no vende. Cuando un pedido (o su edición) trae alguno, el backend
 * responde 400 {message, unavailableProductIds}. El mensaje ya viene listo para el cliente (nombra
 * los perfumes, nunca dice «NSO»); estas funciones PURAS deciden qué se quita del carrito o del
 * pedido y cambian su «Retíralo de tu pedido» por lo que falta hacer, porque se quita solo.
 */

/** Ids no disponibles de un error HTTP ([] si el error es otro o no trae la lista). */
export function unavailableIdsFrom(err: unknown): number[] {
  const list = (err as { error?: { unavailableProductIds?: unknown } } | null)?.error
    ?.unavailableProductIds;
  if (!Array.isArray(list)) return [];
  const out: number[] = [];
  for (const v of list) {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isFinite(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

export interface UnavailableCartSplit {
  keptItems: CartItem[];
  removedItems: CartItem[];
  keptPromos: PromoCartItem[];
  /** Packs que traen algún perfume no disponible (el backend los revisa por dentro). */
  removedPromos: PromoCartItem[];
}

/** Separa el carrito: líneas de perfumes no disponibles y packs que contienen alguno. */
export function splitUnavailableCart(
  items: CartItem[],
  promos: PromoCartItem[],
  unavailableIds: Iterable<number>,
): UnavailableCartSplit {
  const ids = new Set(unavailableIds);
  const keptItems: CartItem[] = [];
  const removedItems: CartItem[] = [];
  for (const it of items) (ids.has(it.product.id) ? removedItems : keptItems).push(it);
  const keptPromos: PromoCartItem[] = [];
  const removedPromos: PromoCartItem[] = [];
  for (const pl of promos) {
    const hit = (pl.promo.items ?? []).some((pi) => pi.productId != null && ids.has(pi.productId));
    (hit ? removedPromos : keptPromos).push(pl);
  }
  return { keptItems, removedItems, keptPromos, removedPromos };
}

/** Qué le falta hacer al cliente después de que la tienda quitó sola los perfumes no disponibles. */
export type AfterRemovalStep = 'confirm' | 'add' | 'empty' | 'save';

const NEXT_STEP_TEXT: Record<AfterRemovalStep, string> = {
  confirm: 'solo vuelve a pulsar «Confirmar pedido».',
  add: 'agrega otro perfume para completar tu pedido.',
  empty: 'elige otro perfume en el catálogo.',
  save: 'solo vuelve a guardar tu pedido.',
};

/** Quita la instrucción final «Retíralo(s) de tu pedido para continuar.» del mensaje del backend. */
export function withoutRemoveInstruction(message: string): string {
  return (message ?? '').replace(/\s*Ret[ií]ralos?\s+de\s+tu\s+pedido[^.]*\.?\s*$/i, '').trim();
}

/**
 * El mensaje del backend termina pidiendo «Retíralo de tu pedido para continuar», pero la tienda
 * YA lo quitó sola: se cambia esa instrucción (que ya no se puede cumplir) por lo que de verdad
 * falta hacer. Se conserva la parte que nombra los perfumes («X» ya no está disponible.).
 * Con `removedCount` 0 (no se quitó nada) devuelve el mensaje tal cual.
 */
export function removedItemsNotice(message: string, removedCount: number, next: AfterRemovalStep): string {
  const original = (message ?? '').trim();
  if (removedCount <= 0) return original;
  const base = withoutRemoveInstruction(original);
  const plural = removedCount > 1 || /\bRet[ií]ralos\b|no est[aá]n disponibles/i.test(original);
  const done = plural ? 'Ya los quitamos de tu pedido' : 'Ya lo quitamos de tu pedido';
  return `${base ? base + ' ' : ''}${done}: ${NEXT_STEP_TEXT[next]}`;
}

/** Línea del modal «Editar mi pedido» (misma forma que en el catálogo). */
export interface EditOrderLine {
  productId: number;
  quantity: number;
}

export interface UnavailableEditResult<T extends EditOrderLine> {
  items: T[];
  /** Perfumes agregados en esta edición que se quitaron. */
  removed: T[];
  /** Perfumes que ya estaban en el pedido: vuelven a la cantidad que tenían. */
  restored: T[];
}

/**
 * Edición de un pedido ya hecho: el backend permite MANTENER o BAJAR un perfume no disponible,
 * pero no subirlo ni agregarlo. Los agregados se quitan; los que ya estaban vuelven a su cantidad
 * original (así no se pierde lo que el cliente ya había separado).
 */
export function applyUnavailableToEdit<T extends EditOrderLine>(
  items: T[],
  originalQty: ReadonlyMap<number, number>,
  unavailableIds: Iterable<number>,
): UnavailableEditResult<T> {
  const ids = new Set(unavailableIds);
  const out: T[] = [];
  const removed: T[] = [];
  const restored: T[] = [];
  for (const it of items) {
    if (!ids.has(it.productId)) {
      out.push(it);
      continue;
    }
    const before = originalQty.get(it.productId);
    if (before == null || before <= 0) {
      removed.push(it);
    } else if (it.quantity > before) {
      const back = { ...it, quantity: before };
      restored.push(back);
      out.push(back);
    } else {
      out.push(it);
    }
  }
  return { items: out, removed, restored };
}

/**
 * Texto para «Editar mi pedido» después de applyUnavailableToEdit: el mensaje del backend sin su
 * «Retíralo de tu pedido» (ya se hizo solo) + qué pasó + qué falta hacer.
 */
export function editRemovalNotice<T extends EditOrderLine>(
  message: string,
  res: UnavailableEditResult<T>,
): string {
  if (!res.removed.length && !res.restored.length) return (message ?? '').trim();
  const parts = [withoutRemoveInstruction(message)];
  if (res.removed.length) {
    parts.push(res.removed.length > 1 ? 'Ya los quitamos de tu pedido.' : 'Ya lo quitamos de tu pedido.');
  }
  if (res.restored.length) parts.push('Dejamos la cantidad que ya tenías separada.');
  parts.push(
    res.items.length ? 'Solo vuelve a guardar tu pedido.' : 'Agrega otro perfume y vuelve a guardar tu pedido.',
  );
  return parts.filter(Boolean).join(' ');
}
