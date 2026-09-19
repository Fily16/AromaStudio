import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NsoStateService } from '../../../../services/nso-state.service';
import { NsoAssignRequest, NsoRecordView, NsoStatus } from '../../../../models/api.models';
import {
  countryOfNsoCode,
  isOtherCanCountry,
  isValidNsoCode,
  normalizeNsoCode,
  nsoStatusInfo,
  NsoStatusInfo,
} from '../../../../shared/nso-labels';

/** Perfume al que se le asigna, cambia o quita el código NSO. */
export interface NsoAssignProduct {
  id: number;
  brand: string;
  name: string;
  ml?: number | null;
  /** Código actual si la pantalla ya lo conoce (si no, se lee del índice NSO). */
  nsoCode?: string | null;
  /** Estado actual si la pantalla ya lo conoce (si no, se lee del índice NSO). */
  status?: NsoStatus | null;
}

/** Lo que cambió tras guardar (la pantalla actualiza sus listas y muestra `message`). */
export interface NsoAssignChange {
  productId: number;
  action: 'assign' | 'unassign';
  status: NsoStatus;
  nsoCode: string | null;
  /** Texto corto listo para un aviso («✓ … quedó con NSO …»). */
  message: string;
}

interface CreateForm {
  brand: string;
  declaredName: string;
  titular: string;
  ruc: string;
}

/**
 * Diálogo compartido «Asignar / cambiar / quitar código NSO» de un perfume.
 * Se usa en /admin/nso y en Productos. Llama al backend, actualiza NsoStateService y avisa
 * con (changed); (closed) cuando hay que ocultarlo.
 *
 * Uso: `@if (target(); as t) { <app-nso-assign-dialog [product]="t" (closed)="target.set(null)"
 * (changed)="onNsoChanged($event)" /> }`
 */
@Component({
  selector: 'app-nso-assign-dialog',
  standalone: true,
  templateUrl: './nso-assign-dialog.component.html',
  styleUrl: './nso-assign-dialog.component.css',
  host: { '(document:keydown.escape)': 'close()' },
})
export class NsoAssignDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private nso = inject(NsoStateService);

  product = input.required<NsoAssignProduct>();
  closed = output<void>();
  changed = output<NsoAssignChange>();

  private codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  code = signal('');
  search = signal('');
  results = signal<NsoRecordView[]>([]);
  searching = signal(false);
  saving = signal(false);
  removing = signal(false);
  error = signal('');
  /** El código escrito no está en la lista: se ofrece agregarlo. */
  createCode = signal<string | null>(null);
  createForm = signal<CreateForm>({ brand: '', declaredName: '', titular: '', ruc: '' });

  busy = computed(() => this.saving() || this.removing());
  codeNormalized = computed(() => normalizeNsoCode(this.code()));
  codeOk = computed(() => isValidNsoCode(this.code()));

  /** Estado y código actuales: lo que manda la pantalla o, si no, el índice NSO. */
  current = computed(() => {
    const p = this.product();
    const row = this.nso.rowOf(p.id);
    const status: NsoStatus = p.status ?? row?.status ?? 'SIN_VERIFICAR';
    const code = p.nsoCode ?? row?.nsoCode ?? null;
    return { status, code: status === 'CON_NSO' ? code : null };
  });
  hasCode = computed(() => !!this.current().code);
  currentInfo = computed<NsoStatusInfo>(() => nsoStatusInfo(this.current().status));
  currentOtherCountry = computed(() => isOtherCanCountry(countryOfNsoCode(this.current().code)));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    const p = this.product();
    this.createForm.set({ brand: p.brand ?? '', declaredName: p.name ?? '', titular: '', ruc: '' });
    this.search.set(p.brand ?? '');
    if (p.brand) this.runSearch(p.brand);
  }

  ngAfterViewInit() {
    // En escritorio el cursor queda listo en el código; en móvil no se abre el teclado solo.
    if (window.matchMedia?.('(min-width: 641px)').matches) {
      setTimeout(() => this.codeInput()?.nativeElement.focus(), 0);
    }
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  productName(): string {
    const p = this.product();
    return `${p.brand} ${p.name}${p.ml ? ' ' + p.ml + 'ml' : ''}`;
  }

  close() {
    if (this.busy()) return;
    this.closed.emit();
  }

  // ===== Escribir el código =====
  onCode(ev: Event) {
    this.code.set((ev.target as HTMLInputElement).value);
    this.error.set('');
    this.createCode.set(null);
  }

  submit(rawCode?: string) {
    if (this.busy()) return;
    const code = normalizeNsoCode(rawCode ?? this.code());
    if (!isValidNsoCode(code)) {
      this.error.set('El código no tiene el formato correcto. Ejemplo: NSOC70523-25PE');
      return;
    }
    if (code === this.current().code) {
      this.error.set(`${code} ya es el código de este perfume.`);
      return;
    }
    this.assign({ code });
  }

  // ===== Buscar en la lista NSO =====
  onSearch(ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.search.set(v);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.runSearch(v);
    }, 350);
  }

  private runSearch(q: string) {
    const term = q.trim();
    if (term.length < 2) {
      this.searching.set(false);
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    this.api.getNsoCatalog({ q: term, page: 0, size: 8 }).subscribe({
      next: (page) => {
        // Si la usuaria siguió escribiendo, esta respuesta ya no sirve.
        if (this.search().trim() !== term) return;
        this.searching.set(false);
        this.results.set(page?.items ?? []);
      },
      error: () => this.searching.set(false),
    });
  }

  // ===== El código no existe: agregarlo y asignarlo =====
  setCreate(field: keyof CreateForm, ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.createForm.update((f) => ({ ...f, [field]: v }));
    this.error.set('');
  }

  cancelCreate() {
    this.createCode.set(null);
    this.error.set('');
  }

  createAndAssign() {
    const code = this.createCode();
    if (!code || this.busy()) return;
    const f = this.createForm();
    if (!f.brand.trim() || !f.declaredName.trim()) {
      this.error.set('Escribe la marca y el nombre en aduanas, como figuran en el NSO.');
      return;
    }
    this.assign({
      code,
      createIfMissing: true,
      brand: f.brand.trim(),
      declaredName: f.declaredName.trim(),
      ...(f.titular.trim() ? { titular: f.titular.trim() } : {}),
      ...(f.ruc.trim() ? { ruc: f.ruc.trim() } : {}),
    });
  }

  private assign(body: NsoAssignRequest) {
    const p = this.product();
    this.saving.set(true);
    this.error.set('');
    this.api.assignNso(p.id, body).subscribe({
      next: (r) => {
        this.saving.set(false);
        const code = r.nsoCode ?? body.code;
        const country = countryOfNsoCode(code);
        this.nso.patchIndex(p.id, {
          status: 'CON_NSO',
          nsoCode: code,
          matchedBy: 'MANUAL',
          locked: true,
          score: null,
          country,
          otherCanCountry: isOtherCanCountry(country),
        });
        this.nso.afterChange();
        this.changed.emit({
          productId: p.id,
          action: 'assign',
          status: 'CON_NSO',
          nsoCode: code,
          message: `✓ «${this.productName()}» quedó con NSO ${code}.`,
        });
        this.closed.emit();
      },
      error: (e) => {
        this.saving.set(false);
        if (e?.status === 404 && e?.error?.canCreate) {
          this.createCode.set(body.code);
        } else {
          this.error.set(this.errMsg(e, 'No se pudo asignar el código.'));
        }
      },
    });
  }

  // ===== Quitar el NSO =====
  unassign() {
    const cur = this.current();
    if (!cur.code || this.busy()) return;
    const hiddenNote = this.nso.gateEffective() ? '\nMientras no tenga NSO, no se verá en tu tienda.' : '';
    if (
      !confirm(
        `¿Quitar el NSO ${cur.code} de «${this.productName()}»?\n\nSe volverá a verificar solo con tu lista.${hiddenNote}`,
      )
    )
      return;
    const p = this.product();
    this.removing.set(true);
    this.error.set('');
    this.api.unassignNso(p.id).subscribe({
      next: (r) => {
        this.removing.set(false);
        const code = r.nsoCode ?? null;
        const country = countryOfNsoCode(code);
        this.nso.patchIndex(p.id, {
          status: r.status,
          nsoCode: code,
          matchedBy: null,
          locked: false,
          country,
          otherCanCountry: isOtherCanCountry(country),
        });
        this.nso.afterChange();
        this.changed.emit({
          productId: p.id,
          action: 'unassign',
          status: r.status,
          nsoCode: code,
          message: `Listo: «${this.productName()}» ahora está en «${nsoStatusInfo(r.status).label}».`,
        });
        this.closed.emit();
      },
      error: (e) => {
        this.removing.set(false);
        this.error.set(this.errMsg(e, 'No se pudo quitar el NSO.'));
      },
    });
  }

  private errMsg(e: any, fallback: string): string {
    if (e?.status === 0) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    if (e?.status === 401 || e?.status === 403) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    return e?.error?.message || fallback;
  }
}
