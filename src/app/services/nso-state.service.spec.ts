import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { NsoStateService } from './nso-state.service';
import { NsoIndexRow, NsoStatus, NsoSummary } from '../models/api.models';

function summary(patch: Partial<NsoSummary> = {}): NsoSummary {
  return {
    gateEnabled: true,
    gateEffective: true,
    catalogRecords: 10,
    catalogActiveRecords: 10,
    catalogVersion: 1,
    lastUpload: null,
    counts: { CON_NSO: 0, EN_REVISION: 0, MARCA_CON_NSO: 0, SIN_NSO: 0, SIN_VERIFICAR: 0 },
    acceptCanCodes: true,
    pendingCandidates: 0,
    publicNow: 0,
    publicIfActivated: 0,
    codesNotInLastUpload: [],
    rematch: { running: false, processed: 0, total: 0, startedAt: null, finishedAt: null, error: null },
    ...patch,
  };
}

function row(productId: number, status: NsoStatus, nsoCode: string | null, country: string | null): NsoIndexRow {
  return {
    productId,
    status,
    nsoCode,
    matchedBy: status === 'CON_NSO' ? 'NOMBRE' : null,
    locked: false,
    score: null,
    country,
    nsoYear: 2025,
    otherCanCountry: !!country && country !== 'PE',
    possiblyExpired: false,
  };
}

describe('NsoStateService.isHidden', () => {
  let svc: NsoStateService;

  beforeEach(() => {
    const apiMock: Partial<ApiService> = {
      getNsoSummary: () => of(summary()),
      getNsoIndex: () => of([]),
      getNsoPendingCount: () => of({ pending: 0 }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: apiMock }] });
    svc = TestBed.inject(NsoStateService);
    const index = new Map<number, NsoIndexRow>([
      [1, row(1, 'CON_NSO', 'NSOC70523-25PE', 'PE')],
      [2, row(2, 'CON_NSO', 'NSOC70524-25CO', 'CO')],
      [3, row(3, 'EN_REVISION', null, null)],
      [4, row(4, 'CON_NSO', 'NSOC70525-24BO', null)], // sin país en la fila: se saca del código
      [5, row(5, 'MARCA_CON_NSO', null, null)],
    ]);
    svc.index.set(index);
  });

  it('con el filtro apagado nada queda oculto', () => {
    svc.setSummary(summary({ gateEnabled: false, gateEffective: false, acceptCanCodes: false }));
    for (const id of [1, 2, 3, 4, 5, 99]) expect(svc.isHidden(id)).toBe(false);
  });

  it('con el filtro activo oculta lo que no es CON_NSO (y lo que no está en el índice)', () => {
    svc.setSummary(summary());
    expect(svc.isHidden(1)).toBe(false);
    expect(svc.isHidden(3)).toBe(true);
    expect(svc.isHidden(5)).toBe(true);
    expect(svc.isHidden(99)).toBe(true); // sin fila = Sin verificar
  });

  it('acceptCanCodes=true: los NSO de otro país cuentan', () => {
    svc.setSummary(summary({ acceptCanCodes: true }));
    expect(svc.acceptCanCodes()).toBe(true);
    expect(svc.isHidden(2)).toBe(false);
    expect(svc.isHidden(4)).toBe(false);
  });

  it('acceptCanCodes=false: un CON_NSO de otro país también queda oculto', () => {
    svc.setSummary(summary({ acceptCanCodes: false }));
    expect(svc.acceptCanCodes()).toBe(false);
    expect(svc.isHidden(1)).toBe(false); // Perú sigue visible
    expect(svc.isHidden(2)).toBe(true); // CO
    expect(svc.isHidden(4)).toBe(true); // BO, país sacado del código
  });

  it('si el backend aún no manda acceptCanCodes se asume true (valor por defecto)', () => {
    const s = summary();
    delete (s as Partial<NsoSummary>).acceptCanCodes;
    svc.setSummary(s);
    expect(svc.acceptCanCodes()).toBe(true);
    expect(svc.isHidden(2)).toBe(false);
  });

  it('refleja al instante un cambio optimista del índice', () => {
    svc.setSummary(summary({ acceptCanCodes: false }));
    expect(svc.isHidden(3)).toBe(true);
    svc.patchIndex(3, { status: 'CON_NSO', nsoCode: 'NSOC11111-26PE', country: 'PE' });
    expect(svc.isHidden(3)).toBe(false);
    svc.patchIndex(3, { nsoCode: 'NSOC11111-26EC', country: 'EC' });
    expect(svc.isHidden(3)).toBe(true);
  });

  it('marca el índice como cargado al descargarlo', () => {
    expect(svc.indexLoaded()).toBe(false);
    svc.refreshIndex();
    expect(svc.indexLoaded()).toBe(true);
    expect(svc.indexLoading()).toBe(false);
  });
});

describe('NsoStateService: errores de carga', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(api: Partial<ApiService>) {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    return TestBed.inject(NsoStateService);
  }

  it('si el resumen falla y el índice llega DESPUÉS bien, el error del resumen no se borra', () => {
    const summary$ = new Subject<NsoSummary>();
    const index$ = new Subject<NsoIndexRow[]>();
    const svc = setup({ getNsoSummary: () => summary$, getNsoIndex: () => index$ });
    svc.refresh();
    summary$.error(new HttpErrorResponse({ status: 500 }));
    index$.next([row(1, 'CON_NSO', 'NSOC70523-25PE', 'PE')]);
    index$.complete();
    expect(svc.summary()).toBeNull();
    expect(svc.indexLoaded()).toBe(true);
    expect(svc.summaryError()).toBe('No se pudo cargar el resumen NSO.');
    expect(svc.loadError()).toBe('No se pudo cargar el resumen NSO.');
  });

  it('load() vuelve a intentar si la carga anterior falló (y no repite si fue bien)', () => {
    let summaryCalls = 0;
    let fail = true;
    const svc = setup({
      getNsoSummary: (): Observable<NsoSummary> => {
        summaryCalls++;
        return fail ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(summary());
      },
      getNsoIndex: () => of([]),
    });
    svc.load();
    expect(summaryCalls).toBe(1);
    expect(svc.loadError()).not.toBe('');
    fail = false;
    svc.load();
    expect(summaryCalls).toBe(2);
    expect(svc.summary()).not.toBeNull();
    expect(svc.loadError()).toBe('');
    svc.load();
    expect(summaryCalls).toBe(2);
  });

  it('retryIfMissing: pide de nuevo si falta el resumen, pero no si ya viene en camino', () => {
    let summaryCalls = 0;
    const pending$ = new Subject<NsoSummary>();
    const svc = setup({
      getNsoSummary: () => {
        summaryCalls++;
        return pending$;
      },
      getNsoIndex: () => of([]),
    });
    svc.retryIfMissing();
    expect(summaryCalls).toBe(1);
    svc.retryIfMissing(); // en camino: no se duplica
    expect(summaryCalls).toBe(1);
    pending$.error(new HttpErrorResponse({ status: 500 }));
    svc.retryIfMissing(); // falló: se vuelve a pedir
    expect(summaryCalls).toBe(2);
  });

  it('un resumen que llega de otra pantalla (setSummary) borra el error del resumen', () => {
    const svc = setup({
      getNsoSummary: () => throwError(() => new HttpErrorResponse({ status: 500 })),
      getNsoIndex: () => of([]),
    });
    svc.refresh();
    expect(svc.loadError()).not.toBe('');
    svc.setSummary(summary());
    expect(svc.loadError()).toBe('');
  });

  it('si falla el índice, el error queda aunque el resumen llegue bien', () => {
    const svc = setup({
      getNsoSummary: () => of(summary()),
      getNsoIndex: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    svc.refresh();
    expect(svc.summary()).not.toBeNull();
    expect(svc.indexError()).toBe('No se pudo cargar el estado NSO de los productos.');
    expect(svc.loadError()).toBe('No se pudo cargar el estado NSO de los productos.');
  });
});
