import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Product, Order, Consolidado, RetailInventory, RetailSale,
  DashboardStats, AppConfig, PublicConfig, OrderRequest, LoginResponse,
  StockPurchaseRequest, BreakdownSection, FullBreakdownResponse,
  Supplier, ImportSummary, AllocationResponse, SuggestResult, OperationsSummary, MissingItem, MissingStatus,
  Promotion, ProfitReport, SupplierRequest, ColumnMapping, ImportPreview, PublishRequest,
  MatchCandidate, SupplierConstraint, PurchasePlan, MarginReportRow, ProductOffersView,
  ConsolidadoPublic, MediaSummary, PhotoCandidate, PhotoRow, FillExcelResponse, SingleSupplierPlan
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // --- Products (public) ---
  getProducts(params?: { category?: string; search?: string; onlyAvailable?: boolean }): Observable<Product[]> {
    const p: any = {};
    if (params?.category) p.category = params.category;
    if (params?.search) p.search = params.search;
    if (params?.onlyAvailable) p.onlyAvailable = 'true';
    return this.http.get<Product[]>(`${this.url}/products`, { params: p });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/products/${id}`);
  }

  getProductPricing(id: number): Observable<any> {
    return this.http.get(`${this.url}/products/${id}/pricing`);
  }

  // Buscador: sugerencias (nombre/marca/SKU/UPC)
  suggest(q: string, limit = 8): Observable<SuggestResult[]> {
    return this.http.get<SuggestResult[]>(`${this.url}/products/suggest`, {
      params: { q, limit: String(limit) }
    });
  }

  // Recomendaciones híbridas para la ficha (similares + pedidos juntos)
  getRelated(productId: number, limit = 8): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/products/${productId}/related`, {
      params: { limit: String(limit) }
    });
  }

  // Cross-sell del carrito a partir de varios productos
  getCartCrossSell(ids: number[], limit = 8): Observable<Product[]> {
    if (ids.length === 0) return this.http.get<Product[]>(`${this.url}/products/related`, { params: { ids: '0', limit: String(limit) } });
    return this.http.get<Product[]>(`${this.url}/products/related`, {
      params: { ids: ids.join(','), limit: String(limit) }
    });
  }

  // --- Products (admin) ---
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.url}/products`, product, { headers: this.authHeaders() });
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.url}/products/${id}`, product, { headers: this.authHeaders() });
  }

  updateProductPrices(id: number, prices: { retailPricePen?: number; wholesalePricePen?: number; mayorPricePen?: number; priceUsd?: number; weightG?: number }): Observable<Product> {
    return this.http.put<Product>(`${this.url}/products/${id}/prices`, prices, { headers: this.authHeaders() });
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/products/${id}`, { headers: this.authHeaders() });
  }

  // --- Orders (public) ---
  createOrder(order: OrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.url}/orders`, order);
  }

  getOrderByCode(code: string): Observable<Order> {
    return this.http.get<Order>(`${this.url}/orders/code/${code}`);
  }

  editOrderByClient(request: OrderRequest): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/edit-by-client`, request);
  }

  // --- Orders (admin) ---
  getOrders(filters?: { status?: string; deliveryMethod?: string; seller?: string; consolidadoId?: number }): Observable<Order[]> {
    const p: any = {};
    if (filters?.status) p.status = filters.status;
    if (filters?.deliveryMethod) p.deliveryMethod = filters.deliveryMethod;
    if (filters?.seller) p.seller = filters.seller;
    if (filters?.consolidadoId != null) p.consolidadoId = String(filters.consolidadoId);
    return this.http.get<Order[]>(`${this.url}/orders`, { params: p, headers: this.authHeaders() });
  }

  // ERP: vendedores (para el filtro)
  getSellers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/admin/sellers`, { headers: this.authHeaders() });
  }

  // ERP: resumen de operación (KPIs + ganancia líquida) del consolidado activo
  getOperations(): Observable<OperationsSummary> {
    return this.http.get<OperationsSummary>(`${this.url}/admin/operations`, { headers: this.authHeaders() });
  }

  // ERP: lanzar perfumes a stock de tienda (precio = costo landed + S/35)
  launchToStock(items: { productId: number; quantity: number }[]): Observable<{ received: number; launched: number }> {
    return this.http.post<{ received: number; launched: number }>(`${this.url}/admin/retail/launch`, items, { headers: this.authHeaders() });
  }

  verifyDeposit(orderId: number, yapeReference: string): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/${orderId}/verify-deposit`, { yapeReference }, { headers: this.authHeaders() });
  }

  verifyRestPayment(orderId: number, yapeReference: string): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/${orderId}/verify-rest`, { yapeReference }, { headers: this.authHeaders() });
  }

  verifyPayment(orderId: number, yapeReference: string): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/${orderId}/verify`, { yapeReference }, { headers: this.authHeaders() });
  }

  rejectPayment(orderId: number): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/${orderId}/reject`, {}, { headers: this.authHeaders() });
  }

  updateOrderClient(orderId: number, data: { clientName?: string; clientPhone?: string }): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/${orderId}/update-client`, data, { headers: this.authHeaders() });
  }

  deleteOrder(orderId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/orders/${orderId}`, { headers: this.authHeaders() });
  }

  enableMerchandise(consolidadoId: number): Observable<any> {
    return this.http.post(`${this.url}/admin/enable-merchandise/${consolidadoId}`, {}, { headers: this.authHeaders() });
  }

  // --- Consolidados ---
  getActiveConsolidado(): Observable<Consolidado> {
    return this.http.get<Consolidado>(`${this.url}/consolidados/active`);
  }

  /** Público: estado del consolidado para el aviso/countdown (nunca crea nada). */
  getCurrentConsolidado(): Observable<ConsolidadoPublic> {
    return this.http.get<ConsolidadoPublic>(`${this.url}/consolidados/current`);
  }

  /** Admin: abre (o programa) un consolidado nuevo con fechas, título e imagen. */
  openConsolidado(body: {
    title?: string | null; description?: string | null;
    startAtMs?: number | null; endsAtMs: number; imageMediaId?: number | null;
  }): Observable<Consolidado> {
    return this.http.post<Consolidado>(`${this.url}/admin/consolidados/open`, body,
      { headers: this.authHeaders() });
  }

  /** Admin: configura plazo/título/descripción/imagen del consolidado abierto o programado. */
  updateConsolidadoSchedule(id: number, body: {
    title?: string | null; description?: string | null;
    startAtMs?: number | null; endsAtMs?: number | null; imageMediaId?: number | null;
  }): Observable<Consolidado> {
    return this.http.put<Consolidado>(`${this.url}/admin/consolidados/${id}/schedule`, body,
      { headers: this.authHeaders() });
  }

  // Reabre TEMPORALMENTE un consolidado cerrado por N minutos (el scheduler lo cierra solo)
  reopenConsolidado(id: number, minutes: number): Observable<Consolidado> {
    return this.http.post<Consolidado>(`${this.url}/admin/consolidados/${id}/reopen`, { minutes },
      { headers: this.authHeaders() });
  }

  // --- Galería de imágenes (banners de consolidados) ---
  /** URL pública de una imagen de la galería (cacheada de forma inmutable). */
  mediaUrl(id: number): string {
    return `${this.url}/media/${id}`;
  }
  listMedia(): Observable<MediaSummary[]> {
    return this.http.get<MediaSummary[]>(`${this.url}/admin/media`, { headers: this.authHeaders() });
  }
  uploadMedia(body: { name: string; dataUrl: string }): Observable<MediaSummary> {
    return this.http.post<MediaSummary>(`${this.url}/admin/media`, body, { headers: this.authHeaders() });
  }
  deleteMedia(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/admin/media/${id}`, { headers: this.authHeaders() });
  }

  getConsolidados(): Observable<Consolidado[]> {
    return this.http.get<Consolidado[]>(`${this.url}/consolidados`, { headers: this.authHeaders() });
  }

  getConsolidadoOrders(id: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.url}/consolidados/${id}/orders`, { headers: this.authHeaders() });
  }

  closeConsolidado(id: number): Observable<Consolidado> {
    return this.http.put<Consolidado>(`${this.url}/consolidados/${id}/close`, {}, { headers: this.authHeaders() });
  }

  deleteConsolidado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/consolidados/${id}`, { headers: this.authHeaders() });
  }

  // --- Retail (public) ---
  getRetailStock(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(`${this.url}/retail/stock`);
  }

  // --- Retail (admin) ---
  getRetailInventory(inStock = false): Observable<RetailInventory[]> {
    return this.http.get<RetailInventory[]>(`${this.url}/retail/inventory`, {
      params: { inStock: inStock.toString() }, headers: this.authHeaders()
    });
  }

  addRetailStock(data: { productId: number; quantity: number; costPerUnitPen?: number; notes?: string }): Observable<RetailInventory> {
    return this.http.post<RetailInventory>(`${this.url}/retail/inventory`, data, { headers: this.authHeaders() });
  }

  getRetailSales(): Observable<RetailSale[]> {
    return this.http.get<RetailSale[]>(`${this.url}/retail/sales`, { headers: this.authHeaders() });
  }

  registerRetailSale(data: { productId: number; quantity: number; salePricePen: number; channel?: string }): Observable<RetailSale> {
    return this.http.post<RetailSale>(`${this.url}/retail/sales`, data, { headers: this.authHeaders() });
  }

  // --- Admin ---
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.url}/auth/login`, { email, password });
  }

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.url}/admin/dashboard`, { headers: this.authHeaders() });
  }

  getConfig(): Observable<AppConfig[]> {
    return this.http.get<AppConfig[]>(`${this.url}/admin/config`, { headers: this.authHeaders() });
  }

  updateConfig(key: string, value: string): Observable<AppConfig> {
    return this.http.put<AppConfig>(`${this.url}/admin/config/${key}`, { value }, { headers: this.authHeaders() });
  }

  getPublicConfig(): Observable<PublicConfig> {
    return this.http.get<PublicConfig>(`${this.url}/config/public`);
  }

  // --- Stock Purchase ---
  previewStockPurchase(request: StockPurchaseRequest): Observable<BreakdownSection> {
    return this.http.post<BreakdownSection>(`${this.url}/admin/stock-purchase/preview`, request, { headers: this.authHeaders() });
  }

  createStockPurchase(request: StockPurchaseRequest): Observable<Order> {
    return this.http.post<Order>(`${this.url}/admin/stock-purchase`, request, { headers: this.authHeaders() });
  }

  // --- Full Breakdown ---
  getFullBreakdown(consolidadoId: number): Observable<FullBreakdownResponse> {
    return this.http.get<FullBreakdownResponse>(`${this.url}/consolidados/${consolidadoId}/full-breakdown`, { headers: this.authHeaders() });
  }

  // --- Sync from Sheet ---
  syncFromSheet(sheetStock: Record<string, number>): Observable<any> {
    return this.http.post(`${this.url}/admin/sync-from-sheet`, { sheetStock }, { headers: this.authHeaders() });
  }

  // --- Google Apps Script Proxy ---
  googleProxyPost(body: any): Observable<any> {
    return this.http.post(`${this.url}/admin/google-proxy`, body, { headers: this.authHeaders() });
  }

  googleProxyGet(action: string): Observable<any> {
    return this.http.get(`${this.url}/admin/google-proxy`, {
      params: { action },
      headers: this.authHeaders()
    });
  }
  // --- Factory Reset ---
  factoryResetOperations(): Observable<any> {
    return this.http.delete(`${this.url}/admin/factory-reset-operations`, { headers: this.authHeaders() });
  }

  // --- Multi-proveedor: suppliers, import de Excel, cutover, asignacion ---
  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.url}/admin/suppliers`, { headers: this.authHeaders() });
  }

  importSupplierExcel(supplierId: number, file: File): Observable<ImportSummary> {
    const fd = new FormData();
    fd.append('file', file);
    // No seteamos Content-Type: el navegador agrega el boundary del multipart.
    return this.http.post<ImportSummary>(`${this.url}/admin/suppliers/${supplierId}/import`, fd, {
      headers: this.authHeaders()
    });
  }

  // --- Proveedores: CRUD + activar/desactivar ---
  createSupplier(req: SupplierRequest): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.url}/admin/suppliers`, req, { headers: this.authHeaders() });
  }
  updateSupplier(id: number, req: SupplierRequest): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.url}/admin/suppliers/${id}`, req, { headers: this.authHeaders() });
  }
  setSupplierActive(id: number, active: boolean): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.url}/admin/suppliers/${id}/active?value=${active}`, {},
      { headers: this.authHeaders() });
  }
  deleteSupplier(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/admin/suppliers/${id}`, { headers: this.authHeaders() });
  }

  // --- Importacion con vista previa (staging) ---
  previewImport(supplierId: number, file: File): Observable<ImportPreview> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ImportPreview>(`${this.url}/admin/suppliers/${supplierId}/import/preview`, fd,
      { headers: this.authHeaders() });
  }
  reparseBatch(batchId: number, mapping: ColumnMapping): Observable<ImportPreview> {
    return this.http.post<ImportPreview>(`${this.url}/admin/import-batches/${batchId}/reparse`, mapping,
      { headers: this.authHeaders() });
  }
  publishBatch(batchId: number, req?: PublishRequest): Observable<ImportSummary> {
    return this.http.post<ImportSummary>(`${this.url}/admin/import-batches/${batchId}/publish`, req ?? {},
      { headers: this.authHeaders() });
  }
  discardBatch(batchId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/admin/import-batches/${batchId}`,
      { headers: this.authHeaders() });
  }

  // Apify (con caché por UPC): busca fotos. source: 'google' | 'fragrantica' | 'bing'; force = ignora caché
  fetchApifyImages(items: { idx: number; upc: string | null; query: string }[], source?: string, force?: boolean): Observable<Record<string, string>> {
    return this.http.post<Record<string, string>>(`${this.url}/admin/apify/images`, { items, source, force: !!force },
      { headers: this.authHeaders() });
  }
  // Igual que fetchApifyImages pero devuelve las N candidatas FINALES por fila (revisión visual)
  fetchApifyCandidates(items: { idx: number; upc: string | null; query: string }[], source?: string, force?: boolean): Observable<Record<string, PhotoCandidate[]>> {
    return this.http.post<Record<string, PhotoCandidate[]>>(`${this.url}/admin/apify/candidates`, { items, source, force: !!force },
      { headers: this.authHeaders() });
  }
  // Guarda la foto elegida (auto o manual) y la deja cacheada como definitiva para ese producto
  choosePhoto(productId: number, imageUrl: string): Observable<PhotoRow> {
    return this.http.post<PhotoRow>(`${this.url}/admin/apify/choose`, { productId, imageUrl },
      { headers: this.authHeaders() });
  }
  // Productos CON foto para que el navegador del admin las valide. supplierId null = TODO el catálogo
  getPhotos(supplierId?: number | null): Observable<PhotoRow[]> {
    const q = supplierId != null ? `?supplierId=${supplierId}` : '';
    return this.http.get<PhotoRow[]>(`${this.url}/admin/apify/photos${q}`, { headers: this.authHeaders() });
  }
  clearApifyCache(): Observable<{ cleared: number; message: string }> {
    return this.http.delete<{ cleared: number; message: string }>(`${this.url}/admin/apify/cache`,
      { headers: this.authHeaders() });
  }
  getApifySettings(): Observable<{ results: number; batch: number; hasToken: boolean }> {
    return this.http.get<{ results: number; batch: number; hasToken: boolean }>(`${this.url}/admin/apify/settings`,
      { headers: this.authHeaders() });
  }
  saveApifySettings(body: { results?: number; batch?: number; token?: string }): Observable<{ results: number; batch: number; hasToken: boolean; message: string }> {
    return this.http.post<{ results: number; batch: number; hasToken: boolean; message: string }>(`${this.url}/admin/apify/settings`, body,
      { headers: this.authHeaders() });
  }
  // Productos sin foto. supplierId null = TODO el catálogo
  getMissingImages(supplierId?: number | null): Observable<PhotoRow[]> {
    const q = supplierId != null ? `?supplierId=${supplierId}` : '';
    return this.http.get<PhotoRow[]>(`${this.url}/admin/apify/missing${q}`, { headers: this.authHeaders() });
  }

  archiveLegacyCatalog(): Observable<{ archived: number; message: string }> {
    return this.http.post<{ archived: number; message: string }>(
      `${this.url}/admin/catalog/archive-legacy`, {}, { headers: this.authHeaders() });
  }

  // "Completar Excel del proveedor": sube el Excel original, devuelve el mismo con las cantidades llenas.
  // consolidate=true -> incluye los reasignados (modo "Comprar solo en este proveedor").
  fillSupplierExcel(consolidadoId: number, supplierId: number, file: File, consolidate = false): Observable<FillExcelResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<FillExcelResponse>(
      `${this.url}/admin/consolidados/${consolidadoId}/suppliers/${supplierId}/fill-excel?consolidate=${consolidate}`, fd,
      { headers: this.authHeaders() });
  }

  getAllocation(consolidadoId: number): Observable<AllocationResponse> {
    return this.http.get<AllocationResponse>(
      `${this.url}/admin/consolidados/${consolidadoId}/allocation`, { headers: this.authHeaders() });
  }

  // "Comprar solo en un proveedor": consolida la asignación en un proveedor (reusa el mismo motor).
  consolidateToSupplier(consolidadoId: number, supplierId: number): Observable<SingleSupplierPlan> {
    return this.http.get<SingleSupplierPlan>(
      `${this.url}/admin/consolidados/${consolidadoId}/allocation/only/${supplierId}`, { headers: this.authHeaders() });
  }

  // --- Plan de compra (optimizador v2): calcular DRAFT -> confirmar (costo real) ---
  computePurchasePlan(consolidadoId: number): Observable<AllocationResponse> {
    return this.http.post<AllocationResponse>(
      `${this.url}/admin/consolidados/${consolidadoId}/allocation/compute`, {}, { headers: this.authHeaders() });
  }
  confirmPurchasePlan(consolidadoId: number, planId: number, force = false): Observable<PurchasePlan> {
    return this.http.post<PurchasePlan>(
      `${this.url}/admin/consolidados/${consolidadoId}/allocation/${planId}/confirm?force=${force}`, {},
      { headers: this.authHeaders() });
  }
  getCurrentPurchasePlan(consolidadoId: number): Observable<PurchasePlan | { plan: 'NONE' }> {
    return this.http.get<PurchasePlan | { plan: 'NONE' }>(
      `${this.url}/admin/consolidados/${consolidadoId}/allocation/plan`, { headers: this.authHeaders() });
  }
  getMarginReport(consolidadoId: number): Observable<MarginReportRow[]> {
    return this.http.get<MarginReportRow[]>(
      `${this.url}/admin/consolidados/${consolidadoId}/margin-report`, { headers: this.authHeaders() });
  }

  // --- Cola de revisión: duplicados, typos de GTIN y conflictos de atributos ---
  getMatchCandidates(status = 'PENDING', kind?: string): Observable<MatchCandidate[]> {
    const params: any = { status };
    if (kind) params.kind = kind;
    return this.http.get<MatchCandidate[]>(`${this.url}/admin/match-candidates`,
      { params, headers: this.authHeaders() });
  }
  getPendingReviewCount(): Observable<{ pending: number }> {
    return this.http.get<{ pending: number }>(`${this.url}/admin/match-candidates/count`,
      { headers: this.authHeaders() });
  }
  acceptMatchCandidate(id: number): Observable<any> {
    return this.http.post(`${this.url}/admin/match-candidates/${id}/accept`, {}, { headers: this.authHeaders() });
  }
  rejectMatchCandidate(id: number): Observable<any> {
    return this.http.post(`${this.url}/admin/match-candidates/${id}/reject`, {}, { headers: this.authHeaders() });
  }
  scanDuplicates(): Observable<{ candidatesCreated: number; pending: number }> {
    return this.http.post<{ candidatesCreated: number; pending: number }>(
      `${this.url}/admin/duplicates/scan`, {}, { headers: this.authHeaders() });
  }
  clearPendingCandidates(): Observable<{ cleared: number; pending: number }> {
    return this.http.delete<{ cleared: number; pending: number }>(
      `${this.url}/admin/match-candidates/pending`, { headers: this.authHeaders() });
  }
  mergeProducts(canonicalId: number, duplicateId: number): Observable<any> {
    return this.http.post(`${this.url}/admin/products/${canonicalId}/merge/${duplicateId}`, {},
      { headers: this.authHeaders() });
  }

  // --- Restricciones de compra por proveedor (mínimos como datos) ---
  getSupplierConstraints(supplierId: number): Observable<SupplierConstraint[]> {
    return this.http.get<SupplierConstraint[]>(`${this.url}/admin/suppliers/${supplierId}/constraints`,
      { headers: this.authHeaders() });
  }
  addSupplierConstraint(supplierId: number, c: SupplierConstraint): Observable<SupplierConstraint> {
    return this.http.post<SupplierConstraint>(`${this.url}/admin/suppliers/${supplierId}/constraints`, c,
      { headers: this.authHeaders() });
  }
  updateSupplierConstraint(supplierId: number, constraintId: number, c: Partial<SupplierConstraint>): Observable<SupplierConstraint> {
    return this.http.put<SupplierConstraint>(`${this.url}/admin/suppliers/${supplierId}/constraints/${constraintId}`, c,
      { headers: this.authHeaders() });
  }
  deleteSupplierConstraint(supplierId: number, constraintId: number): Observable<any> {
    return this.http.delete(`${this.url}/admin/suppliers/${supplierId}/constraints/${constraintId}`,
      { headers: this.authHeaders() });
  }

  // --- Ofertas por producto (vista multi-proveedor + costo que define el precio) ---
  getProductOffers(productId: number): Observable<ProductOffersView> {
    return this.http.get<ProductOffersView>(`${this.url}/admin/products/${productId}/offers`,
      { headers: this.authHeaders() });
  }

  // ERP: faltantes (perfumes pedidos sin proveedor) con el cliente que los pidió
  getMissing(consolidadoId: number): Observable<MissingItem[]> {
    return this.http.get<MissingItem[]>(
      `${this.url}/admin/consolidados/${consolidadoId}/missing`, { headers: this.authHeaders() });
  }

  // ERP: marca la resolución de un faltante (CristFragance pendiente/comprado o imposible). Persiste.
  setMissingResolution(consolidadoId: number, productId: number, status: MissingStatus): Observable<{ productId: number; status: string }> {
    return this.http.put<{ productId: number; status: string }>(
      `${this.url}/admin/consolidados/${consolidadoId}/missing/${productId}`, { status }, { headers: this.authHeaders() });
  }

  // ERP: desglose de precios por producto (costo puesto en Perú + consolidado + stock)
  getProductsPricing(): Observable<{ id: number; landedPen: number; consolidadoPen: number; stockPen: number }[]> {
    return this.http.get<{ id: number; landedPen: number; consolidadoPen: number; stockPen: number }[]>(
      `${this.url}/admin/products/pricing`, { headers: this.authHeaders() });
  }

  // --- Promociones (público) ---
  getActivePromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.url}/promotions/active`);
  }
  getPromotion(id: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.url}/promotions/${id}`);
  }

  // --- Promociones (admin) ---
  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.url}/admin/promotions`, { headers: this.authHeaders() });
  }
  createPromotion(req: any): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.url}/admin/promotions`, req, { headers: this.authHeaders() });
  }
  updatePromotion(id: number, req: any): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.url}/admin/promotions/${id}`, req, { headers: this.authHeaders() });
  }
  deletePromotion(id: number): Observable<any> {
    return this.http.delete(`${this.url}/admin/promotions/${id}`, { headers: this.authHeaders() });
  }
  suggestPromoProfit(pricePen: number, productIds: number[]): Observable<{ suggestedProfitPen: number | string }> {
    return this.http.post<{ suggestedProfitPen: number | string }>(
      `${this.url}/admin/promotions/suggest-profit`, { pricePen, productIds }, { headers: this.authHeaders() });
  }

  // --- Picking (admin) ---
  setItemPicked(itemId: number, picked: boolean): Observable<any> {
    return this.http.put(`${this.url}/orders/item/${itemId}/picked`, { picked }, { headers: this.authHeaders() });
  }
  pickProductInConsolidado(consolidadoId: number, productId: number, picked: boolean): Observable<any> {
    return this.http.put(`${this.url}/orders/consolidado/${consolidadoId}/pick-product/${productId}`,
      { picked }, { headers: this.authHeaders() });
  }

  // --- Ganancia por periodo (admin) ---
  getProfitReport(granularity: 'month' | 'week' | 'year'): Observable<ProfitReport> {
    return this.http.get<ProfitReport>(`${this.url}/admin/profit-report`, {
      params: { granularity }, headers: this.authHeaders()
    });
  }
}
