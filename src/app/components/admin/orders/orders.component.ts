import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Order, Consolidado } from '../../../models/api.models';

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

  verify(orderId: number) {
    const ref = prompt('Referencia de Yape (opcional):') ?? '';
    this.api.verifyPayment(orderId, ref).subscribe(() => this.loadOrders());
  }

  reject(orderId: number) {
    if (confirm('Rechazar este pedido?')) {
      this.api.rejectPayment(orderId).subscribe(() => this.loadOrders());
    }
  }

  closeConsolidado(id: number) {
    if (confirm('Cerrar este consolidado? No se podrán agregar más pedidos.')) {
      this.api.closeConsolidado(id).subscribe(() => {
        this.api.getConsolidados().subscribe(c => this.consolidados.set(c));
      });
    }
  }

  onFilterChange(event: Event) {
    this.filter.set((event.target as HTMLSelectElement).value);
    this.loadOrders();
  }
}
