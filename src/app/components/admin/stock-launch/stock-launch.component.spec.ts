import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { NsoIndexRow, NsoStatus, NsoSummary, Product, RetailInventory } from '../../../models/api.models';
import { StockLaunchComponent } from './stock-launch.component';

function product(id: number, name: string): Product {
  return { id, brand: 'Lattafa', name, ml: 100, wholesalePricePen: 100, stockPricePen: 150 } as Product;
}

function summary(gateEffective: boolean): NsoSummary {
  return {
    gateEnabled: gateEffective,
    gateEffective,
    catalogRecords: 10,
    catalogActiveRecords: 10,
    catalogVersion: 1,
    lastUpload: null,
    counts: { CON_NSO: 1, EN_REVISION: 0, MARCA_CON_NSO: 0, SIN_NSO: 1, SIN_VERIFICAR: 1 },
    acceptCanCodes: true,
    pendingCandidates: 0,
    publicNow: 3,
    publicIfActivated: 1,
    codesNotInLastUpload: [],
    rematch: { running: false, processed: 0, total: 0, startedAt: null, finishedAt: null, error: null },
  };
}

function row(productId: number, status: NsoStatus): NsoIndexRow {
  return {
    productId, status, nsoCode: status === 'CON_NSO' ? 'NSOC70523-25PE' : null, matchedBy: null,
    locked: false, score: null, country: status === 'CON_NSO' ? 'PE' : null, nsoYear: 2025,
    otherCanCountry: false, possiblyExpired: false,
  };
}

const P1 = product(1, 'Yara');       // CON_NSO
const P2 = product(2, 'Khamrah');    // SIN_NSO (y con stock físico)
const P3 = product(3, 'Asad');       // sin fila = Sin verificar

function setup(opts: { gate: boolean; api?: Partial<ApiService> }) {
  const api: Partial<ApiService> = {
    getAdminProducts: () => of([P1, P2, P3]),
    getRetailInventory: () => of([{ id: 1, product: P2, quantity: 3 } as RetailInventory]),
    getRetailSales: () => of([]),
    getNsoSummary: () => of(summary(opts.gate)),
    getNsoIndex: () => of([row(1, 'CON_NSO'), row(2, 'SIN_NSO')]),
    getNsoPendingCount: () => of({ pending: 0 }),
    ...opts.api,
  };
  TestBed.configureTestingModule({
    imports: [StockLaunchComponent],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
  });
  const fixture = TestBed.createComponent(StockLaunchComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('StockLaunchComponent + NSO', () => {
  it('filtro activo: solo ofrece perfumes con NSO y cuenta los ocultos', () => {
    const { cmp, el } = setup({ gate: true });
    expect(cmp.filtered().map((p) => p.id)).toEqual([1]);
    expect(cmp.hiddenCount()).toBe(2);
    expect(el.textContent).toContain('2 ocultos por no tener NSO');
  });

  it('filtro apagado: ofrece todo y no muestra contador', () => {
    const { cmp, el } = setup({ gate: false });
    expect(cmp.filtered().map((p) => p.id)).toEqual([1, 2, 3]);
    expect(cmp.hiddenCount()).toBe(0);
    expect(el.textContent).not.toContain('por no tener NSO');
  });

  it('stock físico sin NSO: se puede vender, con aviso', () => {
    const { el } = setup({ gate: true });
    expect(el.textContent).toContain(
      'Este perfume no tiene NSO: puedes vender el stock que ya tienes, pero no se volverá a comprar',
    );
    expect(el.querySelector('button.adm-btn.ok')?.hasAttribute('disabled')).toBe(false);
  });

  it('lanzar: muestra los que el backend dejó fuera (blocked)', () => {
    const { cmp, fixture, el } = setup({
      gate: true,
      api: { launchToStock: () => of({ received: 2, launched: 1, blocked: [{ productId: 2, name: 'Lattafa Khamrah' }] }) },
    });
    cmp.toggle(P1);
    cmp.launch();
    fixture.detectChanges();
    expect(cmp.messageKind()).toBe('warn');
    expect(cmp.message()).toContain('No se lanzaron 1 por no tener NSO: Lattafa Khamrah.');
    expect(el.querySelector('.sl-msg')?.textContent).toContain('Lattafa Khamrah');
  });

  it('lanzar con error: el mensaje del backend queda visible', () => {
    const { cmp, fixture, el } = setup({
      gate: true,
      api: {
        launchToStock: () =>
          throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Algo salió mal' } })),
      },
    });
    cmp.toggle(P1);
    cmp.launch();
    fixture.detectChanges();
    expect(cmp.messageKind()).toBe('error');
    expect(el.querySelector('.sl-msg.error')?.textContent).toContain('Algo salió mal');
  });

  it('resumen NSO caído (índice bien): no se queda en «Cargando catálogo…» y Reintentar lo vuelve a pedir', () => {
    let summaryCalls = 0;
    let fail = true;
    const { cmp, fixture, el } = setup({
      gate: true,
      api: {
        getNsoSummary: () => {
          summaryCalls++;
          return fail ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(summary(true));
        },
      },
    });
    expect(cmp.nsoWaiting()).toBe(false);
    expect(cmp.nsoFailed()).toBe(true);
    expect(el.textContent).not.toContain('Cargando catálogo…');
    expect(el.textContent).toContain('No se pudo revisar el NSO');
    expect(summaryCalls).toBe(1);

    fail = false;
    cmp.reload();
    fixture.detectChanges();
    expect(summaryCalls).toBe(2);
    expect(cmp.nsoReady()).toBe(true);
    expect(cmp.filtered().map((p) => p.id)).toEqual([1]);
  });

  it('no se traga los errores de carga: aviso visible con reintentar', () => {
    const { el } = setup({
      gate: false,
      api: { getRetailInventory: () => throwError(() => new HttpErrorResponse({ status: 500 })) },
    });
    expect(el.querySelector('.sl-error')?.textContent).toContain('No se pudo cargar el stock de tienda.');
  });
});
