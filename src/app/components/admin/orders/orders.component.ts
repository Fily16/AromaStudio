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

  consolidados = signal<Consolidado[]>([]);
  consolidadoOrders = signal<Record<number, Order[]>>({});
  expandedConsolidadoId = signal<number | null>(null);
  filter = signal<string>('');
  loading = signal(false);
  loadingOrders = signal(false);
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

  // Edit client
  editingOrderId = signal<number | null>(null);
  editName = signal('');
  editPhone = signal('');

  ngOnInit() {
    this.loadConsolidados();
  }

  loadConsolidados() {
    this.loading.set(true);
    this.api.getConsolidados().subscribe({
      next: (c) => {
        // Sort by id descending (newest first)
        this.consolidados.set(c.sort((a, b) => b.id - a.id));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // --- Expand/collapse consolidado orders ---
  toggleOrders(consolidadoId: number) {
    if (this.expandedConsolidadoId() === consolidadoId) {
      this.expandedConsolidadoId.set(null);
      return;
    }
    this.expandedConsolidadoId.set(consolidadoId);
    this.loadConsolidadoOrders(consolidadoId);
  }

  loadConsolidadoOrders(consolidadoId: number) {
    this.loadingOrders.set(true);
    this.api.getConsolidadoOrders(consolidadoId).subscribe({
      next: (orders) => {
        const filtered = this.filter()
          ? orders.filter(o => o.paymentStatus === this.filter())
          : orders;
        this.consolidadoOrders.update(map => ({ ...map, [consolidadoId]: filtered }));
        this.loadingOrders.set(false);
      },
      error: () => this.loadingOrders.set(false)
    });
  }

  getOrdersForConsolidado(consolidadoId: number): Order[] {
    return this.consolidadoOrders()[consolidadoId] || [];
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
        this.refreshExpandedOrders();
        this.showMessage(type === 'deposit' ? 'Separación verificada' : 'Pago final verificado');
      },
      error: () => this.showMessage('Error al verificar pago')
    });
  }

  reject(orderId: number) {
    if (confirm('¿Rechazar este pedido?')) {
      this.api.rejectPayment(orderId).subscribe(() => {
        this.refreshExpandedOrders();
        this.showMessage('Pedido rechazado');
      });
    }
  }

  // --- Edit client info ---
  startEdit(order: Order) {
    this.editingOrderId.set(order.id);
    this.editName.set(order.clientName);
    this.editPhone.set(order.clientPhone);
  }

  cancelEdit() {
    this.editingOrderId.set(null);
    this.editName.set('');
    this.editPhone.set('');
  }

  saveEdit() {
    const orderId = this.editingOrderId();
    if (!orderId) return;
    this.api.updateOrderClient(orderId, {
      clientName: this.editName(),
      clientPhone: this.editPhone()
    }).subscribe({
      next: () => {
        this.cancelEdit();
        this.refreshExpandedOrders();
        this.showMessage('Datos del cliente actualizados');
      },
      error: () => this.showMessage('Error al actualizar datos')
    });
  }

  onEditName(event: Event) { this.editName.set((event.target as HTMLInputElement).value); }
  onEditPhone(event: Event) { this.editPhone.set((event.target as HTMLInputElement).value); }

  // --- Delete rejected order ---
  deleteOrder(orderId: number) {
    if (confirm('¿Eliminar este pedido rechazado? Esta acción no se puede deshacer.')) {
      this.api.deleteOrder(orderId).subscribe({
        next: () => {
          this.refreshExpandedOrders();
          this.loadConsolidados();
          this.showMessage('Pedido eliminado');
        },
        error: () => this.showMessage('Error al eliminar pedido')
      });
    }
  }

  // --- Delete consolidado ---
  deleteConsolidado(id: number) {
    if (confirm('¿Eliminar este consolidado y TODOS sus pedidos? Esta acción no se puede deshacer.')) {
      this.api.deleteConsolidado(id).subscribe({
        next: () => {
          this.expandedConsolidadoId.set(null);
          this.loadConsolidados();
          this.showMessage('Consolidado eliminado');
        },
        error: () => this.showMessage('Error al eliminar consolidado')
      });
    }
  }

  // --- Consolidado management ---
  closeConsolidado(id: number) {
    if (confirm('¿Cerrar este consolidado? No se podrán agregar más pedidos.')) {
      this.api.closeConsolidado(id).subscribe(() => {
        this.loadConsolidados();
        this.showMessage('Consolidado cerrado');
      });
    }
  }

  enableMerchandise(consolidadoId: number) {
    if (confirm('¿Habilitar mercancía? Esto moverá los productos de tienda al inventario y habilitará el segundo pago para clientes.')) {
      this.api.enableMerchandise(consolidadoId).subscribe({
        next: () => {
          this.loadConsolidados();
          this.refreshExpandedOrders();
          this.showMessage('Mercancía habilitada. Stock de tienda agregado al inventario.');
        },
        error: () => this.showMessage('Error al habilitar mercancía')
      });
    }
  }

  // --- Filters ---
  onFilterChange(event: Event) {
    this.filter.set((event.target as HTMLSelectElement).value);
    const expanded = this.expandedConsolidadoId();
    if (expanded) this.loadConsolidadoOrders(expanded);
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

  private refreshExpandedOrders() {
    const expanded = this.expandedConsolidadoId();
    if (expanded) this.loadConsolidadoOrders(expanded);
  }

  private showMessage(msg: string) {
    this.message.set(msg);
    setTimeout(() => this.message.set(''), 4000);
  }
}
