import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product, Promotion } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';

interface DraftItem { productId: number | null; name: string; imageUrl: string | null; }

/**
 * Gestión de Promociones (packs) dentro de "Stock de tienda".
 * Crear = imagen + 1..N perfumes (del catálogo o exclusivos de la promo) + precio + stock + vigencia + ganancia.
 */
@Component({
  selector: 'app-promotions-admin',
  standalone: true,
  imports: [DecimalPipe, CdnImgPipe],
  templateUrl: './promotions-admin.component.html',
  styleUrl: './promotions-admin.component.css'
})
export class PromotionsAdminComponent implements OnInit {
  private api = inject(ApiService);

  promotions = signal<Promotion[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);
  message = signal('');

  // Editor
  showForm = signal(false);
  editingId = signal<number | null>(null);
  fName = signal('');
  fImageData = signal('');   // imagen subida (data URL)
  fPrice = signal<number>(0);
  fStock = signal<number>(1);
  fValidUntil = signal('');
  fActive = signal(true);
  fProfit = signal<string>('');       // vacío = auto (si todos son del catálogo)
  fItems = signal<DraftItem[]>([]);

  // Buscador de catálogo para agregar
  pQuery = signal('');
  // Perfume exclusivo
  customName = signal('');
  customImg = signal('');

  hasCustomItem = computed(() => this.fItems().some(i => i.productId == null));
  catalogIds = computed(() => this.fItems().filter(i => i.productId != null).map(i => i.productId as number));

  filteredProducts = computed(() => {
    const q = this.pQuery().toLowerCase().trim();
    let list = this.products();
    if (q) {
      const tokens = q.split(/\s+/);
      list = list.filter(p => tokens.every(t => `${p.name} ${p.brand} ${p.sku ?? ''}`.toLowerCase().includes(t)));
    }
    return list.slice(0, 40);
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getPromotions().subscribe({
      next: (list) => { this.promotions.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.api.getProducts({ onlyAvailable: false }).subscribe({ next: (p) => this.products.set(p), error: () => {} });
  }

  onImageFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        let w = img.width, h = img.height;
        if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        this.fImageData.set(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
  clearImage() { this.fImageData.set(''); }

  newPromo() {
    this.editingId.set(null);
    this.fName.set(''); this.fImageData.set(''); this.fPrice.set(0); this.fStock.set(1);
    this.fValidUntil.set(''); this.fActive.set(true); this.fProfit.set(''); this.fItems.set([]);
    this.pQuery.set(''); this.customName.set(''); this.customImg.set('');
    this.showForm.set(true);
  }

  editPromo(p: Promotion) {
    this.editingId.set(p.id);
    this.fName.set(p.name); this.fImageData.set(p.imageData || p.imageUrl || '');
    this.fPrice.set(p.pricePen); this.fStock.set(p.stockQty);
    this.fValidUntil.set(p.validUntil || ''); this.fActive.set(p.active);
    this.fProfit.set(p.profitPen != null ? String(p.profitPen) : '');
    this.fItems.set(p.items.map(i => ({ productId: i.productId, name: i.name, imageUrl: i.imageUrl })));
    this.showForm.set(true);
  }

  cancelForm() { this.showForm.set(false); }

  addCatalogItem(p: Product) {
    if (this.fItems().some(i => i.productId === p.id)) return;
    this.fItems.set([...this.fItems(), { productId: p.id, name: `${p.brand} ${p.name}`, imageUrl: p.imageUrl }]);
  }
  addCustomItem() {
    const name = this.customName().trim();
    if (!name) { this.toast('El perfume exclusivo necesita un nombre.'); return; }
    this.fItems.set([...this.fItems(), { productId: null, name, imageUrl: this.customImg().trim() || null }]);
    this.customName.set(''); this.customImg.set('');
  }
  removeItem(idx: number) { this.fItems.set(this.fItems().filter((_, i) => i !== idx)); }

  suggestProfit() {
    const ids = this.catalogIds();
    if (this.hasCustomItem() || ids.length === 0) {
      this.toast('La ganancia es manual (hay un perfume exclusivo o sin costo).');
      return;
    }
    this.api.suggestPromoProfit(+this.fPrice(), ids).subscribe({
      next: (r) => {
        if (r.suggestedProfitPen === '' || r.suggestedProfitPen == null) this.toast('No se pudo calcular (falta costo de un perfume).');
        else this.fProfit.set(String(r.suggestedProfitPen));
      },
      error: () => this.toast('No se pudo calcular la ganancia.')
    });
  }

  save() {
    if (!this.fName().trim()) { this.toast('Ponle un nombre a la promoción.'); return; }
    if (this.fItems().length === 0) { this.toast('Agrega al menos un perfume.'); return; }
    if (+this.fPrice() <= 0) { this.toast('Ingresa el precio de la promoción.'); return; }
    if (this.hasCustomItem() && this.fProfit().trim() === '') {
      this.toast('Ingresa la ganancia (hay un perfume exclusivo).'); return;
    }
    const req = {
      name: this.fName().trim(),
      imageData: this.fImageData() || null,
      imageUrl: null,
      pricePen: +this.fPrice(),
      stockQty: +this.fStock(),
      validUntil: this.fValidUntil() || null,
      active: this.fActive(),
      profitPen: this.fProfit().trim() === '' ? null : +this.fProfit(),
      items: this.fItems().map(i => ({ productId: i.productId, name: i.name, imageUrl: i.imageUrl }))
    };
    const obs = this.editingId() != null
      ? this.api.updatePromotion(this.editingId()!, req)
      : this.api.createPromotion(req);
    obs.subscribe({
      next: () => { this.showForm.set(false); this.load(); this.toast('Promoción guardada'); },
      error: (e) => this.toast('Error: ' + (e.error?.message || 'no se pudo guardar'))
    });
  }

  deletePromo(p: Promotion) {
    if (!confirm(`¿Eliminar la promoción "${p.name}"? No se puede deshacer.`)) return;
    this.api.deletePromotion(p.id).subscribe({
      next: () => { this.load(); this.toast('Promoción eliminada'); },
      error: () => this.toast('No se pudo eliminar')
    });
  }

  toggleActive(p: Promotion) {
    this.api.updatePromotion(p.id, {
      name: p.name, imageUrl: p.imageUrl, imageData: p.imageData, pricePen: p.pricePen, stockQty: p.stockQty,
      validUntil: p.validUntil, active: !p.active, profitPen: p.profitPen,
      items: p.items.map(i => ({ productId: i.productId, name: i.name, imageUrl: i.imageUrl }))
    }).subscribe({ next: () => this.load(), error: () => this.toast('No se pudo actualizar') });
  }

  private toast(m: string) { this.message.set(m); setTimeout(() => this.message.set(''), 3500); }
}
