import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MissingItem, MissingStatus } from '../../../models/api.models';

/** Entrada del informe por-pedido (misma forma que buildUnavailableReport en OrdersComponent). */
export interface UnavailableEntry {
  order: any;
  unavailable: { label: string; qty: number }[];
  available: { label: string; qty: number }[];
  unavailableText: string; availableText: string;
  deducted: number; newDeposit: number; newTotal: number;
}

/**
 * Panel de perfumes faltantes (sin stock en ningún proveedor), clasificados:
 *  - Caso A: se compra en CristFragance (precio ya calculado) — check persistente "comprado".
 *  - Caso B: imposible de conseguir → avisar al cliente (mensaje reutilizado del padre).
 * Componente de presentación puro: el estado y las acciones viven en OrdersComponent.
 * Se usa tanto en el card de "Qué comprar" como en el modal de cierre (sin duplicar markup).
 */
@Component({
  selector: 'app-missing-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <!-- Caso A: CristFragance -->
    @if (caseA.length) {
      <h4 class="mp-h">Comprar en CristFragance ({{ counts.bought }}/{{ counts.total }} comprados)</h4>
      <p class="mp-sub">No están en los Excel pero el sistema ya tiene su precio. Marca los que ya compraste (se guarda) o pásalos a "no se consigue".</p>
      <div class="ord-detail-items" style="max-height:32vh">
        @for (mi of caseA; track mi.productId) {
          <div class="ord-miss">
            <label class="ord-miss-pick">
              <input type="checkbox" [checked]="mi.resolutionStatus === 'CRIST_BOUGHT'"
                     (change)="resolve.emit({ productId: mi.productId, status: $any($event.target).checked ? 'CRIST_BOUGHT' : 'CRIST_PENDING' })">
              <div>
                <b [style.text-decoration]="mi.resolutionStatus === 'CRIST_BOUGHT' ? 'line-through' : 'none'">{{ mi.brand }} {{ mi.name }}@if (mi.ml) { · {{ mi.ml }}ml }</b>
                <div class="mp-meta">
                  x{{ qty(mi) }}@if (mi.registeredPricePen) { · S/ {{ mi.registeredPricePen | number:'1.2-2' }} c/u }
                  · @for (o of mi.orders; track o.orderCode) { {{ o.clientName }} ({{ o.orderCode }} ×{{ o.quantity }}) }
                </div>
              </div>
            </label>
            <button class="adm-btn ghost sm" (click)="resolve.emit({ productId: mi.productId, status: 'UNAVAILABLE' })"
                    title="No se consigue ni en CristFragance">No se consigue</button>
          </div>
        }
      </div>
      <div class="ord-miss-total">Estimado CristFragance: <b>S/ {{ cristfranceTotalPen | number:'1.2-2' }}</b></div>
    }

    <!-- Caso B: imposible -> avisar al cliente -->
    @if (caseB.length) {
      <h4 class="mp-h" style="color:var(--a-danger)">Imposible de conseguir — avisar al cliente ({{ caseB.length }})</h4>
      <div class="ord-detail-items" style="max-height:20vh">
        @for (mi of caseB; track mi.productId) {
          <div class="ord-miss">
            <div>
              <b>{{ mi.brand }} {{ mi.name }}</b>
              <div class="mp-meta">x{{ qty(mi) }} · @for (o of mi.orders; track o.orderCode) { {{ o.clientName }} ({{ o.orderCode }}) }</div>
            </div>
            <button class="adm-btn ghost sm" (click)="resolve.emit({ productId: mi.productId, status: 'CRIST_PENDING' })"
                    title="Sí se consigue en CristFragance">↩ CristFragance</button>
          </div>
        }
      </div>
      @if (caseBReport.length) {
        <div class="ord-detail-items" style="max-height:26vh;margin-top:6px">
          @for (e of caseBReport; track e.order.id) {
            <div class="ord-client">
              <div>
                <b>{{ e.order.clientName }}</b> <span class="mp-meta">· {{ e.order.orderCode }} · {{ e.order.clientPhone }}</span>
                <div class="mp-meta">No hay: {{ e.unavailableText }} · devolución S/ {{ e.deducted }}</div>
              </div>
              <button class="adm-btn ok sm" (click)="notify.emit(e)">Enviar WhatsApp</button>
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .mp-h { font-weight: 700; margin: 12px 0 4px; }
    .mp-sub { color: var(--a-muted); font-size: .82rem; margin-bottom: 10px; }
    .mp-meta { font-size: .78rem; color: var(--a-muted); }
  `]
})
export class MissingPanelComponent {
  @Input() caseA: MissingItem[] = [];
  @Input() caseB: MissingItem[] = [];
  @Input() counts: { total: number; bought: number; pending: number } = { total: 0, bought: 0, pending: 0 };
  @Input() cristfranceTotalPen = 0;
  @Input() caseBReport: UnavailableEntry[] = [];

  @Output() resolve = new EventEmitter<{ productId: number; status: MissingStatus }>();
  @Output() notify = new EventEmitter<UnavailableEntry>();

  qty(mi: MissingItem): number { return mi.orders.reduce((s, o) => s + (o.quantity || 0), 0); }
}
