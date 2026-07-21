import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Order, Consolidado, AllocationResponse, MissingItem, MissingStatus, Supplier,
         Promotion, ProfitReport, OrderPromo, OrderItem } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';
import { MediaGalleryComponent } from '../shared/media-gallery.component';

/**
 * Pedidos = núcleo del ERP. KPIs del consolidado (total, Lima, provincia, por vendedor,
 * ganancia líquida) + filtros + tabla con acciones de pago. Al cerrar el consolidado se
 * muestra automáticamente la asignación de compra por proveedor (allocation).
 */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [DecimalPipe, DatePipe, CdnImgPipe, MediaGalleryComponent],
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
  // Líneas de allocation con el "por qué" expandido (por productId)
  expandedAlloc = signal<Set<number>>(new Set());
  toggleAllocLine(productId: number) {
    this.expandedAlloc.update(s => {
      const n = new Set(s); n.has(productId) ? n.delete(productId) : n.add(productId); return n;
    });
  }

  // --- Consolidados v2: plazo, aviso e imagen ---
  showScheduleModal = signal(false);
  showOpenWizard = signal(false);
  wizardStep = signal<'form' | 'confirm'>('form');
  savingSchedule = signal(false);
  scheduleError = signal('');
  /** Formulario compartido por "Configurar plazo" y el wizard de apertura. */
  sched = signal<{ title: string; description: string; startAt: string; endsAt: string; imageMediaId: number | null }>(
    { title: '', description: '', startAt: '', endsAt: '', imageMediaId: null });

  /** ¿Hay un consolidado recibiendo (o por recibir) pedidos? Si no, se puede abrir uno nuevo. */
  hasOpenOrScheduled = computed(() =>
    this.consolidados().some(c => c.status === 'ABIERTO' || c.status === 'PROGRAMADO'));

  /** El consolidado seleccionado se puede reprogramar (plazo/aviso/imagen). */
  canSchedule = computed(() => {
    const c = this.selectedConsolidado();
    return !!c && (c.status === 'ABIERTO' || c.status === 'PROGRAMADO');
  });

  // --- Flujo de cierre con Excel + faltantes ---
  showCloseModal = signal(false);
  closeStep = signal<'upload' | 'result'>('upload');
  closing = signal(false);
  closeError = signal('');
  closeSuppliers = signal<Supplier[]>([]);            // proveedores ACTIVOS para subir su Excel al cerrar
  supplierFiles = signal<Map<number, File>>(new Map()); // supplierId -> Excel
  missing = signal<MissingItem[]>([]);

  // Faltantes clasificados por estado PERSISTENTE (sobrevive recargas):
  //  Caso A = se compra en CristFragance (precio ya calculado). Pendiente o ya comprado.
  //  Caso B = imposible de conseguir -> se avisa al cliente.
  caseA = computed(() => this.missing().filter(m => m.resolutionStatus !== 'UNAVAILABLE'));
  caseB = computed(() => this.missing().filter(m => m.resolutionStatus === 'UNAVAILABLE'));
  private caseBIds = computed(() => new Set(this.caseB().map(m => m.productId)));

  caseACounts = computed(() => {
    const a = this.caseA();
    return {
      total: a.length,
      bought: a.filter(m => m.resolutionStatus === 'CRIST_BOUGHT').length,
      pending: a.filter(m => m.resolutionStatus === 'CRIST_PENDING').length,
    };
  });
  /** Costo estimado de lo que se comprará en CristFragance (precio registrado × unidades). */
  cristfranceTotalPen = computed(() =>
    this.caseA().reduce((t, m) => t + (m.registeredPricePen || 0) * this.missingQty(m), 0));

  // --- Revisar pedidos SEPARADOS: perfumes que ya no tenemos (ocultos por cambio de proveedor) ---
  showUnavailable = signal(false);
  toggleUnavailable() { this.showUnavailable.update(v => !v); }
  // "Revisar separados": perfumes archivados / dados de baja tras cambiar de proveedor.
  unavailableReport = computed(() =>
    this.buildUnavailableReport(p => p.available === false || (p as any).archived === true));

  // Caso B (faltantes imposibles): mismo informe por pedido, otro criterio -> reusa whatsappUnavailable.
  caseBReport = computed(() => {
    const ids = this.caseBIds();
    return this.buildUnavailableReport(p => ids.has(p.id));
  });

  /**
   * Agrupa por PEDIDO los ítems que un predicado marca como "no disponibles", con el nuevo
   * total/separación y la devolución proporcional. Único constructor para ambos flujos
   * ("Revisar separados" y "Caso B") — el mensaje de WhatsApp (whatsappUnavailable) es el mismo.
   */
  private buildUnavailableReport(isGone: (product: any) => boolean) {
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
        if (isGone(p)) { un.push({ label, qty }); unavailUnits += qty; unavailValue += it.subtotalPen || 0; }
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
  }
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

  // =====================================================================
  // Plazo del consolidado, aviso público e imagen
  // =====================================================================

  /** ISO/epoch -> valor de <input type="datetime-local"> en HORA LOCAL del admin. */
  private toLocalInput(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  /** El navegador convierte la hora local a epoch UTC: el backend nunca adivina zonas. */
  private toMs(local: string): number | null {
    if (!local) return null;
    const ms = new Date(local).getTime();
    return isNaN(ms) ? null : ms;
  }

  /** Texto del plazo para el chip del header. */
  deadlineLabel = computed(() => {
    const c = this.selectedConsolidado();
    if (!c?.endsAt) return null;
    const d = new Date(c.endsAt);
    return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  });

  openSchedule() {
    const c = this.selectedConsolidado();
    if (!c) return;
    this.sched.set({
      title: c.title || '',
      description: c.description || '',
      startAt: this.toLocalInput(c.startAt),
      endsAt: this.toLocalInput(c.endsAt),
      imageMediaId: c.imageMediaId ?? null
    });
    this.scheduleError.set('');
    this.showScheduleModal.set(true);
  }

  openWizard() {
    // Por defecto: abre ahora y cierra en 7 días (lo típico del negocio).
    const in7 = new Date(Date.now() + 7 * 86400000);
    this.sched.set({
      title: '', description: '', startAt: '',
      endsAt: this.toLocalInput(in7.toISOString()), imageMediaId: null
    });
    this.scheduleError.set('');
    this.wizardStep.set('form');
    this.showOpenWizard.set(true);
  }

  setSched(field: 'title' | 'description' | 'startAt' | 'endsAt', ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.sched.update(s => ({ ...s, [field]: v }));
  }
  setSchedImage(id: number | null) {
    this.sched.update(s => ({ ...s, imageMediaId: id }));
  }

  /** Resumen legible para el paso de confirmación del wizard. */
  wizardSummary = computed(() => {
    const s = this.sched();
    const fmt = (v: string) => v ? new Date(v).toLocaleString('es-PE',
      { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    return {
      title: s.title || '(sin título)',
      description: s.description,
      start: fmt(s.startAt) || 'ahora mismo',
      end: fmt(s.endsAt),
      hasImage: s.imageMediaId != null
    };
  });

  goToConfirm() {
    if (!this.sched().endsAt) { this.scheduleError.set('Elige la fecha y hora de cierre.'); return; }
    if (this.toMs(this.sched().endsAt)! <= Date.now()) {
      this.scheduleError.set('El cierre debe ser en el futuro.');
      return;
    }
    this.scheduleError.set('');
    this.wizardStep.set('confirm');
  }

  /** Abre (o programa) el consolidado nuevo. */
  confirmOpen() {
    const s = this.sched();
    const endsAtMs = this.toMs(s.endsAt);
    if (endsAtMs == null) { this.scheduleError.set('Elige la fecha y hora de cierre.'); return; }
    this.savingSchedule.set(true); this.scheduleError.set('');
    this.api.openConsolidado({
      title: s.title.trim() || null,
      description: s.description.trim() || null,
      startAtMs: this.toMs(s.startAt),
      endsAtMs,
      imageMediaId: s.imageMediaId
    }).subscribe({
      next: (c) => {
        this.savingSchedule.set(false);
        this.showOpenWizard.set(false);
        this.selectedId.set(c.id);
        this.loadConsolidados();
        this.showMessage(c.status === 'PROGRAMADO'
          ? '✓ Consolidado programado: abrirá solo en la fecha indicada.'
          : '✓ Consolidado abierto. El aviso ya se ve en la tienda.');
      },
      error: (e) => {
        this.savingSchedule.set(false);
        this.scheduleError.set(e.error?.message || 'No se pudo abrir el consolidado.');
      }
    });
  }

  /** Guarda plazo/aviso/imagen del consolidado actual (extender el plazo se anuncia solo). */
  saveSchedule() {
    const c = this.selectedConsolidado();
    const s = this.sched();
    if (!c) return;
    const endsAtMs = this.toMs(s.endsAt);
    if (endsAtMs == null) { this.scheduleError.set('Elige la fecha y hora de cierre.'); return; }
    const extending = !!c.endsAt && endsAtMs > new Date(c.endsAt).getTime();
    this.savingSchedule.set(true); this.scheduleError.set('');
    // Sentinels de "limpiar": el backend usa null como "no tocar este campo", así que
    // vaciar se manda como '' (título/descripción) y 0 (imagen). Sin esto, la imagen
    // o el título del aviso no se podrían quitar nunca.
    this.api.updateConsolidadoSchedule(c.id, {
      title: s.title.trim(),
      description: s.description.trim(),
      startAtMs: this.toMs(s.startAt),
      endsAtMs,
      imageMediaId: s.imageMediaId ?? 0
    }).subscribe({
      next: () => {
        this.savingSchedule.set(false);
        this.showScheduleModal.set(false);
        this.loadConsolidados();
        this.showMessage(extending
          ? '✓ Plazo extendido. El aviso lo anuncia y vuelve a mostrarse a los clientes.'
          : '✓ Plazo actualizado.');
      },
      error: (e) => {
        this.savingSchedule.set(false);
        this.scheduleError.set(e.error?.message || 'No se pudo guardar.');
      }
    });
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

  missingQty(mi: MissingItem): number { return mi.orders.reduce((s, o) => s + (o.quantity || 0), 0); }

  /** Persiste el estado del faltante y actualiza la vista al instante (optimista). */
  setResolution(productId: number, status: MissingStatus) {
    const id = this.selectedId();
    if (id == null) return;
    this.missing.update(list => list.map(m => m.productId === productId ? { ...m, resolutionStatus: status } : m));
    this.api.setMissingResolution(id, productId, status).subscribe({
      error: () => { this.showMessage('No se pudo guardar el estado'); if (id != null) this.reloadMissing(id); }
    });
  }
  /** Check "comprado en CristFragance": alterna pendiente ↔ comprado (Caso A). */
  toggleCristBought(mi: MissingItem, checked: boolean) {
    this.setResolution(mi.productId, checked ? 'CRIST_BOUGHT' : 'CRIST_PENDING');
  }
  private reloadMissing(id: number) {
    this.api.getMissing(id).subscribe({ next: (m) => this.missing.set(m), error: () => {} });
  }

  // ---- Resumen ejecutivo de la compra (deriva de datos ya calculados; no toca el algoritmo) ----
  purchaseSummary = computed(() => {
    const a = this.allocation();
    const supplierRows = (a?.suppliers || []).map(s => ({
      name: s.name, perfumes: s.lines.length,
      units: s.lines.reduce((u, l) => u + l.quantity, 0),
      subtotalUsd: s.subtotalUsd, reachedMin: s.reachedMin, minOrderUsd: s.minOrderUsd,
    }));
    const supplierPerfumes = supplierRows.reduce((n, r) => n + r.perfumes, 0);
    const supplierUnits = supplierRows.reduce((n, r) => n + r.units, 0);
    // Ahorro = Σ(precio del proveedor más caro que lo tiene − precio elegido) × cantidad.
    let savingsUsd = 0;
    for (const s of (a?.suppliers || [])) {
      for (const l of s.lines) {
        if (!l.alternatives?.length) continue;
        const maxAlt = Math.max(...l.alternatives.map(x => x.unitCostUsd));
        savingsUsd += (maxAlt - l.unitCostUsd) * l.quantity;
      }
    }
    const ca = this.caseACounts();
    const cbUnits = this.caseB().reduce((u, m) => u + this.missingQty(m), 0);
    return {
      suppliers: supplierRows,
      totalPerfumes: supplierPerfumes + this.missing().length,
      totalUnits: supplierUnits + this.caseA().reduce((u, m) => u + this.missingQty(m), 0) + cbUnits,
      supplierPerfumes, supplierUnits,
      chosenTotalUsd: a?.chosenTotalUsd || 0,
      baselineTotalUsd: a?.baselineTotalUsd || 0,
      extraCostUsd: a?.extraCostUsd || 0,
      savingsUsd: Math.round(savingsUsd * 100) / 100,
      cristfrance: ca.total, cristfrancePending: ca.pending, cristfranceBought: ca.bought,
      cristfranceTotalPen: this.cristfranceTotalPen(),
      toNotify: this.caseB().length, notifyUnits: cbUnits,
    };
  });

  /** Proveedor prioritario (Zimaxx) para el panel de mínimo. */
  priorityGroup = computed(() => {
    const a = this.allocation();
    if (!a) return null;
    // El grupo cuyo mínimo es el que el sistema fuerza (zimaxxGap/priority se exponen a nivel global).
    const withMin = a.suppliers.filter(s => s.minOrderUsd > 0);
    if (!withMin.length) return null;
    // Prioriza el que aún no alcanza el mínimo; si todos lo alcanzan, el de mayor mínimo.
    return withMin.find(s => !s.reachedMin)
        ?? withMin.slice().sort((x, y) => y.minOrderUsd - x.minOrderUsd)[0];
  });

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
