import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { NsoProductRow, NsoStatus, NsoSummary } from '../../../models/api.models';
import { NsoComponent } from './nso.component';

function summary(patch: Partial<NsoSummary> = {}): NsoSummary {
  return {
    gateEnabled: false,
    gateEffective: false,
    catalogRecords: 10,
    catalogActiveRecords: 10,
    catalogVersion: 1,
    lastUpload: null,
    counts: { CON_NSO: 1, EN_REVISION: 0, MARCA_CON_NSO: 0, SIN_NSO: 2, SIN_VERIFICAR: 0 },
    acceptCanCodes: true,
    pendingCandidates: 0,
    publicNow: 3,
    publicIfActivated: 1,
    codesNotInLastUpload: [],
    rematch: { running: false, processed: 0, total: 0, startedAt: null, finishedAt: null, error: null },
    ...patch,
  };
}

function prow(id: number, brand: string, name: string, status: NsoStatus): NsoProductRow {
  return {
    id, brand, name, ml: 100, imageUrl: null, pricePen: 100, suppliers: [], available: true, archived: false,
    status, nsoCode: status === 'CON_NSO' ? 'NSOC70523-25PE' : null, declaredName: null, titular: null,
    matchedBy: null, locked: false, score: null, reasons: [], suggestedBrand: null, country: null,
    nsoYear: null, possiblyExpired: false, decidedBy: null, decidedAt: null,
  } as NsoProductRow;
}

function setup(opts: { summary?: NsoSummary; sin?: NsoProductRow[]; api?: Partial<ApiService> } = {}) {
  const api: Partial<ApiService> = {
    getNsoSummary: () => of(opts.summary ?? summary()),
    getNsoProducts: (status: NsoStatus) =>
      of(status === 'SIN_NSO' ? (opts.sin ?? []) : [prow(9, 'Afnan', 'Supremacy Silver', 'CON_NSO')]),
    getNsoIndex: () => of([]),
    getNsoPendingCount: () => of({ pending: 0 }),
    ...opts.api,
  };
  TestBed.configureTestingModule({
    imports: [NsoComponent],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
  });
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  const fixture = TestBed.createComponent(NsoComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('NsoComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe('listas: buscar sin resultados ≠ lista vacía', () => {
    it('«Sin NSO» con perfumes pero sin coincidencias: dice que no encontró la búsqueda', () => {
      const { cmp, fixture, el } = setup({
        sin: [prow(1, 'Lattafa', 'Yara', 'SIN_NSO'), prow(2, 'Armaf', 'Odyssey', 'SIN_NSO')],
      });
      cmp.setTab('sin');
      fixture.detectChanges();
      cmp.listFilter.set('chanel');
      fixture.detectChanges();
      const text = el.textContent ?? '';
      expect(text).toContain('No encontramos «chanel» en esta lista.');
      expect(text).not.toContain('No hay perfumes sin NSO');
      expect(text).not.toContain('Todos tus perfumes tienen NSO');

      // «Borrar búsqueda» vuelve a mostrar la lista
      (el.querySelector('.nso-clear-search') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(cmp.listFilter()).toBe('');
      expect(el.textContent).toContain('Odyssey');
    });

    it('«Sin NSO» realmente vacía: mantiene el mensaje de «¡Bien!»', () => {
      const { cmp, fixture, el } = setup({ sin: [] });
      cmp.setTab('sin');
      fixture.detectChanges();
      expect(el.textContent).toContain('No hay perfumes sin NSO.');
      expect(el.textContent).not.toContain('en esta lista.');
      expect(el.querySelector('.nso-clear-search')).toBeNull();
    });

    it('«Con NSO» con búsqueda sin coincidencias no dice «Todavía no hay perfumes con NSO»', () => {
      const { cmp, fixture, el } = setup();
      cmp.setTab('con');
      fixture.detectChanges();
      cmp.listFilter.set('zzz');
      fixture.detectChanges();
      expect(el.textContent).toContain('No encontramos «zzz» en esta lista.');
      expect(el.textContent).not.toContain('Todavía no hay perfumes con NSO');
    });
  });

  describe('filtro de la tienda mientras se verifica', () => {
    it('no se puede encender mientras la verificación de fondo corre', () => {
      const setGate = vi.fn((_enabled: boolean) => of(summary({ gateEnabled: true, gateEffective: true })));
      const running = summary({
        rematch: { running: true, processed: 8, total: 100, startedAt: null, finishedAt: null, error: null },
      });
      const { cmp, fixture, el } = setup({ summary: running, api: { setNsoGate: setGate } });
      fixture.detectChanges();
      const gateSwitch = el.querySelector('.nso-gate:not(.nso-can) .nso-switch') as HTMLButtonElement;
      expect(gateSwitch.disabled).toBe(true);
      expect(el.textContent).toContain('Espera a que termine la verificación para activar el filtro');

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      cmp.toggleGate();
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(setGate).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
      cmp.ngOnDestroy();
    });

    it('sin verificación en curso sí se puede encender (con confirmación)', () => {
      const setGate = vi.fn((_enabled: boolean) => of(summary({ gateEnabled: true, gateEffective: true })));
      const { cmp, el } = setup({ api: { setNsoGate: setGate } });
      const gateSwitch = el.querySelector('.nso-gate:not(.nso-can) .nso-switch') as HTMLButtonElement;
      expect(gateSwitch.disabled).toBe(false);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      cmp.toggleGate();
      expect(confirmSpy).toHaveBeenCalled();
      expect(setGate).toHaveBeenCalledWith(true);
      confirmSpy.mockRestore();
    });

    it('apagar el filtro sigue permitido aunque se esté verificando', () => {
      const on = summary({
        gateEnabled: true,
        gateEffective: true,
        rematch: { running: true, processed: 8, total: 100, startedAt: null, finishedAt: null, error: null },
      });
      const { cmp, el } = setup({ summary: on, api: { setNsoGate: () => of(summary()) } });
      const gateSwitch = el.querySelector('.nso-gate:not(.nso-can) .nso-switch') as HTMLButtonElement;
      expect(gateSwitch.disabled).toBe(false);
      cmp.ngOnDestroy();
    });
  });

  describe('NSO de otros países de la Comunidad Andina', () => {
    it('muestra el interruptor con su explicación y sin el umbral técnico', () => {
      const { el } = setup({ summary: summary({ reviewMinScore: 0.66 }) });
      const text = el.textContent ?? '';
      expect(text).toContain(
        'Aceptar NSO de otros países de la Comunidad Andina (Colombia, Bolivia, Ecuador)',
      );
      const sw = el.querySelector('.nso-can .nso-switch') as HTMLButtonElement;
      expect(sw.getAttribute('aria-checked')).toBe('true');
      expect(text).not.toContain('0.66');
      expect(text).not.toMatch(/reviewMinScore|puntaje m[ií]nimo/i);
    });

    it('apagarlo pide confirmación y guarda con PUT settings {acceptCanCodes:false}', () => {
      const setSettings = vi.fn((_body: { acceptCanCodes?: boolean }) => of(summary({ acceptCanCodes: false })));
      const { cmp, fixture, el } = setup({
        summary: summary({ gateEnabled: true, gateEffective: true }),
        api: { setNsoSettings: setSettings },
      });
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      (el.querySelector('.nso-can .nso-switch') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(String(confirmSpy.mock.calls[0][0])).toContain('se ocultarán de tu tienda');
      expect(setSettings).toHaveBeenCalledWith({ acceptCanCodes: false });
      expect(cmp.nso.acceptCanCodes()).toBe(false);
      expect(
        (el.querySelector('.nso-can .nso-switch') as HTMLButtonElement).getAttribute('aria-checked'),
      ).toBe('false');
      confirmSpy.mockRestore();
    });

    it('si cancela la confirmación no cambia nada', () => {
      const setSettings = vi.fn((_body: { acceptCanCodes?: boolean }) => of(summary({ acceptCanCodes: false })));
      const { cmp } = setup({ api: { setNsoSettings: setSettings } });
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      cmp.toggleAcceptCan();
      expect(setSettings).not.toHaveBeenCalled();
      expect(cmp.nso.acceptCanCodes()).toBe(true);
      confirmSpy.mockRestore();
    });
  });
});
