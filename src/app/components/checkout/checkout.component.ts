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

  isAddingToExisting = signal(false);
  existingOrderCode = signal('');

  // --- NUEVOS CAMPOS DE ENVÍO ---
  deliveryMethod = signal<'LIMA' | 'PROVINCIA'>('LIMA');
  shippingName = signal('');
  shippingDni = signal('');
  shippingPhone = signal('');
  shippingAddress = signal('');

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
    this.api.getActiveConsolidado().subscribe({
      next: () => {
        this.api.getPublicConfig().subscribe(config => this.yapeNumber.set(config.yapeNumber));
      },
      error: () => this.step.set('closed')
    });
  }

  get totalUnits(): number {
    return this.cart.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  get depositPreview(): number {
    return this.totalUnits * 20; // Solo lo que hay en el carrito actual
  }

  submitOrder() {
    if (!this.clientName() || !this.clientPhone()) {
      this.error.set('Por favor completa tu nombre y número de WhatsApp');
      return;
    }

    if (this.isAddingToExisting() && !this.existingOrderCode().trim()) {
      this.error.set('Ingresa el código de tu pedido anterior (ej. AS-0012).');
      return;
    }

    // Validación de Provincia
    if (this.deliveryMethod() === 'PROVINCIA') {
      if (!this.shippingName() || !this.shippingDni() || !this.shippingPhone() || !this.shippingAddress()) {
        this.error.set('Por favor completa todos los datos obligatorios para el envío por Shalom.');
        return;
      }
    }

    this.loading.set(true);
    this.error.set('');

    const payload: any = {
      clientName: this.clientName(),
      clientPhone: this.clientPhone(),
      deliveryMethod: this.deliveryMethod(),
      shippingName: this.shippingName(),
      shippingDni: this.shippingDni(),
      shippingPhone: this.shippingPhone(),
      shippingAddress: this.shippingAddress(),
      items: this.cart.getOrderItems()
    };

    if (this.isAddingToExisting() && this.existingOrderCode().trim()) {
      payload.existingOrderCode = this.existingOrderCode().trim();
    }

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.orderId.set(order.id);
        this.orderCode.set(order.orderCode);

        // LA SOLUCIÓN DE YAPE: En pantalla mostramos el pago SOLO del carrito actual
        this.depositAmount.set(this.depositPreview);

        this.remainingAmount.set(order.remainingPen);
        this.totalAmount.set(order.totalPen);
        this.step.set('yape');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al crear el pedido. Intenta de nuevo.');
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
