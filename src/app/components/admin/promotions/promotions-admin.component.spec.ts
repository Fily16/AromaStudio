import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { NsoSummary, Product } from '../../../models/api.models';
import { PromotionsAdminComponent } from './promotions-admin.component';

function product(id: number, name: string): Product {
  return { id, brand: 'Lattafa', name, ml: 100, sku: 'SKU' + id } as Product;
}

function summary(): NsoSummary {
  return {
    gateEnabled: true,
    gateEffective: true,
    catalogRecords: 10,
    catalogActiveRecords: 10,
    catalogVersion: 1,
    lastUpload: null,
    counts: { CON_NSO: 1, EN_REVISION: 0, MARCA_CON_NSO: 0, SIN_NSO: 1, SIN_VERIFICAR: 0 },
    acceptCanCodes: true,
    pendingCandidates: 0,
    publicNow: 2,
    publicIfActivated: 1,
    codesNotInLastUpload: [],
    rematch: { running: false, processed: 0, total: 0, startedAt: null, finishedAt: null, error: null },
  };
}

describe('PromotionsAdminComponent + NSO', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('si el resumen NSO falla (y el índice llega bien) no se queda en «Cargando catálogo…»', () => {
    let summaryCalls = 0;
    let fail = true;
    const api: Partial<ApiService> = {
      getPromotions: () => of([]),
      getAdminProducts: () => of([product(1, 'Yara'), product(2, 'Khamrah')]),
      getNsoSummary: () => {
        summaryCalls++;
        return fail ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(summary());
      },
      getNsoIndex: () => of([]),
    };
    TestBed.configureTestingModule({
      imports: [PromotionsAdminComponent],
      providers: [{ provide: ApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(PromotionsAdminComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();
    cmp.newPromo();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(cmp.nsoWaiting()).toBe(false);
    expect(el.textContent).not.toContain('Cargando catálogo…');
    expect(el.textContent).toContain('No se pudo revisar el NSO');
    expect(cmp.filteredProducts().length).toBe(2);

    // Reintentar vuelve a pedir el resumen
    fail = false;
    const retry = [...el.querySelectorAll('.pr-hidden button')].find((b) =>
      b.textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    expect(summaryCalls).toBe(2);
    expect(cmp.nsoReady()).toBe(true);
  });
});
