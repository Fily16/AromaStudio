import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product, AppConfig } from '../../../models/api.models';

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
  editPrices = signal<{ retailPricePen: number; wholesalePricePen: number; priceUsd: number; weightG: number }>({
    retailPricePen: 0, wholesalePricePen: 0, priceUsd: 0, weightG: 0
  });

  // Config values
  exchangeRate = signal(3.75);
  courierCostPerKg = signal(7);
  editingConfig = signal<string | null>(null);
  editConfigValue = signal('');
  configMessage = signal('');

  // Create product
  showCreate = signal(false);
  newProduct = signal<Partial<Product>>({
    sku: '', brand: '', name: '', type: 'EDP', ml: 100,
    priceUsd: 0, weightG: 350, category: 'unisex' as any, available: true
  });
  createMessage = signal('');

  ngOnInit() {
    this.loadProducts();
    this.loadConfig();
  }

  loadProducts() {
    this.api.getProducts().subscribe(p => this.products.set(p));
  }

  loadConfig() {
    this.api.getConfig().subscribe({
      next: (configs) => {
        for (const c of configs) {
          if (c.configKey === 'exchange_rate') this.exchangeRate.set(+c.configValue);
          if (c.configKey === 'courier_cost_per_kg') this.courierCostPerKg.set(+c.configValue);
        }
      },
      error: (err) => {
        console.error('Error loading config:', err);
        this.configMessage.set('⚠ No se pudo cargar configuración del servidor');
        setTimeout(() => this.configMessage.set(''), 5000);
      }
    });
  }

  filteredProducts() {
    const q = this.search().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }

  // Costo Puesto calculations (same as Excel / PricingService)
  landedCostUsd(p: Product): number {
    const shippingUsd = ((p.weightG || 0) / 1000) * this.courierCostPerKg();
    return p.priceUsd + shippingUsd;
  }

  landedCostPen(p: Product): number {
    return this.landedCostUsd(p) * this.exchangeRate();
  }

  // Config quick-edit
  startConfigEdit(key: string, currentValue: number) {
    this.editingConfig.set(key);
    this.editConfigValue.set(String(currentValue));
  }

  cancelConfigEdit() { this.editingConfig.set(null); }

  saveConfigEdit(key: string) {
    const newValue = this.editConfigValue();
    if (!newValue || isNaN(Number(newValue))) {
      this.configMessage.set('⚠ Valor inválido');
      setTimeout(() => this.configMessage.set(''), 3000);
      return;
    }
    this.api.updateConfig(key, newValue).subscribe({
      next: () => {
        // Update local signal immediately so prices recalculate
        if (key === 'exchange_rate') this.exchangeRate.set(Number(newValue));
        if (key === 'courier_cost_per_kg') this.courierCostPerKg.set(Number(newValue));
        this.editingConfig.set(null);
        this.configMessage.set('✓ Configuración guardada');
        this.loadConfig(); // Also reload from server to confirm
        setTimeout(() => this.configMessage.set(''), 3000);
      },
      error: (err) => {
        console.error('Error saving config:', err);
        this.configMessage.set('✗ Error al guardar: ' + (err.status === 401 || err.status === 403 ? 'Sesión expirada, vuelve a iniciar sesión' : err.error?.message || 'Error de red'));
        setTimeout(() => this.configMessage.set(''), 5000);
      }
    });
  }

  onConfigInput(event: Event) {
    this.editConfigValue.set((event.target as HTMLInputElement).value);
  }

  // Product edit
  startEdit(product: Product) {
    this.editingId.set(product.id);
    this.editPrices.set({
      retailPricePen: product.retailPricePen ?? 0,
      wholesalePricePen: product.wholesalePricePen ?? 0,
      priceUsd: product.priceUsd,
      weightG: product.weightG ?? 0
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

  // Create product
  toggleCreate() { this.showCreate.set(!this.showCreate()); }

  updateNewProduct(field: string, event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const val = target.type === 'number' ? +target.value : target.value;
    this.newProduct.set({ ...this.newProduct(), [field]: val });
  }

  createProduct() {
    const p = this.newProduct();
    if (!p.sku || !p.brand || !p.name) {
      this.createMessage.set('SKU, marca y nombre son obligatorios');
      return;
    }
    this.api.createProduct(p).subscribe({
      next: () => {
        this.createMessage.set('Producto creado');
        this.showCreate.set(false);
        this.newProduct.set({
          sku: '', brand: '', name: '', type: 'EDP', ml: 100,
          priceUsd: 0, weightG: 350, category: 'unisex' as any, available: true
        });
        this.loadProducts();
        setTimeout(() => this.createMessage.set(''), 3000);
      },
      error: (e) => this.createMessage.set('Error: ' + (e.error?.message || 'No se pudo crear'))
    });
  }
}
