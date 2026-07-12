import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Order, Consolidado, AllocationResponse, MissingItem, Supplier,
         Promotion, ProfitReport, OrderPromo, OrderItem } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';

/**
 * Pedidos = núcleo del ERP. KPIs del consolidado (total, Lima, provincia, por vendedor,
 * ganancia líquida) + filtros + tabla con acciones de pago. Al cerrar el consolidado se
 * muestra automáticamente la asignación de compra por proveedor (allocation).
 */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [DecimalPipe, DatePipe, CdnImgPipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);

  consolidados = signal<Consolidado[]>([]);
  selectedId = signal<number | null>(null);
  orders = signal<Order[]>([]);
  sellers = signal<string[]>([]);
  loading = signal(false);
  message = signal('');

  // Filtros
  fStatus = signal('');
  fLocation = signal('');
  fSeller = signal('');
  search = signal('');

  // Acción de pago inline
  activeActionOrderId = signal<number | null>(null);
  activeActionType = signal<'deposit' | 'rest' | null>(null);
  yapeRefInput = signal('');

  // Edición de cliente
  editingOrderId = signal<number | null>(null);
  editName = signal('');
  editPhone = signal('');

  // Allocation (al cerrar)
  allocation = signal<AllocationResponse | null>(null);

  // --- Flujo de cierre con Excel + faltantes ---
  showCloseModal = signal(false);
  closeStep = signal<'upload' | 'result'>('upload');
  closing = signal(false);
  closeError = signal('');
  closeSuppliers = signal<Supplier[]>([]);            // proveedores ACTIVOS para subir su Excel al cerrar
  supplierFiles = signal<Map<number, File>>(new Map()); // supplierId -> Excel
  missing = signal<MissingItem[]>([]);
  buyElsewhere = signal<Map<number, number>>(new Map()); // productId -> US$/unidad

  buyElsewhereTotalUsd = computed(() => {
    let total = 0;
    for (const mi of this.missing()) {
      if (!this.buyElsewhere().has(mi.productId)) continue;
      const cost = this.buyElsewhere().get(mi.productId) || 0;
      const qty = mi.orders.reduce((s, o) => s + (o.quantity || 0), 0);
      total += cost * qty;
    }
    return total;
  });

  // Clientes a avisar (faltantes que NO se comprarán en otro proveedor), agrupados
  clientsToNotify = computed(() => {
    const buckets = new Map<string, { name: string; phone: string; code: string; items: { label: string; qty: number }[] }>();
    for (const mi of this.missing()) {
      if (this.buyElsewhere().has(mi.productId)) continue;
      for (const ord of mi.orders) {
        const key = ord.orderCode || ord.clientPhone;
        let b = buckets.get(key);
        if (!b) { b = { name: ord.clientName, phone: ord.clientPhone, code: ord.orderCode, items: [] }; buckets.set(key, b); }
        b.items.push({ label: `${mi.brand} ${mi.name}`, qty: ord.quantity || 1 });
      }
    }
    return [...buckets.values()];
  });

  // --- Revisar pedidos SEPARADOS: perfumes que ya no tenemos (ocultos por cambio de proveedor) ---
  showUnavailable = signal(false);
  toggleUnavailable() { this.showUnavailable.update(v => !v); }
  unavailableReport = computed(() => {
    const out: {
      order: Order;
      unavailable: { label: string; qty: number }[];
      available: { label: string; qty: number }[];
      unavailableText: string; availableText: string;
      deducted: number; newDeposit: number; newTotal: number;
    }[] = [];
    for (const o of this.acceptedOrders()) {
      const un: { label: string; qty: number }[] = [];
      const av: { label: string; qty: number }[] = [];
      let totalUnits = 0, unavailUnits = 0, unavailValue = 0;
      for (const it of o.items) {
        const p = it.product;
        if (!p) continue;
        const qty = it.quantity || 0;
        totalUnits += qty;
        const label = `${p.brand} ${p.name}`;
        const gone = p.available === false || (p as any).archived === true;
        if (gone) { un.push({ label, qty }); unavailUnits += qty; unavailValue += it.subtotalPen || 0; }
        else { av.push({ label, qty }); }
      }
      if (un.length === 0) continue;
      const dep = o.depositAmountPen || 0;
      const deducted = totalUnits > 0 ? Math.round(dep * unavailUnits / totalUnits) : 0;
      out.push({ order: o, unavailable: un, available: av,
        unavailableText: un.map(i => `${i.label} (x${i.qty})`).join(', '),
        availableText: av.map(i => `${i.label} (x${i.qty})`).join(', '),
        deducted, newDeposit: dep - deducted, newTotal: (o.totalPen || 0) - unavailValue });
    }
    return out;
  });
  whatsappUnavailable(e: { order: Order; unavailable: { label: string; qty: number }[]; available: { label: string; qty: number }[]; deducted: number; newDeposit: number; newTotal: number }) {
    const o = e.order;
    const noHay = e.unavailable.map(i => `• ${i.label} (x${i.qty})`).join('\n');
    const siHay = e.available.length ? e.available.map(i => `• ${i.label} (x${i.qty})`).join('\n') : '—';
    const msg =
`Hola ${o.clientName} 👋 Sobre tu pedido ${o.orderCode}:
Lamentablemente ya no contamos con:
${noHay}

Tienes 2 opciones:
1) Te devolvemos S/ ${e.deducted} (lo que separaste por esos perfumes).
2) Lo descontamos de tu pedido: tu nuevo total sería S/ ${e.newTotal} y tu separación S/ ${e.newDeposit}.

Lo que SÍ tenemos de tu pedido:
${siHay}

Cuéntanos qué prefieres. ¡Gracias por tu comprensión! 🙏`;
    const phone = '51' + (o.clientPhone || '').replace(/\D/g, '').slice(-9);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // Detalle de pedido (fila expandible) + desglose final
  expandedOrders = signal<Set<number>>(new Set());
  showBreakdown = signal(false);
  expandedBreakdown = signal<Set<number>>(new Set());
  breakdownRows = computed(() => {
    const m = new Map<number, { product: any; qty: number; montoPen: number; itemsTotal: number; itemsPicked: number; clients: { name: string; code: string; qty: number; picked: boolean }[] }>();
    for (const o of this.acceptedOrders()) {
      for (const it of o.items) {
        if (!it.product) continue;
        let row = m.get(it.product.id);
        if (!row) { row = { product: it.product, qty: 0, montoPen: 0, itemsTotal: 0, itemsPicked: 0, clients: [] }; m.set(it.product.id, row); }
        row.qty += it.quantity || 0;
        row.montoPen += it.subtotalPen || 0;
        row.itemsTotal += 1;
        if (it.picked) row.itemsPicked += 1;
        row.clients.push({ name: o.clientName, code: o.orderCode, qty: it.quantity || 0, picked: !!it.picked });
      }
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  });
  breakdownUnits = computed(() => this.breakdownRows().reduce((s, r) => s + r.qty, 0));
  breakdownPickedAll = computed(() => this.breakdownRows().length > 0 &&
    this.breakdownRows().every(r => r.itemsPicked === r.itemsTotal));

  // Provincia = envío Shalom. El checkout guarda 'SHALOM' (legacy: 'PROVINCIA').
  isShalom = (o: Order) => o.deliveryMethod === 'SHALOM' || o.deliveryMethod === 'PROVINCIA';

  // --- Promociones (para render en el detalle de pedidos de stock) ---
  promotionsMap = signal<Map<number, Promotion>>(new Map());
  promoItemsFor(op: OrderPromo): { name: string; imageUrl: string | null }[] {
    if (op.promotionId == null) return [];
    const p = this.promotionsMap().get(op.promotionId);
    return p ? p.items.map(i => ({ name: i.name, imageUrl: i.imageUrl })) : [];
  }

  // --- Ganancia por periodo ---
  showProfit = signal(false);
  profitGran = signal<'month' | 'week' | 'year'>('month');
  profitReport = signal<ProfitReport | null>(null);
  profitMax = computed(() => {
    const r = this.profitReport();
    if (!r || r.periods.length === 0) return 1;
    return Math.max(1, ...r.periods.map(p => Math.abs(p.total)));
  });

  // --- Envíos Shalom (impresión de etiquetas) ---
  shalomOrders = computed(() => this.acceptedOrders().filter(o => this.isShalom(o)));

  toggleOrderDetail(id: number) {
    const next = new Set(this.expandedOrders());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expandedOrders.set(next);
  }

  toggleBreakdown() { this.showBreakdown.update(v => !v); }
  toggleBreakdownItem(id: number) {
    const next = new Set(this.expandedBreakdown());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expandedBreakdown.set(next);
  }
  expandAllBreakdown() {
    if (this.expandedBreakdown().size === this.breakdownRows().length) this.expandedBreakdown.set(new Set());
    else this.expandedBreakdown.set(new Set(this.breakdownRows().map(r => r.product.id)));
  }

  selectedConsolidado = computed(() =>
    this.consolidados().find(c => c.id === this.selectedId()) || null);

  // Pedidos de cliente (excluye COMPRA TIENDA). La TABLA los muestra todos (para aceptar/rechazar).
  clientOrders = computed(() => this.orders().filter(o => o.clientName !== 'COMPRA TIENDA'));

  // Pestaña: pedidos de consolidado (por encargo) vs en stock (entrega inmediata).
  channelTab = signal<'CONSOLIDADO' | 'STOCK'>('CONSOLIDADO');
  isStockTab = computed(() => this.channelTab() === 'STOCK');
  stockOrdersCount = computed(() => this.clientOrders().filter(o => o.channel === 'STOCK').length);

  // KPIs y desglose: solo ACEPTADOS. Consolidado = canal!=STOCK; Stock = canal STOCK.
  private ACCEPTED = ['SEPARADO', 'PENDIENTE_RESTO', 'PAGADO', 'VERIFICADO'];
  acceptedOrders = computed(() => this.clientOrders().filter(o => o.channel !== 'STOCK' && this.ACCEPTED.includes(o.paymentStatus)));
  stockAccepted = computed(() => this.clientOrders().filter(o => o.channel === 'STOCK' && this.ACCEPTED.includes(o.paymentStatus)));
  // Conjunto de pedidos según la pestaña activa (los KPIs se reciclan con estos datos).
  statOrders = computed(() => this.isStockTab() ? this.stockAccepted() : this.acceptedOrders());
  kpiPending = computed(() => this.clientOrders().filter(o =>
    (this.isStockTab() ? o.channel === 'STOCK' : o.channel !== 'STOCK') && o.paymentStatus === 'PENDIENTE_SEPARACION').length);

  // Config para calcular el costo puesto en Perú (ganancia de stock)
  cfg = signal({ courier: 9, tc: 3.4, repackPerBox: 3.5, perBox: 4 });
  private landedPen(product: any): number {
    if (!product || product.priceUsd == null || product.weightG == null) return 0;
    const c = this.cfg();
    const usd = product.priceUsd + (product.weightG / 1000) * c.courier + (c.repackPerBox / c.perBox);
    return usd * c.tc;
  }
  // Ganancia de stock = Σ (precio venta − costo puesto en Perú) por unidad de los pedidos de stock aceptados.
  stockProfit = computed(() => this.stockAccepted().reduce((s, o) =>
    s + o.items.reduce((a, i) => a + ((i.unitPricePen || 0) - this.landedPen(i.product)) * (i.quantity || 0), 0), 0));

  filteredOrders = computed(() => {
    // Filtra por pestaña: consolidado (channel != STOCK) o en stock.
    let list = this.clientOrders().filter(o =>
      this.channelTab() === 'STOCK' ? o.channel === 'STOCK' : o.channel !== 'STOCK');
    const st = this.fStatus(); if (st) list = list.filter(o => o.paymentStatus === st);
    const loc = this.fLocation();
    if (loc === 'LIMA') list = list.filter(o => o.deliveryMethod === 'LIMA');
    else if (loc === 'PROVINCIA') list = list.filter(o => this.isShalom(o)); // Shalom (o legado PROVINCIA)
    const sel = this.fSeller(); if (sel) list = list.filter(o => (o.attendedBy || 'Sin asignar') === sel);
    const q = this.search().toLowerCase().trim();
    if (q) list = list.filter(o =>
      (o.orderCode || '').toLowerCase().includes(q) || (o.clientName || '').toLowerCase().includes(q));
    return list;
  });

  // KPIs (reciclados: usan statOrders según la pestaña)
  kpiTotal = computed(() => this.statOrders().length);
  kpiLima = computed(() => this.statOrders().filter(o => o.deliveryMethod === 'LIMA').length);
  kpiProvincia = computed(() => this.statOrders().filter(o => this.isShalom(o)).length);
  kpiUnits = computed(() => this.statOrders().reduce((s, o) => s + o.items.reduce((a, i) => a + (i.quantity || 0), 0), 0));
  // Ganancia (en vivo, robusta): Σ por pedido de (precio − costo puesto en Perú) + ganancia de promos.
  // Igual en consolidado y stock; coincide con la ganancia mostrada en el detalle de cada pedido.
  kpiProfit = computed(() =>
    (this.isStockTab() ? this.stockAccepted() : this.acceptedOrders())
      .reduce((s, o) => s + this.orderProfit(o), 0));
  kpiBySeller = computed(() => {
    const m = new Map<string, number>();
    for (const o of this.statOrders()) {
      const k = o.attendedBy || 'Sin asignar';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].map(([seller, count]) => ({ seller, count }));
  });

  ngOnInit() {
    this.api.getSellers().subscribe({ next: (s) => this.sellers.set(s), error: () => {} });
    this.api.getPromotions().subscribe({
      next: (list) => { const m = new Map<number, Promotion>(); for (const p of list) m.set(p.id, p); this.promotionsMap.set(m); },
      error: () => {}
    });
    this.api.getConfig().subscribe({
      next: (cfg) => {
        const get = (k: string, d: number) => { const c = cfg.find(x => x.configKey === k); return c ? +c.configValue : d; };
        this.cfg.set({
          courier: get('courier_cost_per_kg', 9), tc: get('exchange_rate', 3.4),
          repackPerBox: get('repack_cost_per_box', 3.5), perBox: get('perfumes_per_box', 4)
        });
      },
      error: () => {}
    });
    this.loadConsolidados();
  }

  loadConsolidados() {
    this.loading.set(true);
    this.api.getConsolidados().subscribe({
      next: (c) => {
        const sorted = c.sort((a, b) => b.id - a.id);
        this.consolidados.set(sorted);
        // Selecciona el activo (ABIERTO) o el más nuevo
        const active = sorted.find(x => x.status === 'ABIERTO') || sorted[0];
        if (active && this.selectedId() == null) this.selectedId.set(active.id);
        if (this.selectedId() != null) this.loadOrders(this.selectedId()!);
        else this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSelectConsolidado(ev: Event) {
    const id = +(ev.target as HTMLSelectElement).value;
    this.selectedId.set(id);
    this.allocation.set(null);
    this.loadOrders(id);
  }

  loadOrders(consolidadoId: number) {
    this.loading.set(true);
    this.api.getConsolidadoOrders(consolidadoId).subscribe({
      next: (orders) => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private refresh() {
    const id = this.selectedId();
    if (id != null) this.loadOrders(id);
  }

  // --- Acciones de pago ---
  startAction(orderId: number, type: 'deposit' | 'rest') {
    this.activeActionOrderId.set(orderId);
    this.activeActionType.set(type);
    this.yapeRefInput.set('');
  }
  cancelAction() {
    this.activeActionOrderId.set(null);
    this.activeActionType.set(null);
    this.yapeRefInput.set('');
  }
  confirmAction() {
    const orderId = this.activeActionOrderId();
    const type = this.activeActionType();
    const ref = this.yapeRefInput();
    if (!orderId || !type) return;
    const obs = type === 'deposit'
      ? this.api.verifyDeposit(orderId, ref)
      : this.api.verifyRestPayment(orderId, ref);
    obs.subscribe({
      next: () => { this.cancelAction(); this.refresh(); this.showMessage(type === 'deposit' ? 'Separación verificada' : 'Pago final verificado'); },
      error: () => this.showMessage('Error al verificar pago')
    });
  }

  // Aceptar = separar el pedido (PENDIENTE_SEPARACION → SEPARADO) para que cuente en
  // la compra, los KPIs y la asignación a proveedores. Directo, sin modal.
  accept(orderId: number) {
    this.api.verifyDeposit(orderId, '').subscribe({
      next: () => { this.refresh(); this.showMessage('Pedido aceptado (separado)'); },
      error: () => this.showMessage('Error al aceptar el pedido')
    });
  }

  reject(orderId: number) {
    if (confirm('¿Rechazar este pedido?')) {
      this.api.rejectPayment(orderId).subscribe({
        next: () => { this.refresh(); this.showMessage('Pedido rechazado'); },
        error: () => this.showMessage('Error al rechazar')
      });
    }
  }

  // --- Edición de cliente ---
  startEdit(order: Order) {
    this.editingOrderId.set(order.id);
    this.editName.set(order.clientName);
    this.editPhone.set(order.clientPhone);
  }
  cancelEdit() { this.editingOrderId.set(null); this.editName.set(''); this.editPhone.set(''); }
  saveEdit() {
    const orderId = this.editingOrderId();
    if (!orderId) return;
    this.api.updateOrderClient(orderId, { clientName: this.editName(), clientPhone: this.editPhone() }).subscribe({
      next: () => { this.cancelEdit(); this.refresh(); this.showMessage('Cliente actualizado'); },
      error: () => this.showMessage('Error al actualizar')
    });
  }
  onEditName(e: Event) { this.editName.set((e.target as HTMLInputElement).value); }
  onEditPhone(e: Event) { this.editPhone.set((e.target as HTMLInputElement).value); }

  deleteOrder(orderId: number) {
    if (confirm('¿Eliminar este pedido? No se puede deshacer.')) {
      this.api.deleteOrder(orderId).subscribe({
        next: () => { this.refresh(); this.showMessage('Pedido eliminado'); },
        error: () => this.showMessage('Solo se pueden eliminar pedidos rechazados o separados')
      });
    }
  }

  // --- Consolidado: cierre con Excel + faltantes ---
  openClose() {
    this.closeStep.set('upload');
    this.closeError.set('');
    this.supplierFiles.set(new Map());
    this.buyElsewhere.set(new Map());
    this.api.getSuppliers().subscribe({
      next: (s) => this.closeSuppliers.set(s.filter(x => x.active)),
      error: () => this.closeSuppliers.set([])
    });
    this.showCloseModal.set(true);
  }
  closeCloseModal() { this.showCloseModal.set(false); }
  onSupplierFile(supplierId: number, e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    const next = new Map(this.supplierFiles());
    if (f) next.set(supplierId, f); else next.delete(supplierId);
    this.supplierFiles.set(next);
  }

  processClose() {
    const id = this.selectedId();
    if (id == null) return;
    const entries = [...this.supplierFiles().entries()];  // [supplierId, File] de los que marcaste
    if (!entries.length) { this.closeError.set('Sube al menos el Excel de un proveedor.'); return; }
    this.closing.set(true);
    this.closeError.set('');

    // Importar cada Excel (secuencial) → cerrar → allocation + faltantes
    const importNext = (i: number) => {
      if (i >= entries.length) { this.finishClose(id); return; }
      const [sid, file] = entries[i];
      this.api.importSupplierExcel(sid, file).subscribe({
        next: () => importNext(i + 1),
        error: () => { this.closing.set(false); this.closeError.set('Error al importar el Excel de un proveedor.'); }
      });
    };
    importNext(0);
  }

  private finishClose(id: number) {
    this.api.closeConsolidado(id).subscribe({
      next: () => {
        this.loadConsolidados();
        this.api.getAllocation(id).subscribe({ next: (a) => this.allocation.set(a), error: () => {} });
        this.api.getMissing(id).subscribe({
          next: (m) => { this.missing.set(m); this.closing.set(false); this.closeStep.set('result'); },
          error: () => { this.closing.set(false); this.closeStep.set('result'); }
        });
      },
      error: () => { this.closing.set(false); this.closeError.set('Error al cerrar el consolidado.'); }
    });
  }

  toggleBuyElsewhere(productId: number) {
    const next = new Map(this.buyElsewhere());
    next.has(productId) ? next.delete(productId) : next.set(productId, 0);
    this.buyElsewhere.set(next);
  }
  setBuyCost(productId: number, value: string) {
    const next = new Map(this.buyElsewhere());
    next.set(productId, +value || 0);
    this.buyElsewhere.set(next);
  }
  missingQty(mi: MissingItem): number { return mi.orders.reduce((s, o) => s + (o.quantity || 0), 0); }

  whatsappClient(client: { name: string; phone: string; items: { label: string; qty: number }[] }) {
    const list = client.items.map(i => `${i.label} (x${i.qty})`).join(', ');
    const msg = `Hola ${client.name}, lamentablemente en este lote no pudimos conseguir: ${list}. Coordinamos contigo el cambio o la devolución del monto. ¡Gracias por tu comprensión!`;
    const phone = '51' + (client.phone || '').replace(/\D/g, '').slice(-9);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  enableMerchandise() {
    const id = this.selectedId();
    if (id == null) return;
    if (!confirm('¿Habilitar mercancía? Mueve la compra de tienda al inventario y habilita el pago final de clientes.')) return;
    this.api.enableMerchandise(id).subscribe({
      next: () => { this.loadConsolidados(); this.refresh(); this.showMessage('Mercancía habilitada'); },
      error: () => this.showMessage('Error al habilitar mercancía')
    });
  }

  viewAllocation() {
    const id = this.selectedId();
    if (id == null) return;
    this.api.getAllocation(id).subscribe({
      next: (a) => this.allocation.set(a),
      error: () => this.showMessage('No se pudo calcular la asignación')
    });
  }
  closeAllocation() { this.allocation.set(null); }

  // --- Helpers ---
  statusLabel(s: string): string {
    return ({
      PENDIENTE_SEPARACION: 'Pend. separación', SEPARADO: 'Separado',
      PENDIENTE_RESTO: 'Pend. pago final', PAGADO: 'Pagado',
      VERIFICADO: 'Verificado', RECHAZADO: 'Rechazado'
    } as Record<string, string>)[s] || s;
  }
  statusClass(s: string): string {
    return ({
      PENDIENTE_SEPARACION: 'amber', SEPARADO: 'blue', PENDIENTE_RESTO: 'amber',
      PAGADO: 'blue', VERIFICADO: 'green', RECHAZADO: 'red'
    } as Record<string, string>)[s] || 'gray';
  }
  orderUnits(o: Order): number { return o.items.reduce((a, i) => a + (i.quantity || 0), 0); }

  // --- Picking ---
  togglePicked(it: OrderItem) {
    if (it.id == null) return;
    const next = !it.picked;
    this.api.setItemPicked(it.id, next).subscribe({
      next: () => { it.picked = next; this.orders.set([...this.orders()]); },
      error: () => this.showMessage('No se pudo marcar el ítem')
    });
  }
  bulkPick(row: { product: any; itemsPicked: number; itemsTotal: number }) {
    const id = this.selectedId();
    if (id == null) return;
    const target = row.itemsPicked < row.itemsTotal; // marcar todos si faltan; si están todos, desmarcar
    this.api.pickProductInConsolidado(id, row.product.id, target).subscribe({
      next: () => this.refresh(),
      error: () => this.showMessage('No se pudo actualizar el picking')
    });
  }

  // --- Ganancia por ítem y por pedido (precio de venta − costo puesto en Perú, mismo modelo) ---
  itemProfit(it: OrderItem): number {
    return ((it.unitPricePen || 0) - this.landedPen(it.product)) * (it.quantity || 0);
  }
  orderProfit(o: Order): number {
    const items = o.items.reduce((s, it) => s + this.itemProfit(it), 0);
    const promos = (o.promos || []).reduce((s, p) => s + (p.profitPen || 0) * (p.quantity || 1), 0);
    return items + promos;
  }

  // --- Ganancia por periodo ---
  toggleProfit() {
    this.showProfit.update(v => !v);
    if (this.showProfit() && !this.profitReport()) this.loadProfit();
  }
  setGran(g: 'month' | 'week' | 'year') { this.profitGran.set(g); this.loadProfit(); }
  loadProfit() {
    this.api.getProfitReport(this.profitGran()).subscribe({
      next: (r) => this.profitReport.set(r),
      error: () => this.showMessage('No se pudo cargar la ganancia')
    });
  }

  // --- Impresión de etiquetas Shalom (4 por hoja horizontal) ---
  shalomDestino(o: Order): string {
    if (o.shippingDepartment || o.shippingAgency) {
      return [o.shippingDepartment, o.shippingAgency].filter(Boolean).join(' - ');
    }
    return o.shippingAddress || '';
  }
  private esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  private shalomCardInner(o: Order): string {
    return `<div class="l"><span class="k">DNI:</span> ${this.esc(o.shippingDni || '')}</div>
      <div class="l nom"><span class="k">Nombre:</span> ${this.esc(o.shippingName || o.clientName || '')}</div>
      <div class="l"><span class="k">Dirección:</span> ${this.esc(this.shalomDestino(o))}</div>
      <div class="l"><span class="k">Teléfono:</span> ${this.esc(o.shippingPhone || o.clientPhone || '')}</div>`;
  }
  private shalomDocHtml(): string {
    const orders = this.shalomOrders();
    const cell = (o?: Order) => o ? `<td class="card">${this.shalomCardInner(o)}</td>` : `<td class="empty"></td>`;
    // Layout en TABLA (2×2 por hoja): lo respetan tanto la impresión del navegador como Word.
    let pages = '';
    for (let i = 0; i < orders.length; i += 4) {
      const g = orders.slice(i, i + 4);
      pages += `<table class="page"><tr>${cell(g[0])}${cell(g[1])}</tr><tr>${cell(g[2])}${cell(g[3])}</tr></table>`;
    }
    return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Etiquetas Shalom</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4 landscape; margin: 7mm; }
  @page Section1 { size: 841.95pt 595.35pt; mso-page-orientation: landscape; margin: 7mm; }
  div.Section1 { page: Section1; }
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
  body { margin: 0; }
  table.page { width: 100%; border-collapse: separate; border-spacing: 5mm; table-layout: fixed;
               page-break-after: always; page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
  td.card { width: 50%; height: 66mm; border: 1.5px dashed #999; padding: 6mm; vertical-align: middle;
            page-break-inside: avoid; overflow: hidden; }
  td.empty { width: 50%; }
  .l { font-size: 19pt; line-height: 1.2; margin: 1.5mm 0; }
  .l .k { font-weight: bold; }
  .nom { font-size: 22pt; }
</style></head>
<body><div class="Section1">${pages}</div></body></html>`;
  }
  printShalom() {
    if (this.shalomOrders().length === 0) { this.showMessage('No hay envíos Shalom aceptados'); return; }
    const w = window.open('', '_blank');
    if (!w) { this.showMessage('Permite las ventanas emergentes para imprimir'); return; }
    w.document.write(this.shalomDocHtml());
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 400);
  }
  downloadShalomWord() {
    if (this.shalomOrders().length === 0) { this.showMessage('No hay envíos Shalom aceptados'); return; }
    const blob = new Blob(['﻿' + this.shalomDocHtml()], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiquetas-shalom-consolidado-${this.selectedId()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onStatus(e: Event) { this.fStatus.set((e.target as HTMLSelectElement).value); }
  onLocation(e: Event) { this.fLocation.set((e.target as HTMLSelectElement).value); }
  onSeller(e: Event) { this.fSeller.set((e.target as HTMLSelectElement).value); }
  onSearch(e: Event) { this.search.set((e.target as HTMLInputElement).value); }

  private showMessage(m: string) { this.message.set(m); setTimeout(() => this.message.set(''), 4000); }
}
