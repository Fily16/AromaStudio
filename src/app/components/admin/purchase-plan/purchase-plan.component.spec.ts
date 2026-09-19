import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AllocationResponse, Consolidado } from '../../../models/api.models';
import { PurchasePlanComponent } from './purchase-plan.component';

const STALE_MSG =
  'Este plan incluye 1 perfume(s) sin NSO que ya no se pueden comprar. Vuelve a calcular el plan.';

function allocation(planId: number): AllocationResponse {
  return {
    planId,
    baselineTotalUsd: 100,
    chosenTotalUsd: 100,
    extraCostUsd: 0,
    marginWarnings: [],
    skipAnalysis: [],
    lostSales: [],
    suppliers: [],
    storeFillSuggestions: [],
    zimaxxGapUsd: 0,
    unfulfillable: [],
    notes: [],
    nsoBlocked: [],
  } as unknown as AllocationResponse;
}

function setup(confirmError: HttpErrorResponse) {
  let computeCalls = 0;
  let confirmCalls = 0;
  const api: Partial<ApiService> = {
    getActiveConsolidado: () => of({ id: 7 } as Consolidado),
    getCurrentPurchasePlan: () => of({ plan: 'NONE' as const }),
    computePurchasePlan: () => {
      computeCalls++;
      return of(allocation(100 + computeCalls));
    },
    confirmPurchasePlan: () => {
      confirmCalls++;
      return throwError(() => confirmError);
    },
    getMarginReport: () => of([]),
  };
  TestBed.configureTestingModule({
    imports: [PurchasePlanComponent],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
  });
  const fixture = TestBed.createComponent(PurchasePlanComponent);
  fixture.detectChanges();
  return {
    fixture,
    cmp: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
    computeCalls: () => computeCalls,
    confirmCalls: () => confirmCalls,
  };
}

describe('PurchasePlanComponent: confirmar un borrador viejo', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('400 con unavailableProductIds: muestra el mensaje y «Recalcular plan» vuelve a calcular', () => {
    const t = setup(
      new HttpErrorResponse({ status: 400, error: { message: STALE_MSG, unavailableProductIds: [5] } }),
    );
    t.cmp.compute();
    t.fixture.detectChanges();
    expect(t.computeCalls()).toBe(1);

    t.cmp.confirm(false);
    t.fixture.detectChanges();
    expect(t.confirmCalls()).toBe(1);
    expect(t.cmp.planStale()).toBe(true);
    expect(t.cmp.needsForce()).toBe(false);
    expect(t.el.querySelector('.pp-err')?.textContent).toContain(STALE_MSG);

    const recalc = [...t.el.querySelectorAll('.pp-stale button')].find((b) =>
      b.textContent?.includes('Recalcular plan'),
    ) as HTMLButtonElement | undefined;
    expect(recalc).toBeTruthy();
    // El borrador viejo ya no se puede confirmar
    const confirmBtn = t.el.querySelector('.pp-confirm button.primary') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    recalc!.click();
    t.fixture.detectChanges();
    expect(t.computeCalls()).toBe(2);
    expect(t.cmp.planStale()).toBe(false);
    expect(t.cmp.result()?.planId).toBe(102);
    expect(t.el.querySelector('.pp-stale')).toBeNull();
    expect((t.el.querySelector('.pp-confirm button.primary') as HTMLButtonElement).disabled).toBe(false);
  });

  it('un 400 sin perfumes bloqueados sigue siendo un error normal (sin «Recalcular plan»)', () => {
    const t = setup(new HttpErrorResponse({ status: 400, error: { message: 'Algo salió mal' } }));
    t.cmp.compute();
    t.cmp.confirm(false);
    t.fixture.detectChanges();
    expect(t.cmp.planStale()).toBe(false);
    expect(t.el.querySelector('.pp-err')?.textContent).toContain('Algo salió mal');
    expect(t.el.querySelector('.pp-stale')).toBeNull();
  });

  it('el 409 de margen sigue ofreciendo «Confirmar IGUAL»', () => {
    const t = setup(
      new HttpErrorResponse({
        status: 409,
        error: { error: 'margen', marginWarnings: [{ productId: 1, name: 'Yara', marginPen: 2 }] },
      }),
    );
    t.cmp.compute();
    t.cmp.confirm(false);
    t.fixture.detectChanges();
    expect(t.cmp.needsForce()).toBe(true);
    expect(t.cmp.planStale()).toBe(false);
    expect(t.el.textContent).toContain('Confirmar IGUAL con margen bajo');
  });
});
