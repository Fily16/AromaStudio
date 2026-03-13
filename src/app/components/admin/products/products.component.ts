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
  sortOption = signal('default'); // NUEVO: Señal para la opción de ordenamiento
  editingId = signal<number | null>(null);
  editPrices = signal<{ retailPricePen: number; wholesalePricePen: number; mayorPricePen: number; priceUsd: number; weightG: number }>({
    retailPricePen: 0, wholesalePricePen: 0, mayorPricePen: 0, priceUsd: 0, weightG: 0
  });

  // Config values
  exchangeRate = signal(3.75);
  courierCostPerKg = signal(7);
  editingConfig = signal<string | null>(null);
  editConfigValue = signal('');
  configMessage = signal('');

  // Image edit
  editImageUrl = signal('');

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

  // NUEVO: Método para manejar el cambio en el select de ordenamiento
  onSortChange(event: Event) {
    this.sortOption.set((event.target as HTMLSelectElement).value);
  }

  // MODIFICADO: Ahora filtra por texto y luego ordena según la opción elegida
  filteredProducts() {
    const q = this.search().toLowerCase();
    let result = this.products();

    // 1. Filtrar por texto (búsqueda)
    if (q) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    // 2. Ordenar los resultados
    const sort = this.sortOption();
    if (sort !== 'default') {
      result = [...result].sort((a, b) => {
        if (sort === 'name_asc') {
          return (a.brand + ' ' + a.name).localeCompare(b.brand + ' ' + b.name);
        } else if (sort === 'name_desc') {
          return (b.brand + ' ' + b.name).localeCompare(a.brand + ' ' + a.name);
        } else if (sort === 'price_desc') {
          return (b.priceUsd || 0) - (a.priceUsd || 0);
        } else if (sort === 'price_asc') {
          return (a.priceUsd || 0) - (b.priceUsd || 0);
        } else if (sort === 'sku_asc') {
          return a.sku.localeCompare(b.sku);
        }
        return 0;
      });
    }

    return result;
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
      mayorPricePen: product.mayorPricePen ?? 0,
      priceUsd: product.priceUsd,
      weightG: product.weightG ?? 0
    });
    this.editImageUrl.set(product.imageUrl || '');
  }

  cancelEdit() { this.editingId.set(null); }

  onImageUrlInput(event: Event) {
    this.editImageUrl.set((event.target as HTMLInputElement).value);
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  savePrices(productId: number) {
    this.api.updateProductPrices(productId, this.editPrices()).subscribe(() => {
      const imageUrl = this.editImageUrl();
      this.api.updateProduct(productId, { imageUrl: imageUrl || null } as any).subscribe(() => {
        this.editingId.set(null);
        this.loadProducts();
      });
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



// NUEVO: Método para eliminar producto
  deleteProduct(id: number) {
    // Agregamos una confirmación para evitar borrados accidentales
    if (confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      this.api.deleteProduct(id).subscribe({
        next: () => {
          this.loadProducts(); // Recarga la lista de productos tras eliminar
        },
        error: (err) => {
          console.error('Error al eliminar producto:', err);
          alert('No se pudo eliminar el producto. Revisa la consola para más detalles.');
        }
      });
    }
  }
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
