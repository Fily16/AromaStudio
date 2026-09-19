import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { NsoSummary, Product } from '../../../models/api.models';
import { ProductsComponent } from './products.component';

function product(id: number, name: string): Product {
  return { id, brand: 'Lattafa', name, ml: 100, sku: 'SKU' + id, wholesalePricePen: 100, available: true } as Product;
}

function summary(): NsoSummary {
  return {
    gateEnabled: false,
    gateEffective: false,
    catalogRecords: 10,
    catalogActiveRecords: 10,
    catalogVersion: 1,
    lastUpload: null,
    counts: { CON_NSO: 0, EN_REVISION: 0, MARCA_CON_NSO: 0, SIN_NSO: 0, SIN_VERIFICAR: 2 },
    acceptCanCodes: true,
    pendingCandidates: 0,
    publicNow: 2,
    publicIfActivated: 0,
    codesNotInLastUpload: [],
    rematch: { running: false, processed: 0, total: 0, startedAt: null, finishedAt: null, error: null },
  };
}

function setup(api: Partial<ApiService>) {
  const base: Partial<ApiService> = {
    getAdminProducts: () => of([product(1, 'Yara'), product(2, 'Khamrah')]),
    getProductsPricing: () => of([]),
    getOffersIndex: () => of([]),
    getConfig: () => of([]),
    getNsoSummary: () => of(summary()),
    getNsoIndex: () => of([]),
    getAdminRetailStock: () => of({ 2: 4 }),
    getRetailStock: () => {
      throw new Error('el panel no debe usar el stock público (sin token)');
    },
    ...api,
  };
  TestBed.configureTestingModule({
    imports: [ProductsComponent],
    providers: [{ provide: ApiService, useValue: base }],
  });
  const fixture = TestBed.createComponent(ProductsComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance };
}

describe('ProductsComponent (panel)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('usa el stock de tienda CON token: ve el stock de perfumes ocultos por el filtro', () => {
    const { cmp } = setup({});
    expect(cmp.stockQty(2)).toBe(4);
  });

  it('exportar sin resumen NSO (falló): avisa y lo vuelve a pedir, el botón no queda muerto', async () => {
    let summaryCalls = 0;
    let fail = true;
    const { cmp } = setup({
      getNsoSummary: () => {
        summaryCalls++;
        return fail ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(summary());
      },
    });
    expect(summaryCalls).toBe(1);
    expect(cmp.nso.summary()).toBeNull();

    fail = false;
    await cmp.downloadPriceList(); // no exporta todavía: pide el resumen otra vez
    expect(summaryCalls).toBe(2);
    expect(cmp.nso.summary()).not.toBeNull();
    expect(cmp.message()).toBe('No se pudo cargar el resumen NSO.');
  });
});
