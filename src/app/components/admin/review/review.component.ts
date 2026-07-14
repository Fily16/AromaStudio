import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe, SlicePipe, NgTemplateOutlet } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { MatchCandidate } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';

/**
 * Cola de revisión: el backend PROPONE (posibles duplicados, typos de código de
 * barras, atributos contradictorios) y el admin DECIDE. Aceptar fusiona el
 * duplicado dentro del canónico (pedidos, stock y promos se re-apuntan solos);
 * rechazar marca que son productos distintos y no se vuelve a proponer.
 */
@Component({
  selector: 'app-admin-review',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, NgTemplateOutlet, CdnImgPipe],
  template: `
    <div class="rev-head">
      <h2 class="adm-section-title">Revisión de duplicados</h2>
      <div class="rev-actions">
        <button class="adm-btn" (click)="scan()" [disabled]="scanning()">
          {{ scanning() ? 'Escaneando…' : '↻ Re-escanear catálogo' }}
        </button>
      </div>
    </div>
    <p class="rev-sub">
      El sistema detecta perfumes que probablemente son EL MISMO producto (nombres distintos entre
      proveedores, códigos con un dígito mal tipeado). Nada se fusiona solo: tú decides cada caso.
    </p>

    <!-- Filtros por tipo -->
    <div class="rev-tabs">
      @for (t of tabs; track t.kind) {
        <button class="rev-tab" [class.on]="kind() === t.kind" (click)="setKind(t.kind)">
          {{ t.label }}
          @if (countFor(t.kind) > 0) { <span class="rev-count">{{ countFor(t.kind) }}</span> }
        </button>
      }
    </div>

    @if (msg()) { <p class="rev-ok">{{ msg() }}</p> }
    @if (err()) { <p class="rev-err">{{ err() }}</p> }

    @if (loading()) {
      <p class="rev-empty">Cargando…</p>
    } @else if (filtered().length === 0) {
      <div class="adm-card adm-card-pad rev-empty">
        <b>🎉 Nada pendiente.</b>
        <p>Los imports nuevos agregarán candidatos aquí automáticamente cuando algo parezca duplicado.</p>
      </div>
    }

    @for (c of filtered(); track c.id) {
      <div class="adm-card rev-card">
        <div class="rev-card-head">
          <span class="rev-kind" [class]="'k-' + c.kind">{{ kindLabel(c.kind) }}</span>
          @if (c.score != null) { <span class="rev-score">similitud {{ c.score * 100 | number:'1.0-0' }}%</span> }
          <span class="rev-date">{{ c.createdAt | slice:0:10 }}</span>
        </div>

        @if (c.kind === 'ATTR_CONFLICT') {
          <!-- Mismo código, atributos contradictorios: solo informativo -->
          <div class="rev-attr">
            @if (c.target) {
              <div class="rev-prod">
                @if (c.target.imageUrl) { <img [src]="c.target.imageUrl | cdnImg:120" alt="" /> }
                <div>
                  <b>{{ c.target.brand }} {{ c.target.name }}</b>
                  <small>{{ c.target.ml ? c.target.ml + 'ml · ' : '' }}GTIN {{ c.target.gtin || '—' }}</small>
                </div>
              </div>
            }
            <ul class="rev-reasons">@for (r of c.reasons; track r) { <li>{{ r }}</li> }</ul>
            <div class="rev-btns">
              <button class="adm-btn primary sm" (click)="accept(c)" [disabled]="busyId() === c.id">Entendido, mantener así</button>
            </div>
          </div>
        } @else {
          <!-- Par de productos: el de la izquierda se fusionaría DENTRO del de la derecha -->
          <div class="rev-pair">
            <div class="rev-side">
              <span class="rev-side-tag dup">Duplicado (se fusiona)</span>
              @if (c.source) { <ng-container *ngTemplateOutlet="prod; context: { $implicit: c.source }" /> }
            </div>
            <div class="rev-arrow">→</div>
            <div class="rev-side">
              <span class="rev-side-tag canon">Canónico (se conserva)</span>
              @if (c.target) { <ng-container *ngTemplateOutlet="prod; context: { $implicit: c.target }" /> }
            </div>
          </div>

          @if (c.offer) {
            <p class="rev-offer">
              Origen: oferta de <b>{{ c.offer.supplierName }}</b>
              @if (c.offer.rawTitle) { — “{{ c.offer.rawTitle }}” }
              @if (c.offer.gtinStatus === 'CHECKSUM_FAIL') {
                <span class="rev-quarantine">código en cuarentena: {{ c.offer.gtinRaw }}</span>
              }
            </p>
          }
          <ul class="rev-reasons">@for (r of c.reasons; track r) { <li>{{ r }}</li> }</ul>

          <div class="rev-btns">
            <button class="adm-btn primary sm" (click)="accept(c)" [disabled]="busyId() === c.id">
              {{ busyId() === c.id ? 'Fusionando…' : '✓ Es el mismo — fusionar' }}
            </button>
            <button class="adm-btn sm" (click)="reject(c)" [disabled]="busyId() === c.id">
              ✗ Son distintos
            </button>
          </div>
        }
      </div>
    }

    <ng-template #prod let-p>
      <div class="rev-prod">
        @if (p.imageUrl) { <img [src]="p.imageUrl | cdnImg:160" alt="" /> }
        @else { <div class="rev-noimg">sin foto</div> }
        <div>
          <b>{{ p.brand }} {{ p.name }}</b>
          <small>{{ p.ml ? p.ml + 'ml' : 'ml —' }} · SKU {{ p.sku }}</small>
          <small>GTIN {{ p.gtin || '— (sin código confiable)' }}</small>
          @if (p.pricePen != null) { <small>Precio S/ {{ p.pricePen | number:'1.0-0' }}</small> }
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .rev-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .rev-sub { color: var(--a-muted); font-size:.88rem; margin: 4px 0 16px; max-width: 720px; }
    .rev-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
    .rev-tab { border:1px solid var(--a-line); background:var(--a-surface); border-radius:999px;
      padding:6px 14px; font-size:.83rem; cursor:pointer; display:flex; gap:6px; align-items:center; }
    .rev-tab.on { background: var(--a-accent); color:#fff; border-color: var(--a-accent); }
    .rev-count { background:#e15252; color:#fff; border-radius:999px; padding:0 7px; font-size:.7rem; font-weight:700; }
    .rev-ok { color: var(--a-ok); font-weight:600; }
    .rev-err { color:#e15252; font-weight:600; }
    .rev-empty { color: var(--a-muted); margin-top: 8px; }
    .rev-card { padding: 16px 18px; margin-bottom: 14px; }
    .rev-card-head { display:flex; align-items:center; gap:10px; margin-bottom: 12px; }
    .rev-kind { font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
      padding:3px 9px; border-radius:999px; background:#eef; color:#3949ab; }
    .rev-kind.k-GTIN_TYPO { background:#fff3e0; color:#e65100; }
    .rev-kind.k-DEDUP_SCAN { background:#e8f5e9; color:#2e7d32; }
    .rev-kind.k-ATTR_CONFLICT { background:#fce4ec; color:#c2185b; }
    .rev-score { font-size:.78rem; color:var(--a-muted); }
    .rev-date { margin-left:auto; font-size:.75rem; color:var(--a-muted); }
    .rev-pair { display:grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items:stretch; }
    @media (max-width: 720px) { .rev-pair { grid-template-columns: 1fr; } .rev-arrow { transform: rotate(90deg); } }
    .rev-side { border:1px solid var(--a-line); border-radius: var(--a-r-sm); padding: 10px 12px; }
    .rev-side-tag { display:inline-block; font-size:.68rem; font-weight:700; text-transform:uppercase;
      letter-spacing:.05em; margin-bottom:8px; padding: 2px 8px; border-radius:999px; }
    .rev-side-tag.dup { background:#ffebee; color:#c62828; }
    .rev-side-tag.canon { background:#e8f5e9; color:#2e7d32; }
    .rev-arrow { display:flex; align-items:center; font-size:1.4rem; color:var(--a-muted); }
    .rev-prod { display:flex; gap:12px; align-items:flex-start; }
    .rev-prod img { width:64px; height:64px; object-fit:contain; border-radius:8px; background:#fff; border:1px solid var(--a-line); }
    .rev-noimg { width:64px; height:64px; border-radius:8px; background:var(--a-surface-2);
      display:flex; align-items:center; justify-content:center; font-size:.65rem; color:var(--a-muted); }
    .rev-prod b { display:block; font-size:.92rem; }
    .rev-prod small { display:block; color:var(--a-muted); font-size:.76rem; margin-top:2px; }
    .rev-offer { font-size:.82rem; color:var(--a-muted); margin:10px 0 0; }
    .rev-quarantine { margin-left:8px; background:#fff3e0; color:#e65100; padding:2px 8px; border-radius:999px; font-size:.72rem; font-weight:600; }
    .rev-reasons { margin: 10px 0 0 16px; font-size:.8rem; color: var(--a-muted); }
    .rev-btns { display:flex; gap:10px; margin-top: 14px; }
    .rev-attr { }
  `]
})
export class ReviewComponent implements OnInit {
  private api = inject(ApiService);

  candidates = signal<MatchCandidate[]>([]);
  loading = signal(false);
  scanning = signal(false);
  busyId = signal<number | null>(null);
  msg = signal('');
  err = signal('');
  kind = signal<string>('');

  tabs = [
    { kind: '', label: 'Todos' },
    { kind: 'L2_IMPORT', label: 'Del último import' },
    { kind: 'DEDUP_SCAN', label: 'Del catálogo' },
    { kind: 'GTIN_TYPO', label: 'Typos de código' },
    { kind: 'ATTR_CONFLICT', label: 'Atributos raros' },
  ];

  filtered = computed(() => {
    const k = this.kind();
    return k ? this.candidates().filter(c => c.kind === k) : this.candidates();
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.err.set('');
    this.api.getMatchCandidates('PENDING').subscribe({
      next: (list) => { this.loading.set(false); this.candidates.set(list); },
      error: (e) => { this.loading.set(false); this.err.set(e.error?.message || 'No se pudo cargar la cola.'); }
    });
  }

  setKind(k: string) { this.kind.set(k); }
  countFor(k: string) {
    return k ? this.candidates().filter(c => c.kind === k).length : this.candidates().length;
  }
  kindLabel(k: string) {
    return this.tabs.find(t => t.kind === k)?.label ?? k;
  }

  scan() {
    this.scanning.set(true); this.msg.set(''); this.err.set('');
    this.api.scanDuplicates().subscribe({
      next: (r) => {
        this.scanning.set(false);
        this.msg.set(`✓ Escaneo listo: ${r.candidatesCreated} candidatos nuevos (${r.pending} pendientes).`);
        this.load();
      },
      error: (e) => { this.scanning.set(false); this.err.set(e.error?.message || 'No se pudo escanear.'); }
    });
  }

  accept(c: MatchCandidate) {
    const isMerge = c.source && c.target;
    if (isMerge && !confirm(
      `Fusionar "${c.source!.brand} ${c.source!.name}" DENTRO de "${c.target!.brand} ${c.target!.name}".\n` +
      `Pedidos, stock y promociones se re-apuntan al canónico. El duplicado queda archivado (no se borra).\n¿Continuar?`)) return;
    this.busyId.set(c.id); this.msg.set(''); this.err.set('');
    this.api.acceptMatchCandidate(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.msg.set(isMerge ? '✓ Fusionado. El catálogo ya quedó limpio.' : '✓ Marcado como visto.');
        this.candidates.update(l => l.filter(x => x.id !== c.id));
      },
      error: (e) => { this.busyId.set(null); this.err.set(e.error?.message || e.error?.error || 'No se pudo aceptar.'); }
    });
  }

  reject(c: MatchCandidate) {
    this.busyId.set(c.id); this.msg.set(''); this.err.set('');
    this.api.rejectMatchCandidate(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.msg.set('✓ Marcados como productos distintos. No se volverá a proponer este par.');
        this.candidates.update(l => l.filter(x => x.id !== c.id));
      },
      error: (e) => { this.busyId.set(null); this.err.set(e.error?.message || 'No se pudo rechazar.'); }
    });
  }
}
