import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ConsolidadoStateService } from '../../services/consolidado-state.service';
import { Product } from '../../models/api.models';
import { ProductDetailComponent } from './product-detail.component';

function setup(getProduct: () => any) {
  const api: Partial<ApiService> = {
    getProducts: () => of([]),
    getRetailStock: () => of({}),
    getProduct: getProduct as ApiService['getProduct'],
    getRelated: () => of([]),
  };
  TestBed.configureTestingModule({
    imports: [ProductDetailComponent],
    providers: [
      provideRouter([]),
      { provide: ApiService, useValue: api },
      { provide: ConsolidadoStateService, useValue: { open: () => true } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '42' })) } },
    ],
  });
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ProductDetailComponent);
  fixture.detectChanges();
  return { fixture, navigate, el: fixture.nativeElement as HTMLElement };
}

describe('ProductDetailComponent: perfume que ya no está', () => {
  it('404: muestra «ya no está disponible» con botón al catálogo y no redirige en silencio', () => {
    const { fixture, navigate, el } = setup(() =>
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );
    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(el.textContent).toContain('Este perfume ya no está disponible');
    const link = el.querySelector('a.as-btn-primary') as HTMLAnchorElement;
    expect(link?.getAttribute('href')).toBe('/catalogo');
    expect(navigate).not.toHaveBeenCalled();
    // la tienda nunca menciona el NSO
    expect(/\bnso\b/i.test(el.textContent || '')).toBe(false);
  });

  it('otro error: ofrece reintentar', () => {
    let calls = 0;
    const { fixture, el } = setup(() => {
      calls++;
      return throwError(() => new HttpErrorResponse({ status: 0 }));
    });
    expect(fixture.componentInstance.loadFailed()).toBe(true);
    expect(el.textContent).toContain('No pudimos cargar este perfume');
    (el.querySelector('button.as-btn-primary') as HTMLButtonElement).click();
    expect(calls).toBe(2);
  });

  it('producto que sí existe: se muestra normal', () => {
    const p = { id: 42, brand: 'Lattafa', name: 'Yara', ml: 100, wholesalePricePen: 120 } as Product;
    const { fixture, el } = setup(() => of(p));
    expect(fixture.componentInstance.notFound()).toBe(false);
    expect(el.querySelector('.pd-name')?.textContent).toContain('Yara');
  });
});
