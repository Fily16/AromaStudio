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
  step = signal<'form' | 'yape' | 'done'>('form');
  orderId = signal<number | null>(null);
  loading = signal(false);
  error = signal('');

  ngOnInit() {
    if (this.cart.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }
    this.api.getPublicConfig().subscribe(config => {
      this.yapeNumber.set(config.yapeNumber);
    });
  }

  submitOrder() {
    if (!this.clientName() || !this.clientPhone()) {
      this.error.set('Por favor completa tu nombre y número de WhatsApp');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api.createOrder({
      clientName: this.clientName(),
      clientPhone: this.clientPhone(),
      items: this.cart.getOrderItems()
    }).subscribe({
      next: (order) => {
        this.orderId.set(order.id);
        this.step.set('yape');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al crear el pedido. Intenta de nuevo.');
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
