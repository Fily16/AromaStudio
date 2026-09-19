import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ConsolidadoStateService } from '../../services/consolidado-state.service';
import { Product } from '../../models/api.models';
import { CartComponent } from './cart.component';

function product(id: number, name: string): Product {
  return { id, brand: 'Lattafa', name, ml: 100, imageUrl: null } as Product;
}

const MSG = '«Lattafa Khamrah» ya no está disponible. Retíralo de tu pedido para continuar.';
/** Lo que se ve: el nombre del perfume + que ya se quitó solo (nunca «Retíralo»). */
const NAMED = '«Lattafa Khamrah» ya no está disponible.';

function setup() {
  const api: Partial<ApiService> = {
    getRetailStock: () => of({}),
    getPublicConfig: () => of({ yapeNumber: '', exchangeRate: 3.7, minOrderUsd: 0 }),
    getActivePromotions: () => of([]),
    getCartCrossSell: () => of([]),
    createOrder: () =>
      throwError(() => new HttpErrorResponse({ status: 400, error: { message: MSG, unavailableProductIds: [2] } })),
  };
  TestBed.configureTestingModule({
    imports: [CartComponent],
    providers: [
      provideRouter([]),
      { provide: ApiService, useValue: api },
      { provide: ConsolidadoStateService, useValue: { open: () => true } },
    ],
  });
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  const cart = TestBed.inject(CartService);
  const fixture = TestBed.createComponent(CartComponent);
  const cmp = fixture.componentInstance;
  cmp.clientName.set('Ana');
  cmp.clientPhone.set('987654321');
  return { fixture, cmp, cart, el: fixture.nativeElement as HTMLElement };
}

describe('CartComponent: perfumes que ya no están disponibles', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('los quita, vuelve a la bolsa si no llega al mínimo y avisa que ya se quitó', () => {
    const { fixture, cmp, cart, el } = setup();
    cart.addItem(product(1, 'Yara'), 2, 'CONSOLIDADO', 100);
    cart.addItem(product(2, 'Khamrah'), 1, 'CONSOLIDADO', 100);
    fixture.detectChanges();
    cmp.goToCheckout();
    expect(cmp.phase()).toBe('checkout');

    cmp.submitOrder();
    fixture.detectChanges();

    expect(cart.cartItems().map((i) => i.product.id)).toEqual([1]);
    expect(cmp.phase()).toBe('bag');
    expect(cmp.removedNotice()).toBe(
      `${NAMED} Ya lo quitamos de tu pedido: agrega otro perfume para completar tu pedido.`,
    );
    expect(el.querySelector('.cart-removed')?.textContent).toContain(NAMED);
    expect(el.textContent).not.toContain('Retíralo');
    expect(/\bnso\b/i.test(el.textContent || '')).toBe(false);
    fixture.destroy();
  });

  it('si sigue llegando al mínimo se queda en el formulario con el mensaje', () => {
    const { fixture, cmp, cart } = setup();
    cart.addItem(product(1, 'Yara'), 3, 'CONSOLIDADO', 100);
    cart.addItem(product(2, 'Khamrah'), 1, 'CONSOLIDADO', 100);
    fixture.detectChanges();
    cmp.goToCheckout();
    cmp.submitOrder();
    fixture.detectChanges();

    expect(cart.cartItems().map((i) => i.product.id)).toEqual([1]);
    expect(cmp.phase()).toBe('checkout');
    expect(cmp.submitError()).toBe(
      `${NAMED} Ya lo quitamos de tu pedido: solo vuelve a pulsar «Confirmar pedido».`,
    );
    expect(cmp.submitting()).toBe(false);
    fixture.destroy();
  });

  it('si el carrito queda vacío, el aviso se ve en el carrito vacío', () => {
    const { fixture, cmp, cart, el } = setup();
    cart.addItem(product(2, 'Khamrah'), 3, 'CONSOLIDADO', 100);
    fixture.detectChanges();
    cmp.goToCheckout();
    cmp.submitOrder();
    fixture.detectChanges();

    expect(cart.isEmpty()).toBe(true);
    const notice = el.querySelector('.cart-empty .cart-removed')?.textContent ?? '';
    expect(notice).toContain(NAMED);
    expect(notice).toContain('Ya lo quitamos de tu pedido: elige otro perfume');
    expect(notice).not.toContain('Retíralo');
    fixture.destroy();
  });
});
