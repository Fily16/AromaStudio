import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent {
  cart = inject(CartService);
  private router = inject(Router);

  updateQty(productId: number, event: Event) {
    const qty = +(event.target as HTMLInputElement).value;
    this.cart.updateQuantity(productId, qty);
  }

  remove(productId: number) {
    this.cart.removeItem(productId);
  }

  // Nuevo método para redirigir al checkout del consolidado
  goToCheckout() {
    this.router.navigate(['/checkout']);
  }

  orderViaWhatsApp() {
    const items = this.cart.cartItems();
    // Añadimos al mensaje si es por mayor o menor
    const catType = this.cart.catalogType() === 'WHOLESALE' ? 'al por mayor' : 'al por menor';
    let message = `¡Hola! Quiero hacer un pedido ${catType}:\n\n`;

    for (const item of items) {
      const subtotal = (item.unitPricePen * item.quantity).toFixed(2);
      message += `• ${item.product.brand} - ${item.product.name} ${item.product.ml}ml x${item.quantity} — S/ ${subtotal}\n`;
    }
    message += `\nTotal: S/ ${this.cart.totalPen().toFixed(2)}`;
    const url = `https://wa.me/51903250695?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    this.cart.clear();
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
