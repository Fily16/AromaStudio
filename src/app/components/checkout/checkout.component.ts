import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  private router = inject(Router);

  clientName = signal('');
  clientPhone = signal('');
  yapeNumber = signal('903250695');

  // --- NUEVAS SEÑALES PARA ACUMULAR PEDIDOS ---
  isAddingToExisting = signal(false);
  existingOrderCode = signal('');

  step = signal<'form' | 'yape' | 'done' | 'closed'>('form');
  orderId = signal<number | null>(null);
  orderCode = signal('');
  depositAmount = signal(0);
  remainingAmount = signal(0);
  totalAmount = signal(0);
  loading = signal(false);
  error = signal('');

  ngOnInit() {
    if (this.cart.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    // Check if consolidado is open
    this.api.getActiveConsolidado().subscribe({
      next: () => {
        // Consolidado is open, proceed
        this.api.getPublicConfig().subscribe(config => {
          this.yapeNumber.set(config.yapeNumber);
        });
      },
      error: () => {
        // No active consolidado
        this.step.set('closed');
      }
    });
  }

  get totalUnits(): number {
    return this.cart.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  get depositPreview(): number {
    return this.totalUnits * 20;
  }

  submitOrder() {
    // Validaciones
    if (!this.clientName() || !this.clientPhone()) {
      this.error.set('Por favor completa tu nombre y número de WhatsApp');
      return;
    }

    if (this.isAddingToExisting() && !this.existingOrderCode().trim()) {
      this.error.set('Has marcado que quieres agregar a un pedido existente. Por favor, ingresa el código (ej. AS-0012).');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    // Preparamos el payload a enviar
    const payload: any = {
      clientName: this.clientName(),
      clientPhone: this.clientPhone(),
      items: this.cart.getOrderItems()
    };

    // Si el usuario quiere acumular pedido, mandamos el código
    if (this.isAddingToExisting() && this.existingOrderCode().trim()) {
      payload.existingOrderCode = this.existingOrderCode().trim();
    }

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.orderId.set(order.id);
        this.orderCode.set(order.orderCode);
        this.depositAmount.set(order.depositAmountPen);
        this.remainingAmount.set(order.remainingPen);
        this.totalAmount.set(order.totalPen);
        this.step.set('yape');
        this.loading.set(false);
      },
      error: (err) => {
        // Mostramos el mensaje amigable de error que configuramos en el backend (ej. Celular no coincide)
        const msg = err.error?.message || 'Error al crear el pedido. Intenta de nuevo.';
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  confirmYape() {
    this.step.set('done');
    this.cart.clear();
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
