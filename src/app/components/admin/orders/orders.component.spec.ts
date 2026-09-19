import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import {
  AllocationResponse, Consolidado, NsoIndexRow, NsoSummary, Order, Product, SingleSupplierPlan,
} from '../../../models/api.models';
import { OrdersComponent } from './orders.component';

function product(id: number, name: string): Product {
  return { id, brand: 'Lattafa', name, ml: 100, priceUsd: 10, weightG: 500, imageUrl: null } as Product;
}

const YARA = product(1, 'Yara');       // CON_NSO
const KHAMRAH = product(2, 'Khamrah'); // sin NSO -> bloqueado

function order(id: number, code: string, client: string, items: [Product, number][]): Order {
  return {
    id, orderCode: code, consolidadoId: 5, clientName: client, clientPhone: '987654321',
    paymentStatus: 'SEPARADO', channel: 'CONSOLIDADO', totalPen: 300, depositAmountPen: 60, remainingPen: 240,
    items: items.map(([p, q], i) => ({ id: id * 10 + i, product: p, quantity: q, unitPricePen: 100, subtotalPen: 100 * q })),
    promos: [],
  } as unknown as Order;
}

const ANA = order(1, 'AS-0001', 'Ana', [[YARA, 1], [KHAMRAH, 2]]);
const LUIS = order(2, 'AS-0002', 'Luis', [[YARA, 3]]);

function summary(): NsoSummary {
  return {
    gateEnabled: true, gateEffective: true, catalogRecords: 5, catalogActiveRecords: 5, catalogVersion: 1,
    lastUpload: null, counts: { CON_NSO: 1, EN_REVISION: 0, MARCA_CON_NSO: 0, SIN_NSO: 1, SIN_VERIFICAR: 0 },
    acceptCanCodes: true, pendingCandidates: 0, publicNow: 2, publicIfActivated: 1, codesNotInLastUpload: [],
    rematch: { running: false, processed: 0, total: 0, startedAt: null, finishedAt: null, error: null },
  };
}

const INDEX: NsoIndexRow[] = [
  { productId: 1, status: 'CON_NSO', nsoCode: 'NSOC70523-25PE', matchedBy: 'NOMBRE', locked: false, score: 1,
    country: 'PE', nsoYear: 2025, otherCanCountry: false, possiblyExpired: false },
  { productId: 2, status: 'SIN_NSO', nsoCode: null, matchedBy: null, locked: false, score: null,
    country: null, nsoYear: null, otherCanCountry: false, possiblyExpired: false },
];

const BLOCKED = [{ productId: 2, brand: 'Lattafa', name: 'Khamrah', ml: 100, quantity: 2, status: 'SIN_NSO' as const }];

function allocation(): AllocationResponse {
  return {
    consolidadoId: 5, suppliers: [], baselineTotalUsd: 0, chosenTotalUsd: 0, extraCostUsd: 0,
    zimaxxPriorityEnabled: false, zimaxxMinReached: true, zimaxxGapUsd: 0, storeFillSuggestions: [],
    unfulfillable: [], notes: [], planId: null, skipAnalysis: [], marginWarnings: [], lostSales: [],
    penaltiesUsd: 0, nsoBlocked: BLOCKED,
  };
}

function setup() {
  const api: Partial<ApiService> = {
    getSellers: () => of([]),
    getPromotions: () => of([]),
    getConfig: () => of([]),
    getConsolidados: () => of([{ id: 5, status: 'CERRADO' } as Consolidado]),
    getConsolidadoOrders: () => of([ANA, LUIS]),
    getNsoSummary: () => of(summary()),
    getNsoIndex: () => of(INDEX),
    getNsoPendingCount: () => of({ pending: 0 }),
    getAllocation: () => of(allocation()),
    getMissing: () => of([]),
  };
  TestBed.configureTestingModule({
    imports: [OrdersComponent],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
  });
  const fixture = TestBed.createComponent(OrdersComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('OrdersComponent: «No se puede importar»', () => {
  it('muestra el grupo con cantidad y estado, y solo los clientes afectados', () => {
    const { fixture, cmp, el } = setup();
    cmp.viewAllocation();
    fixture.detectChanges();
    expect(el.textContent).toContain('No se puede importar (1)');
    expect(el.querySelector('.ord-nso .ord-nc-qty')?.textContent).toContain('×2');
    expect(el.querySelector('.ord-nso .ord-nc-meta .adm-st')?.textContent).toContain('Sin NSO');
    expect(el.querySelector('.ord-nso .ord-single-gh .adm-st')?.textContent).toContain('1 perfume · 2 unidades');
    const report = cmp.nsoBlockedReport();
    expect(report.map((r) => r.order.orderCode)).toEqual(['AS-0001']);
    expect(report[0].unavailable).toEqual([{ label: 'Lattafa Khamrah', qty: 2 }]);
  });

  it('WhatsApp con texto neutral (nunca dice NSO) al número del cliente', () => {
    const { fixture, cmp, el } = setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    cmp.viewAllocation();
    fixture.detectChanges();
    (el.querySelector('.ord-nso .adm-btn.wa') as HTMLButtonElement).click();
    expect(open).toHaveBeenCalledTimes(1);
    const url = String(open.mock.calls[0][0]);
    expect(url.startsWith('https://wa.me/51987654321?text=')).toBe(true);
    const text = decodeURIComponent(url.split('text=')[1]);
    expect(text).toContain('no está disponible para importación');
    expect(/\bnso\b/i.test(text)).toBe(false);
    expect(cmp.nsoNotified().has(ANA.id)).toBe(true);
    open.mockRestore();
  });

  it('modo «Solo X» usa el nsoBlocked de ese plan', () => {
    const { cmp } = setup();
    cmp.viewAllocation();
    cmp.singlePlan.set({
      consolidadoId: 5, targetSupplierId: 1, targetSupplierName: 'Zimaxx', buy: [], couldNotBuy: [],
      buyPerfumes: 0, buyUnits: 0, buySubtotalUsd: 0, nsoBlocked: [],
    } as SingleSupplierPlan);
    expect(cmp.nsoBlocked()).toEqual([]);
    expect(cmp.nsoBlockedReport()).toEqual([]);
  });

  it('chip «Sin NSO» en los ítems del pedido con el filtro activo', () => {
    const { fixture, cmp, el } = setup();
    cmp.toggleOrderDetail(ANA.id);
    fixture.detectChanges();
    const chips = el.querySelectorAll('.ord-nso-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('Sin NSO');
    expect(cmp.nsoHidden(YARA.id)).toBe(false);
    expect(cmp.nsoHidden(KHAMRAH.id)).toBe(true);
  });
});
