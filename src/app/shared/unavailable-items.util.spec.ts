import { CartItem, Product, PromoCartItem, Promotion } from '../models/api.models';
import {
  applyUnavailableToEdit,
  editRemovalNotice,
  removedItemsNotice,
  splitUnavailableCart,
  unavailableIdsFrom,
  withoutRemoveInstruction,
} from './unavailable-items.util';

function product(id: number): Product {
  return { id, brand: 'Marca', name: `Perfume ${id}` } as Product;
}

function line(id: number, quantity = 1): CartItem {
  return { product: product(id), quantity, unitPricePen: 100 };
}

function pack(id: number, productIds: (number | null)[]): PromoCartItem {
  const promo = {
    id,
    name: `Pack ${id}`,
    items: productIds.map((pid, i) => ({ productId: pid, name: `item ${i}`, imageUrl: null })),
  } as Promotion;
  return { promo, quantity: 1 };
}

describe('unavailableIdsFrom', () => {
  it('lee unavailableProductIds del cuerpo del 400', () => {
    const err = { status: 400, error: { message: '«A» ya no está disponible.', unavailableProductIds: [7, 9] } };
    expect(unavailableIdsFrom(err)).toEqual([7, 9]);
  });

  it('sin la lista (otro error) devuelve []', () => {
    expect(unavailableIdsFrom({ status: 400, error: { message: 'Consolidado cerrado' } })).toEqual([]);
    expect(unavailableIdsFrom({ status: 0, error: null })).toEqual([]);
    expect(unavailableIdsFrom(null)).toEqual([]);
    expect(unavailableIdsFrom(undefined)).toEqual([]);
    expect(unavailableIdsFrom({ error: { unavailableProductIds: 'x' } })).toEqual([]);
  });

  it('acepta ids como texto, descarta basura y repetidos', () => {
    const err = { error: { unavailableProductIds: ['3', 3, null, 'abc', 4] } };
    expect(unavailableIdsFrom(err)).toEqual([3, 4]);
  });
});

describe('splitUnavailableCart', () => {
  it('quita solo las líneas de perfumes no disponibles', () => {
    const r = splitUnavailableCart([line(1), line(2, 3), line(3)], [], [2]);
    expect(r.keptItems.map((i) => i.product.id)).toEqual([1, 3]);
    expect(r.removedItems.map((i) => i.product.id)).toEqual([2]);
    expect(r.removedPromos).toEqual([]);
  });

  it('quita los packs que traen un perfume no disponible (los exclusivos no cuentan)', () => {
    const promos = [pack(10, [1, null]), pack(11, [5]), pack(12, [null])];
    const r = splitUnavailableCart([line(1)], promos, [5]);
    expect(r.keptItems.length).toBe(1);
    expect(r.keptPromos.map((p) => p.promo.id)).toEqual([10, 12]);
    expect(r.removedPromos.map((p) => p.promo.id)).toEqual([11]);
  });

  it('sin ids no cambia nada', () => {
    const r = splitUnavailableCart([line(1)], [pack(10, [1])], []);
    expect(r.removedItems).toEqual([]);
    expect(r.removedPromos).toEqual([]);
    expect(r.keptItems.length).toBe(1);
    expect(r.keptPromos.length).toBe(1);
  });
});

describe('applyUnavailableToEdit', () => {
  const original = new Map<number, number>([
    [1, 2],
    [2, 1],
  ]);

  it('quita los perfumes agregados en la edición', () => {
    const items = [
      { productId: 1, quantity: 2 },
      { productId: 9, quantity: 1 },
    ];
    const r = applyUnavailableToEdit(items, original, [9]);
    expect(r.items).toEqual([{ productId: 1, quantity: 2 }]);
    expect(r.removed.map((i) => i.productId)).toEqual([9]);
    expect(r.restored).toEqual([]);
  });

  it('un perfume que ya estaba vuelve a su cantidad original (no se pierde lo separado)', () => {
    const items = [
      { productId: 1, quantity: 5, label: 'A' },
      { productId: 2, quantity: 1, label: 'B' },
    ];
    const r = applyUnavailableToEdit(items, original, [1]);
    expect(r.items).toEqual([
      { productId: 1, quantity: 2, label: 'A' },
      { productId: 2, quantity: 1, label: 'B' },
    ]);
    expect(r.restored.map((i) => i.productId)).toEqual([1]);
    expect(r.removed).toEqual([]);
    // no muta la lista original
    expect(items[0].quantity).toBe(5);
  });

  it('mantener o bajar un perfume no disponible se respeta tal cual', () => {
    const items = [{ productId: 1, quantity: 1 }];
    const r = applyUnavailableToEdit(items, original, [1]);
    expect(r.items).toEqual([{ productId: 1, quantity: 1 }]);
    expect(r.restored).toEqual([]);
    expect(r.removed).toEqual([]);
  });

  it('los perfumes disponibles no se tocan', () => {
    const items = [{ productId: 2, quantity: 4 }];
    const r = applyUnavailableToEdit(items, original, [1]);
    expect(r.items).toEqual(items);
  });
});

describe('aviso tras quitar perfumes solos (no pedir «Retíralo» de algo que ya no está)', () => {
  const ONE = '«Lattafa Yara» ya no está disponible. Retíralo de tu pedido para continuar.';
  const TWO = '«A» y «B» ya no están disponibles. Retíralos de tu pedido para continuar.';

  it('quita la instrucción final del backend y deja el nombre del perfume', () => {
    expect(withoutRemoveInstruction(ONE)).toBe('«Lattafa Yara» ya no está disponible.');
    expect(withoutRemoveInstruction(TWO)).toBe('«A» y «B» ya no están disponibles.');
    expect(withoutRemoveInstruction('Consolidado cerrado.')).toBe('Consolidado cerrado.');
  });

  it('carrito: dice que ya se quitó y qué falta hacer', () => {
    const confirmMsg = removedItemsNotice(ONE, 1, 'confirm');
    expect(confirmMsg).toBe(
      '«Lattafa Yara» ya no está disponible. Ya lo quitamos de tu pedido: solo vuelve a pulsar «Confirmar pedido».',
    );
    expect(confirmMsg).not.toContain('Retíralo');
    expect(removedItemsNotice(ONE, 1, 'add')).toContain('Ya lo quitamos de tu pedido: agrega otro perfume');
    expect(removedItemsNotice(ONE, 1, 'empty')).toContain('Ya lo quitamos de tu pedido: elige otro perfume');
  });

  it('plural si se quitaron varios (por conteo o por el mensaje)', () => {
    expect(removedItemsNotice(TWO, 2, 'confirm')).toBe(
      '«A» y «B» ya no están disponibles. Ya los quitamos de tu pedido: solo vuelve a pulsar «Confirmar pedido».',
    );
    expect(removedItemsNotice(TWO, 1, 'confirm')).toContain('Ya los quitamos');
  });

  it('si no se quitó nada, deja el mensaje tal cual', () => {
    expect(removedItemsNotice(ONE, 0, 'confirm')).toBe(ONE);
  });

  it('nunca menciona NSO', () => {
    for (const next of ['confirm', 'add', 'empty', 'save'] as const) {
      expect(/nso/i.test(removedItemsNotice(ONE, 1, next))).toBe(false);
    }
  });

  it('editar pedido: agregado quitado y cantidad devuelta', () => {
    const original = new Map<number, number>([[1, 2]]);
    const removed = applyUnavailableToEdit([{ productId: 1, quantity: 2 }, { productId: 9, quantity: 1 }], original, [9]);
    expect(editRemovalNotice(ONE, removed)).toBe(
      '«Lattafa Yara» ya no está disponible. Ya lo quitamos de tu pedido. Solo vuelve a guardar tu pedido.',
    );
    const restored = applyUnavailableToEdit([{ productId: 1, quantity: 5 }], original, [1]);
    expect(editRemovalNotice(ONE, restored)).toBe(
      '«Lattafa Yara» ya no está disponible. Dejamos la cantidad que ya tenías separada. Solo vuelve a guardar tu pedido.',
    );
    const emptied = applyUnavailableToEdit([{ productId: 9, quantity: 1 }], original, [9]);
    expect(editRemovalNotice(ONE, emptied)).toContain('Agrega otro perfume y vuelve a guardar tu pedido.');
    const untouched = applyUnavailableToEdit([{ productId: 1, quantity: 1 }], original, [1]);
    expect(editRemovalNotice(ONE, untouched)).toBe(ONE);
  });
});
