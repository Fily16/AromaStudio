import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { NsoStateService } from '../../../../services/nso-state.service';
import { NsoAssignChange, NsoAssignDialogComponent } from './nso-assign-dialog.component';

describe('NsoAssignDialogComponent', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  function create(product: { id: number; brand: string; name: string; nsoCode?: string | null; status?: any }) {
    const fixture = TestBed.createComponent(NsoAssignDialogComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const changes: NsoAssignChange[] = [];
    let closed = 0;
    cmp.changed.subscribe((c) => changes.push(c));
    cmp.closed.subscribe(() => closed++);
    return { fixture, cmp, changes, closedCount: () => closed };
  }

  beforeEach(() => {
    api = {
      getNsoCatalog: vi.fn(() => of({ items: [], total: 0, page: 0, size: 8 })),
      assignNso: vi.fn(),
      unassignNso: vi.fn(),
      getNsoSummary: vi.fn(() => of(null)),
      getNsoIndex: vi.fn(() => of([])),
      getNsoPendingCount: vi.fn(() => of({ pending: 0 })),
    };
    TestBed.configureTestingModule({
      imports: [NsoAssignDialogComponent],
      providers: [{ provide: ApiService, useValue: api }],
    });
  });

  it('no llama al backend con un código mal escrito', () => {
    const { cmp } = create({ id: 7, brand: 'Lattafa', name: 'Yara' });
    cmp.code.set('NSOC12-25PE');
    cmp.submit();
    expect(api['assignNso']).not.toHaveBeenCalled();
    expect(cmp.error()).toContain('formato');
  });

  it('asigna un código válido (normalizado) y avisa con el estado nuevo', () => {
    api['assignNso'].mockReturnValue(of({ productId: 7, status: 'CON_NSO', nsoCode: 'NSOC70523-25PE' }));
    const { cmp, changes, closedCount } = create({ id: 7, brand: 'Lattafa', name: 'Yara' });
    cmp.code.set(' nsoc 70523-25pe ');
    cmp.submit();
    expect(api['assignNso']).toHaveBeenCalledWith(7, { code: 'NSOC70523-25PE' });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ productId: 7, action: 'assign', status: 'CON_NSO', nsoCode: 'NSOC70523-25PE' });
    expect(closedCount()).toBe(1);
    expect(TestBed.inject(NsoStateService).statusOf(7)).toBe('CON_NSO');
  });

  it('si el código no está en la lista ofrece crearlo con el nombre en aduanas', () => {
    api['assignNso']
      .mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'no está', canCreate: true } })),
      )
      .mockReturnValueOnce(of({ productId: 7, status: 'CON_NSO', nsoCode: 'NSOC70523-25CO' }));
    const { cmp, changes } = create({ id: 7, brand: 'Lattafa', name: 'Yara' });
    cmp.code.set('NSOC70523-25CO');
    cmp.submit();
    expect(cmp.createCode()).toBe('NSOC70523-25CO');
    expect(changes).toHaveLength(0);

    cmp.createForm.update((f) => ({ ...f, declaredName: 'AGUA DE PERFUME YARA', ruc: '20123456789' }));
    cmp.createAndAssign();
    expect(api['assignNso']).toHaveBeenLastCalledWith(7, {
      code: 'NSOC70523-25CO',
      createIfMissing: true,
      brand: 'Lattafa',
      declaredName: 'AGUA DE PERFUME YARA',
      ruc: '20123456789',
    });
    expect(changes[0].status).toBe('CON_NSO');
    const row = TestBed.inject(NsoStateService).rowOf(7);
    expect(row?.otherCanCountry).toBe(true);
  });

  it('quitar pide confirmación y deja el estado que devuelve el backend', () => {
    api['unassignNso'].mockReturnValue(of({ productId: 9, status: 'EN_REVISION', nsoCode: null }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { cmp, changes } = create({ id: 9, brand: 'Afnan', name: 'Supremacy', nsoCode: 'NSOC77051-25PE', status: 'CON_NSO' });
    expect(cmp.hasCode()).toBe(true);
    cmp.unassign();
    expect(confirmSpy).toHaveBeenCalled();
    expect(api['unassignNso']).toHaveBeenCalledWith(9);
    expect(changes[0]).toMatchObject({ action: 'unassign', status: 'EN_REVISION', nsoCode: null });
    confirmSpy.mockRestore();
  });

  it('si cancela la confirmación no quita nada', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { cmp } = create({ id: 9, brand: 'Afnan', name: 'Supremacy', nsoCode: 'NSOC77051-25PE', status: 'CON_NSO' });
    cmp.unassign();
    expect(api['unassignNso']).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
