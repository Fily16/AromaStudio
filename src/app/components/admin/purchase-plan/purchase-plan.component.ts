import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { AllocationResponse, PurchasePlan, MarginReportRow, MarginWarning } from '../../../models/api.models';
import { NsoStatusInfo, nsoStatusInfo } from '../../../shared/nso-labels';
import { nsoBlockedSummary } from '../orders/nso-blocked.util';
import { unavailableIdsFrom } from '../../../shared/unavailable-items.util';

/**
 * Plan de compra del consolidado activo: el optimizador decide a qué proveedor
 * comprar cada perfume respetando los mínimos (Zimaxx $2000, FragranceSense 48 uds)
 * y responde la pregunta clave: ¿FORZAR un mínimo (moviendo compras caras) o
 * SALTAR ese proveedor este ciclo? Al CONFIRMAR, la ganancia del consolidado se
 * calcula contra el costo real elegido, y la guardia de margen avisa si alguna
 * venta quedaría por debajo del piso.
 */
@Component({
  selector: 'app-admin-purchase-plan',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <div class="pp-head">
      <h2 class="adm-section-title">Plan de compra</h2>
      <div class="pp-actions">
        <button class="adm-btn primary" (click)="compute()" [disabled]="computing() || consolidadoId() == null">
          {{ computing() ? 'Calculando…' : '⚙ Calcular plan' }}
        </button>
      </div>
    </div>
    <p class="pp-sub">
      Con los pedidos aceptados del consolidado activo, el sistema asigna cada perfume al mejor
      proveedor respetando los mínimos de compra y tu margen. Nada se compra solo: calcula,
      revisa y confirma.
    </p>

    @if (msg()) { <p class="pp-ok">{{ msg() }}</p> }
    @if (err()) { <p class="pp-err">{{ err() }}</p> }
    <!-- El borrador quedó viejo (perfumes que ya no se pueden comprar): hay que volver a calcularlo -->
    @if (planStale()) {
      <div class="pp-stale adm-card adm-card-pad" role="alert">
        <span>Este borrador ya no sirve: vuelve a calcular el plan para dejar fuera esos perfumes.</span>
        <button class="adm-btn primary sm" (click)="compute()" [disabled]="computing() || consolidadoId() == null">
          {{ computing() ? 'Calculando…' : '↻ Recalcular plan' }}
        </button>
      </div>
    }

    <!-- Plan vigente -->
    @if (currentPlan(); as plan) {
      <div class="adm-card adm-card-pad pp-current">
        <b>Plan vigente:</b>
        <span class="pp-status" [class]="'st-' + plan.status">{{ plan.status === 'CONFIRMED' ? 'CONFIRMADO' : 'BORRADOR' }}</span>
        · total {{ plan.totalUsd | number:'1.2-2' }} USD
        @if (plan.extraCostUsd != null && plan.extraCostUsd > 0) {
          <span class="pp-extra">(+{{ plan.extraCostUsd | number:'1.2-2' }} por mínimos)</span>
        }
        @if (plan.status === 'CONFIRMED') {
          <span class="pp-note">La ganancia del consolidado ya usa estos costos reales.</span>
        }
      </div>
    }

    @if (result(); as r) {
      <!-- Resumen -->
      <div class="pp-grid">
        <div class="adm-card pp-stat"><b>{{ r.baselineTotalUsd | number:'1.2-2' }}</b><span>USD si todo al más barato</span></div>
        <div class="adm-card pp-stat"><b>{{ r.chosenTotalUsd | number:'1.2-2' }}</b><span>USD del plan elegido</span></div>
        <div class="adm-card pp-stat" [class.warn]="r.extraCostUsd > 0"><b>{{ r.extraCostUsd | number:'1.2-2' }}</b><span>sobrecosto por mínimos</span></div>
        <div class="adm-card pp-stat" [class.warn]="r.marginWarnings.length > 0"><b>{{ r.marginWarnings.length }}</b><span>avisos de margen</span></div>
      </div>

      <!-- Decisión FORZAR / SALTAR por proveedor con mínimo -->
      @if (r.skipAnalysis.length) {
        <h3 class="pp-h3">¿Forzar el mínimo o saltar el proveedor?</h3>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Proveedor</th><th class="num">Costo si FUERZO su mínimo</th><th class="num">Costo si lo SALTO</th><th>Decisión del plan</th></tr></thead>
            <tbody>
              @for (d of r.skipAnalysis; track d.supplierId) {
                <tr>
                  <td><b>{{ d.name }}</b></td>
                  <td class="num">{{ d.forceTotalUsd != null ? (d.forceTotalUsd | number:'1.2-2') : '—' }}</td>
                  <td class="num">{{ d.skipTotalUsd != null ? (d.skipTotalUsd | number:'1.2-2') : '—' }}</td>
                  <td><span class="pp-decision" [class.force]="d.decision === 'FORZAR'">{{ d.decision }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="pp-hint">El costo incluye penalidades: relleno de tienda para llegar al mínimo y ventas que se perderían al saltar.</p>
      }

      <!-- Avisos de margen -->
      @if (r.marginWarnings.length) {
        <div class="pp-warnbox adm-card adm-card-pad">
          <b>⚠ Ventas bajo el piso de margen</b>
          <p>Estos perfumes ya se vendieron a un precio que, con el costo del proveedor asignado, deja menos de S/{{ r.marginWarnings[0].floorPen | number:'1.0-0' }} por unidad:</p>
          <ul>
            @for (w of r.marginWarnings; track w.productId) {
              <li>{{ w.name }} — margen S/ {{ w.marginPen | number:'1.2-2' }} ({{ w.supplierName }})</li>
            }
          </ul>
          <p class="pp-hint">Puedes confirmar igual (botón forzar) o revisar precios/proveedor antes.</p>
        </div>
      }

      <!-- Ventas perdidas -->
      @if (r.lostSales.length) {
        <div class="pp-lostbox adm-card adm-card-pad">
          <b>✗ Ventas que se perderían con este plan</b>
          <ul>
            @for (ls of r.lostSales; track ls.productId) {
              <li>{{ ls.name }} × {{ ls.quantity }} — {{ ls.reason }}</li>
            }
          </ul>
        </div>
      }

      <!-- Carritos por proveedor -->
      <h3 class="pp-h3">Qué comprar a cada proveedor</h3>
      @for (s of r.suppliers; track s.supplierId) {
        <div class="adm-card pp-supplier">
          <div class="pp-sup-head">
            <b>{{ s.name }}</b>
            <span class="pp-sup-total">{{ s.subtotalUsd | number:'1.2-2' }} USD</span>
            @if (s.minOrderUsd > 0) {
              <span class="pp-min" [class.ok]="s.reachedMin">
                mínimo \${{ s.minOrderUsd | number:'1.0-0' }} {{ s.reachedMin ? '✓ alcanzado' : '✗ no llega' }}
              </span>
            }
          </div>
          <div class="adm-table-wrap">
            <table class="adm-table">
              <thead><tr><th>Perfume</th><th class="num">Cant.</th><th class="num">Costo u. $</th><th class="num">Subtotal $</th><th></th></tr></thead>
              <tbody>
                @for (l of s.lines; track l.productId) {
                  <tr>
                    <td>{{ l.brand }} {{ l.name }} {{ l.ml ? l.ml + 'ml' : '' }}</td>
                    <td class="num">{{ l.quantity }}</td>
                    <td class="num">{{ l.unitCostUsd | number:'1.2-2' }}</td>
                    <td class="num">{{ l.subtotalUsd | number:'1.2-2' }}</td>
                    <td>
                      @if (l.movedToReachMin) {
                        <span class="pp-moved" title="No era el más barato: se movió aquí para llegar al mínimo (+{{ l.penaltyUsd | number:'1.2-2' }} $/u)">
                          movido (+{{ l.penaltyUsd | number:'1.2-2' }})
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Sugerencias de relleno -->
      @if (r.storeFillSuggestions.length) {
        <h3 class="pp-h3">Relleno sugerido para llegar al mínimo (compra para tienda)</h3>
        <p class="pp-hint">Faltan \${{ r.zimaxxGapUsd | number:'1.2-2' }}. Estos productos del proveedor prioritario son buenos candidatos (agrégalos desde «Compra para tienda»):</p>
        <div class="pp-fill">
          @for (f of r.storeFillSuggestions; track f.productId) {
            <span class="pp-fill-item">{{ f.brand }} {{ f.name }} · \${{ f.costUsd | number:'1.2-2' }}</span>
          }
        </div>
      }

      @if (r.unfulfillable.length) {
        <div class="pp-lostbox adm-card adm-card-pad">
          <b>Sin proveedor con stock</b>
          <ul>@for (u of r.unfulfillable; track u.productId) { <li>{{ u.brand }} {{ u.name }}</li> }</ul>
        </div>
      }

      <!-- Perfumes pedidos sin NSO: el plan no los compra -->
      @if (r.nsoBlocked?.length) {
        <div class="pp-nsobox adm-card adm-card-pad">
          <b>⛔ No se puede importar ({{ r.nsoBlocked!.length }}) · {{ blockedUnits(r) }} unidades</b>
          <p class="pp-hint" style="margin-top:4px">
            No tienen NSO confirmado: este plan no los compra. Para avisar a los clientes, ve a
            <a routerLink="/admin">Pedidos</a> → «Ver qué comprar» (con el consolidado cerrado). Si consigues su NSO,
            revísalo en <a routerLink="/admin/nso">NSO</a> y vuelve a calcular.
          </p>
          <ul>
            @for (b of r.nsoBlocked!; track b.productId) {
              <li>
                {{ b.brand }} {{ b.name }}@if (b.ml) { · {{ b.ml }}ml } × {{ b.quantity }}
                <span [class]="'adm-st ' + nsoInfo(b.status).color" [title]="nsoInfo(b.status).hint">{{ nsoInfo(b.status).label }}</span>
              </li>
            }
          </ul>
        </div>
      }

      @if (r.notes.length) {
        <ul class="pp-notes">@for (n of r.notes; track n) { <li>{{ n }}</li> }</ul>
      }

      <!-- Confirmación -->
      @if (r.planId != null) {
        <div class="pp-confirm">
          <button class="adm-btn primary" (click)="confirm(false)" [disabled]="confirming() || planStale()">
            {{ confirming() ? 'Confirmando…' : '✓ Confirmar plan (usar estos costos reales)' }}
          </button>
          @if (needsForce()) {
            <button class="adm-btn danger" (click)="confirm(true)" [disabled]="confirming() || planStale()">
              Confirmar IGUAL con margen bajo
            </button>
          }
        </div>
      }
    }

    <!-- Reporte de margen -->
    <div class="pp-head" style="margin-top:28px">
      <h3 class="pp-h3" style="margin:0">Margen por perfume (ingreso cobrado vs costo)</h3>
      <button class="adm-btn sm" (click)="loadMargin()" [disabled]="marginLoading() || consolidadoId() == null">
        {{ marginLoading() ? 'Cargando…' : '↻ Actualizar' }}
      </button>
    </div>
    @if (margin().length) {
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr>
            <th>Perfume</th><th class="num">Cant.</th><th class="num">Precio S/</th>
            <th class="num">Costo $</th><th class="num">Puesto en Perú S/</th><th class="num">Margen S/u</th><th>Fuente del costo</th>
          </tr></thead>
          <tbody>
            @for (m of margin(); track m.productId) {
              <tr [class.below]="m.belowFloor">
                <td>{{ m.name }}</td>
                <td class="num">{{ m.quantity }}</td>
                <td class="num">{{ m.avgUnitPricePen != null ? (m.avgUnitPricePen | number:'1.0-0') : '—' }}</td>
                <td class="num">{{ m.unitCostUsd != null ? (m.unitCostUsd | number:'1.2-2') : '—' }}</td>
                <td class="num">{{ m.landedPen != null ? (m.landedPen | number:'1.0-0') : '—' }}</td>
                <td class="num" [class.neg]="m.marginPen != null && m.marginPen < 0">
                  {{ m.marginPen != null ? (m.marginPen | number:'1.1-1') : '—' }}
                  @if (m.belowFloor) { ⚠ }
                </td>
                <td><small>{{ m.costSource === 'PLAN_CONFIRMADO' ? 'Plan confirmado' : 'Base actual' }}</small></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!marginLoading()) {
      <p class="pp-hint">Pulsa «Actualizar» para ver el margen de cada perfume del consolidado.</p>
    }
  `,
  styles: [`
    .pp-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .pp-sub { color:var(--a-muted); font-size:.88rem; margin:4px 0 16px; max-width:760px; }
    .pp-ok { color: var(--a-ok); font-weight:600; }
    .pp-err { color:#e15252; font-weight:600; white-space:pre-line; }
    .pp-current { margin-bottom:16px; font-size:.9rem; }
    .pp-status { font-weight:700; padding:2px 10px; border-radius:999px; font-size:.72rem; margin:0 6px; }
    .pp-status.st-CONFIRMED { background:#e8f5e9; color:#2e7d32; }
    .pp-status.st-DRAFT { background:#fff8e1; color:#f57f17; }
    .pp-extra { color:#e65100; font-weight:600; margin-left:6px; }
    .pp-note { display:block; color:var(--a-muted); font-size:.8rem; margin-top:4px; }
    .pp-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px; margin-bottom:18px; }
    .pp-stat { padding:14px 16px; text-align:center; }
    .pp-stat b { display:block; font-size:1.3rem; }
    .pp-stat span { color:var(--a-muted); font-size:.76rem; }
    .pp-stat.warn b { color:#e65100; }
    .pp-h3 { font-size:1rem; font-weight:700; margin:22px 0 10px; }
    .pp-decision { font-weight:700; padding:3px 10px; border-radius:999px; background:#e8f5e9; color:#2e7d32; font-size:.75rem; }
    .pp-decision.force { background:#e3f2fd; color:#1565c0; }
    .pp-hint { color:var(--a-muted); font-size:.8rem; margin-top:6px; }
    .pp-warnbox { border-left:4px solid #f9a825; margin:14px 0; }
    .pp-warnbox ul, .pp-lostbox ul { margin:8px 0 0 18px; font-size:.85rem; }
    .pp-lostbox { border-left:4px solid #e15252; margin:14px 0; }
    .pp-nsobox { border-left:4px solid #e15252; margin:14px 0; background:#fff7f8; }
    .pp-nsobox ul { margin:8px 0 0 18px; font-size:.85rem; display:flex; flex-direction:column; gap:4px; }
    .pp-nsobox .adm-st { font-size:.68rem; padding:2px 7px; margin-left:4px; }
    .pp-nsobox a { color:var(--a-accent-700); font-weight:600; text-decoration:underline; }
    .pp-supplier { padding:14px 16px; margin-bottom:14px; }
    .pp-sup-head { display:flex; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
    .pp-sup-total { font-weight:700; }
    .pp-min { font-size:.76rem; padding:3px 10px; border-radius:999px; background:#ffebee; color:#c62828; }
    .pp-min.ok { background:#e8f5e9; color:#2e7d32; }
    .pp-moved { font-size:.72rem; background:#e3f2fd; color:#1565c0; padding:2px 8px; border-radius:999px; }
    .pp-fill { display:flex; flex-wrap:wrap; gap:8px; }
    .pp-fill-item { border:1px solid var(--a-line); border-radius:999px; padding:4px 12px; font-size:.8rem; background:var(--a-surface); }
    .pp-notes { margin:14px 0 0 18px; color:var(--a-muted); font-size:.82rem; }
    .pp-confirm { display:flex; gap:12px; margin-top:20px; flex-wrap:wrap; }
    .pp-stale { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
      border-left:4px solid #e15252; background:#fff7f8; margin:0 0 16px; font-size:.88rem; }
    .adm-table tr.below td { background:#fff8e1; }
    .adm-table td.neg { color:#c62828; font-weight:700; }
  `]
})
export class PurchasePlanComponent implements OnInit {
  private api = inject(ApiService);

  consolidadoId = signal<number | null>(null);
  result = signal<AllocationResponse | null>(null);
  currentPlan = signal<PurchasePlan | null>(null);
  margin = signal<MarginReportRow[]>([]);
  computing = signal(false);
  confirming = signal(false);
  marginLoading = signal(false);
  needsForce = signal(false);
  /** Confirmar respondió 400 con perfumes que ya no se pueden comprar: el borrador está viejo. */
  planStale = signal(false);
  msg = signal('');
  err = signal('');

  nsoInfo(status: string | null | undefined): NsoStatusInfo { return nsoStatusInfo(status); }
  blockedUnits(r: AllocationResponse): number { return nsoBlockedSummary(r.nsoBlocked).units; }

  ngOnInit() {
    this.api.getActiveConsolidado().subscribe({
      next: (c) => {
        this.consolidadoId.set(c?.id ?? null);
        if (c?.id != null) this.loadCurrentPlan(c.id);
      },
      error: () => this.err.set('No hay consolidado activo.')
    });
  }

  private loadCurrentPlan(cid: number) {
    this.api.getCurrentPurchasePlan(cid).subscribe({
      next: (p: any) => this.currentPlan.set(p && p.id ? p : null),
      error: () => {}
    });
  }

  compute() {
    const cid = this.consolidadoId();
    if (cid == null) return;
    this.computing.set(true); this.msg.set(''); this.err.set(''); this.needsForce.set(false); this.planStale.set(false);
    this.api.computePurchasePlan(cid).subscribe({
      next: (r) => {
        this.computing.set(false);
        this.result.set(r);
        this.msg.set('Plan calculado (borrador). Revisa y confirma para fijar los costos reales.');
        this.loadCurrentPlan(cid);
      },
      error: (e) => { this.computing.set(false); this.err.set(e.error?.message || 'No se pudo calcular el plan.'); }
    });
  }

  confirm(force: boolean) {
    const cid = this.consolidadoId();
    const r = this.result();
    if (cid == null || r?.planId == null) return;
    if (force && !confirm('Vas a confirmar un plan con ventas BAJO tu piso de margen. ¿Continuar igual?')) return;
    this.confirming.set(true); this.msg.set(''); this.err.set('');
    this.api.confirmPurchasePlan(cid, r.planId, force).subscribe({
      next: (plan) => {
        this.confirming.set(false); this.needsForce.set(false);
        this.currentPlan.set(plan);
        this.msg.set('✓ Plan CONFIRMADO. La ganancia del consolidado ya usa los costos reales de compra.');
        this.loadMargin();
      },
      error: (e) => {
        this.confirming.set(false);
        if (e.status === 400 && unavailableIdsFrom(e).length) {
          // Borrador calculado antes de ocultar perfumes (filtro NSO): no se recorta en silencio,
          // se muestra el mensaje del backend y se ofrece volver a calcular.
          this.needsForce.set(false);
          this.planStale.set(true);
          this.err.set(e.error?.message || 'Este plan incluye perfumes que ya no se pueden comprar.');
        } else if (e.status === 409) {
          // Guardia de margen: el backend detalla qué líneas quedan bajo el piso.
          const warnings: MarginWarning[] = e.error?.marginWarnings ?? [];
          this.needsForce.set(true);
          this.err.set('El plan deja ventas bajo el piso de margen:\n'
            + warnings.map(w => `• ${w.name}: margen S/ ${w.marginPen}`).join('\n')
            + '\nRevisa precios o confirma igual con el botón rojo.');
        } else {
          this.err.set(e.error?.message || e.error?.error || 'No se pudo confirmar.');
        }
      }
    });
  }

  loadMargin() {
    const cid = this.consolidadoId();
    if (cid == null) return;
    this.marginLoading.set(true);
    this.api.getMarginReport(cid).subscribe({
      next: (rows) => { this.marginLoading.set(false); this.margin.set(rows); },
      error: (e) => { this.marginLoading.set(false); this.err.set(e.error?.message || 'No se pudo cargar el margen.'); }
    });
  }
}
