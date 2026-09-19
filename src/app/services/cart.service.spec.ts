import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product, Promotion } from '../models/api.models';

function product(id: number): Product {
  return { id, brand: 'Marca', name: `Perfume ${id}`, ml: 100 } as Product;
}

function promo(id: number, productIds: (number | null)[]): Promotion {
  return {
    id,
    name: `Pack ${id}`,
    pricePen: 200,
    stockQty: 5,
    items: productIds.map((pid) => ({ productId: pid, name: 'x', imageUrl: null })),
  } as Promotion;
}

describe('CartService.removeUnavailable', () => {
  let cart: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartService);
  });

  it('quita los perfumes no disponibles y deja el resto', () => {
    cart.addItem(product(1), 2, 'CONSOLIDADO', 100);
    cart.addItem(product(2), 1, 'CONSOLIDADO', 90);
    const r = cart.removeUnavailable([2]);
    expect(r).toEqual({ items: 1, promos: 0 });
    expect(cart.cartItems().map((i) => i.product.id)).toEqual([1]);
    expect(cart.catalogType()).toBe('CONSOLIDADO');
    expect(cart.totalPen()).toBe(200);
  });

  it('si el carrito queda vacío se libera el canal', () => {
    cart.addItem(product(1), 1, 'CONSOLIDADO', 100);
    cart.removeUnavailable([1]);
    expect(cart.isEmpty()).toBe(true);
    expect(cart.catalogType()).toBeNull();
  });

  it('quita los packs que traen un perfume no disponible', () => {
    cart.addItem(product(1), 1, 'STOCK', 150);
    cart.addPromo(promo(10, [3, null]));
    cart.addPromo(promo(11, [4]));
    const r = cart.removeUnavailable([3]);
    expect(r).toEqual({ items: 0, promos: 1 });
    expect(cart.promoItems().map((p) => p.promo.id)).toEqual([11]);
    expect(cart.cartItems().length).toBe(1);
  });

  it('con solo packs restantes el canal pasa a entrega inmediata', () => {
    cart.addItem(product(1), 1, 'STOCK', 150);
    cart.addPromo(promo(10, [2]));
    cart.removeUnavailable([1]);
    expect(cart.cartItems().length).toBe(0);
    expect(cart.catalogType()).toBe('STOCK');
  });

  it('lista vacía: no hace nada', () => {
    cart.addItem(product(1), 1, 'CONSOLIDADO', 100);
    expect(cart.removeUnavailable([])).toEqual({ items: 0, promos: 0 });
    expect(cart.cartItems().length).toBe(1);
  });
});
