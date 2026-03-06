import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product } from '../../../models/api.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);

  products = signal<Product[]>([]);
  search = signal('');
  editingId = signal<number | null>(null);
  editPrices = signal<{ retailPricePen: number; wholesalePricePen: number; priceUsd: number }>({
    retailPricePen: 0, wholesalePricePen: 0, priceUsd: 0
  });

  ngOnInit() { this.loadProducts(); }

  loadProducts() {
    this.api.getProducts().subscribe(p => this.products.set(p));
  }

  filteredProducts() {
    const q = this.search().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }

  startEdit(product: Product) {
    this.editingId.set(product.id);
    this.editPrices.set({
      retailPricePen: product.retailPricePen ?? 0,
      wholesalePricePen: product.wholesalePricePen ?? 0,
      priceUsd: product.priceUsd
    });
  }

  cancelEdit() { this.editingId.set(null); }

  savePrices(productId: number) {
    this.api.updateProductPrices(productId, this.editPrices()).subscribe(() => {
      this.editingId.set(null);
      this.loadProducts();
    });
  }

  toggleAvailable(product: Product) {
    this.api.updateProduct(product.id, { available: !product.available }).subscribe(() => this.loadProducts());
  }

  onSearchInput(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  updateEditField(field: string, event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.editPrices.set({ ...this.editPrices(), [field]: val });
  }
}
