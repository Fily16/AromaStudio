import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product, RetailInventory, RetailSale } from '../../../models/api.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);

  products = signal<Product[]>([]);
  inventory = signal<RetailInventory[]>([]);
  sales = signal<RetailSale[]>([]);
  tab = signal<'stock' | 'add' | 'sell' | 'sales'>('stock');

  // Add stock form
  addProductId = signal(0);
  addQuantity = signal(1);
  addCost = signal(0);
  addNotes = signal('');

  // Sell form
  sellProductId = signal(0);
  sellQuantity = signal(1);
  sellPrice = signal(0);
  sellChannel = signal('WHATSAPP');

  message = signal('');

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.api.getProducts().subscribe(p => this.products.set(p));
    this.api.getRetailInventory().subscribe(i => this.inventory.set(i));
    this.api.getRetailSales().subscribe(s => this.sales.set(s));
  }

  inStockItems() { return this.inventory().filter(i => i.quantity > 0); }

  addStock() {
    if (!this.addProductId()) return;
    this.api.addRetailStock({
      productId: this.addProductId(),
      quantity: this.addQuantity(),
      costPerUnitPen: this.addCost() || undefined,
      notes: this.addNotes() || undefined
    }).subscribe({
      next: () => { this.message.set('Stock agregado'); this.loadAll(); this.tab.set('stock'); },
      error: (e) => this.message.set('Error: ' + (e.error?.message || 'Error'))
    });
  }

  registerSale() {
    if (!this.sellProductId()) return;
    this.api.registerRetailSale({
      productId: this.sellProductId(),
      quantity: this.sellQuantity(),
      salePricePen: this.sellPrice(),
      channel: this.sellChannel()
    }).subscribe({
      next: () => { this.message.set('Venta registrada'); this.loadAll(); this.tab.set('sales'); },
      error: (e) => this.message.set('Error: ' + (e.error?.message || e.message || 'Sin stock'))
    });
  }

  setTab(t: 'stock' | 'add' | 'sell' | 'sales') { this.tab.set(t); this.message.set(''); }
  setAddProductId(e: Event) { this.addProductId.set(+(e.target as HTMLSelectElement).value); }
  setSellProductId(e: Event) { this.sellProductId.set(+(e.target as HTMLSelectElement).value); }
  setAddQty(e: Event) { this.addQuantity.set(+(e.target as HTMLInputElement).value); }
  setAddCost(e: Event) { this.addCost.set(+(e.target as HTMLInputElement).value); }
  setAddNotes(e: Event) { this.addNotes.set((e.target as HTMLInputElement).value); }
  setSellQty(e: Event) { this.sellQuantity.set(+(e.target as HTMLInputElement).value); }
  setSellPrice(e: Event) { this.sellPrice.set(+(e.target as HTMLInputElement).value); }
  setSellChannel(e: Event) { this.sellChannel.set((e.target as HTMLSelectElement).value); }
}
