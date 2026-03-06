import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
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

  goToCheckout() {
    this.router.navigate(['/checkout']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
