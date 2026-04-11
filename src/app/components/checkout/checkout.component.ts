import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import { SHALOM_AGENCIES, SHALOM_DEPARTMENTS, ShalomAgency } from '../../data/shalom-agencies';

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

  isAddingToExisting = signal(false);
  existingOrderCode = signal('');

  deliveryMethod = signal<'LIMA' | 'SHALOM'>('LIMA');
  shippingName = signal('');
  shippingDni = signal('');
  shippingPhone = signal('');
  shippingAddress = signal('');

  // Shalom agency filter
  departments = SHALOM_DEPARTMENTS;
  selectedDepartment = signal('');
  selectedAgency = signal<ShalomAgency | null>(null);

  agenciesForDepartment = computed(() => {
    const dept = this.selectedDepartment();
    if (!dept) return [];
    return SHALOM_AGENCIES.filter(a => a.departamento === dept);
  });

  step = signal<'form' | 'done' | 'closed'>('form');
  orderId = signal<number | null>(null);
  orderCode = signal('');
  depositAmount = signal(0);
  remainingAmount = signal(0);
  totalAmount = signal(0);
  loading = signal(false);
  error = signal('');

  // Save cart items for WhatsApp message after clearing cart
  savedCartItems = signal<{ brand: string; name: string; ml: number; quantity: number; unitPricePen: number }[]>([]);
  savedTotalPen = signal(0);

  ngOnInit() {
    if (this.cart.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    if (typeof (window as any).ttq !== 'undefined') {
      (window as any).ttq.track('InitiateCheckout', {
        content_type: 'product',
        value: this.cart.totalPen(),
        currency: 'PEN',
        quantity: this.cart.cartItems().reduce((sum, item) => sum + item.quantity, 0)
      });
    }
    if (typeof (window as any).fbq !== 'undefined') {
      (window as any).fbq('track', 'InitiateCheckout', {
        value: this.cart.totalPen(),
        currency: 'PEN',
        num_items: this.cart.cartItems().reduce((sum, item) => sum + item.quantity, 0)
      });
    }

    this.api.getActiveConsolidado().subscribe({
      next: () => {},
      error: () => this.step.set('closed')
    });
  }

  get totalUnits(): number {
    return this.cart.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  get depositPreview(): number {
    return this.totalUnits * 20;
  }

  onDepartmentChange(dept: string) {
    this.selectedDepartment.set(dept);
    this.selectedAgency.set(null);
    this.shippingAddress.set('');
  }

  onAgencyChange(nombre: string) {
    const agency = this.agenciesForDepartment().find(a => a.nombre === nombre) || null;
    this.selectedAgency.set(agency);
    this.shippingAddress.set(agency ? `Shalom ${agency.nombre} - ${agency.direccion}` : '');
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

    if (this.deliveryMethod() === 'SHALOM') {
      if (!this.shippingName() || !this.shippingDni() || !this.shippingPhone()) {
        this.error.set('Por favor completa todos los datos obligatorios para el envío por Shalom.');
        return;
      }
      if (!this.selectedAgency()) {
        this.error.set('Por favor selecciona una agencia Shalom de la lista.');
        return;
      }
    }

    // Save cart items before they get cleared
    this.savedCartItems.set(this.cart.cartItems().map(i => ({
      brand: i.product.brand,
      name: i.product.name,
      ml: i.product.ml,
      quantity: i.quantity,
      unitPricePen: i.unitPricePen
    })));
    this.savedTotalPen.set(this.cart.totalPen());

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
        this.depositAmount.set(this.depositPreview);
        this.remainingAmount.set(order.remainingPen);
        this.totalAmount.set(order.totalPen);

        if (typeof (window as any).ttq !== 'undefined') {
          (window as any).ttq.track('PlaceAnOrder', {
            content_type: 'product',
            value: order.totalPen,
            currency: 'PEN'
          });
        }
        if (typeof (window as any).fbq !== 'undefined') {
          (window as any).fbq('track', 'Purchase', {
            value: order.totalPen,
            currency: 'PEN',
            content_type: 'product'
          });
        }

        this.step.set('done');
        this.cart.clear();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al crear el pedido. Intenta de nuevo.');
        this.loading.set(false);
      }
    });
  }

  sendWhatsApp() {
    const items = this.savedCartItems();
    let message = `Hola, soy *${this.clientName()}*.\nMi código de pedido es *${this.orderCode()}*.\n\nQuiero confirmar mi pedido:\n\n`;

    for (const item of items) {
      const subtotal = (item.unitPricePen * item.quantity).toFixed(2);
      message += `• ${item.brand} - ${item.name} ${item.ml}ml x${item.quantity} — S/ ${subtotal}\n`;
    }

    message += `\n*Total: S/ ${this.savedTotalPen().toFixed(2)}*`;
    message += `\n*Separación: S/ ${this.depositAmount().toFixed(2)}*`;

    if (this.deliveryMethod() === 'SHALOM' && this.selectedAgency()) {
      message += `\n\nEnvío a: Shalom ${this.selectedAgency()!.nombre}`;
    }

    const url = `https://wa.me/51981587009?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
