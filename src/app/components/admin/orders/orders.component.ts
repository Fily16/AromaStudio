import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Order, Consolidado, FullBreakdownResponse } from '../../../models/api.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);

  orders = signal<Order[]>([]);
  consolidados = signal<Consolidado[]>([]);
  filter = signal<string>('');
  loading = signal(false);
  message = signal('');
  breakdown = signal<FullBreakdownResponse | null>(null);
  breakdownConsolidadoId = signal<number | null>(null);

  // Search by code
  searchCode = signal('');
  searchResult = signal<Order | null>(null);
  searchError = signal('');

  // Inline Yape reference input
  activeActionOrderId = signal<number | null>(null);
  activeActionType = signal<'deposit' | 'rest' | null>(null);
  yapeRefInput = signal('');

  ngOnInit() {
    this.loadOrders();
    this.api.getConsolidados().subscribe(c => this.consolidados.set(c));
  }

  loadOrders() {
    this.loading.set(true);
    const status = this.filter() || undefined;
    this.api.getOrders(status).subscribe({
      next: (o) => { this.orders.set(o); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // --- Search by code ---
  searchByCode() {
    const code = this.searchCode().trim().toUpperCase();
    if (!code) return;
    this.searchError.set('');
    this.searchResult.set(null);
    this.api.getOrderByCode(code).subscribe({
      next: (order) => this.searchResult.set(order),
      error: () => this.searchError.set('No se encontró pedido con código: ' + code)
    });
  }

  clearSearch() {
    this.searchCode.set('');
    this.searchResult.set(null);
    this.searchError.set('');
  }

  // --- Payment actions ---
  startAction(orderId: number, type: 'deposit' | 'rest') {
    this.activeActionOrderId.set(orderId);
    this.activeActionType.set(type);
    this.yapeRefInput.set('');
  }

  cancelAction() {
    this.activeActionOrderId.set(null);
    this.activeActionType.set(null);
    this.yapeRefInput.set('');
  }

  confirmAction() {
    const orderId = this.activeActionOrderId();
    const type = this.activeActionType();
    const ref = this.yapeRefInput();
    if (!orderId || !type) return;

    const obs = type === 'deposit'
      ? this.api.verifyDeposit(orderId, ref)
      : this.api.verifyRestPayment(orderId, ref);

    obs.subscribe({
      next: () => {
        this.cancelAction();
        this.loadOrders();
        this.showMessage(type === 'deposit' ? 'Separación verificada' : 'Pago final verificado');
      },
      error: () => this.showMessage('Error al verificar pago')
    });
  }

  reject(orderId: number) {
    if (confirm('¿Rechazar este pedido?')) {
      this.api.rejectPayment(orderId).subscribe(() => {
        this.loadOrders();
        this.showMessage('Pedido rechazado');
      });
    }
  }

  // --- Consolidado management ---
  closeConsolidado(id: number) {
    if (confirm('¿Cerrar este consolidado? No se podrán agregar más pedidos.')) {
      this.api.closeConsolidado(id).subscribe(() => {
        this.api.getConsolidados().subscribe(c => this.consolidados.set(c));
        this.showMessage('Consolidado cerrado');
      });
    }
  }

  enableMerchandise(consolidadoId: number) {
    if (confirm('¿Habilitar mercancía? Esto moverá los productos de tienda al inventario y habilitará el segundo pago para clientes.')) {
      this.api.enableMerchandise(consolidadoId).subscribe({
        next: () => {
          this.api.getConsolidados().subscribe(c => this.consolidados.set(c));
          this.loadOrders();
          this.showMessage('Mercancía habilitada. Stock de tienda agregado al inventario. Segundo pago habilitado para clientes.');
        },
        error: () => this.showMessage('Error al habilitar mercancía')
      });
    }
  }

  // --- Filters ---
  onFilterChange(event: Event) {
    this.filter.set((event.target as HTMLSelectElement).value);
    this.loadOrders();
  }

  onSearchInput(event: Event) {
    this.searchCode.set((event.target as HTMLInputElement).value);
  }

  onYapeRefInput(event: Event) {
    this.yapeRefInput.set((event.target as HTMLInputElement).value);
  }

  // --- Breakdown ---
  toggleBreakdown(consolidadoId: number) {
    if (this.breakdownConsolidadoId() === consolidadoId) {
      this.breakdown.set(null);
      this.breakdownConsolidadoId.set(null);
      return;
    }
    this.breakdownConsolidadoId.set(consolidadoId);
    this.api.getFullBreakdown(consolidadoId).subscribe(b => this.breakdown.set(b));
  }

  // --- Helpers ---
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDIENTE_SEPARACION': 'Pend. Separación',
      'SEPARADO': 'Separado',
      'PENDIENTE_RESTO': 'Pend. Pago Final',
      'PAGADO': 'Pagado',
      'VERIFICADO': 'Verificado',
      'RECHAZADO': 'Rechazado'
    };
    return labels[status] || status;
  }

  private showMessage(msg: string) {
    this.message.set(msg);
    setTimeout(() => this.message.set(''), 4000);
  }
}
