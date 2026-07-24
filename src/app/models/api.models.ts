// Product from backend
export interface Product {
  id: number;
  sku: string;
  brand: string;
  name: string;
  type: string;
  ml: number;
  priceUsd: number;
  weightG: number;
  available: boolean;
  imageUrl: string | null;
  retailPricePen: number | null;
  wholesalePricePen: number | null;
  mayorPricePen: number | null;
  stockPricePen?: number | null;   // precio de venta inmediata (landed + S/35) al lanzar a tienda
  priceLocked?: boolean;            // si true, no se recalcula al cambiar T/C
  description: string | null;
  category: 'men' | 'women' | 'unisex';
  isNew: boolean;
  isHighlighted: boolean;
  gtin?: string | null;
  gtinConflict?: boolean;     // el UPC choca con otro producto distinto (typo del proveedor)
  matchPending?: boolean;     // espera revisión en la cola de duplicados
  mergedIntoId?: number | null; // si fue fusionado: id del producto canónico
  forma?: string | null;
  // Notas olfativas (slugs CSV) + perfil derivado — ver components/shared/note-catalog.ts
  notesTop?: string | null;
  notesMiddle?: string | null;
  notesBase?: string | null;
  olfactiveFamily?: string | null;
  occasion?: string | null;   // dia | noche | versatil
  seasons?: string | null;    // CSV: primavera,verano,otono,invierno
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: number;
  product: Product;
  quantity: number;
  unitPricePen: number;
  subtotalPen: number;
  picked?: boolean;   // picking: el admin verificó/compró la mercadería de este ítem
}

// Perfume dentro de una promoción (pack)
export interface PromotionItem {
  id?: number;
  productId: number | null;   // null => perfume exclusivo de la promo
  name: string;
  imageUrl: string | null;
}

// Promoción / pack de perfumes con precio y stock propio
export interface Promotion {
  id: number;
  name: string;
  imageUrl: string | null;
  imageData?: string | null;   // imagen subida (data URL); preferida sobre imageUrl
  pricePen: number;
  profitPen: number;
  stockQty: number;
  validUntil: string | null;  // yyyy-MM-dd
  active: boolean;
  items: PromotionItem[];
  createdAt?: string;
}

// Línea de promoción dentro de un pedido (snapshot)
export interface OrderPromo {
  id?: number;
  promotionId: number | null;
  promoName: string;
  unitPricePen: number;
  quantity: number;
  subtotalPen: number;
  profitPen: number | null;
}

export interface Order {
  id: number;
  orderCode: string;
  consolidadoId: number;
  clientName: string;
  clientPhone: string;
  paymentStatus: 'PENDIENTE_SEPARACION' | 'SEPARADO' | 'PENDIENTE_RESTO' | 'PAGADO' | 'VERIFICADO' | 'RECHAZADO';
  yapeReference: string | null;
  totalPen: number;
  depositAmountPen: number;
  remainingPen: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  deliveryMethod: string | null;
  shippingName: string | null;
  shippingDni: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingDepartment?: string | null;  // departamento destino (Shalom)
  shippingAgency?: string | null;      // sede/agencia Shalom
  attendedBy?: string | null;     // vendedor que gestionó el pedido
  attendedById?: number | null;
  channel?: string | null;        // CONSOLIDADO | STOCK
  promos?: OrderPromo[];          // líneas de promoción (packs)
}

// Perfume faltante (sin proveedor) y a qué clientes corresponde
export type MissingStatus = 'CRIST_PENDING' | 'CRIST_BOUGHT' | 'UNAVAILABLE';

export interface MissingItem {
  productId: number;
  brand: string;
  name: string;
  ml: number | null;
  priceUsd: number | null;
  registeredPricePen: number | null;
  resolutionStatus: MissingStatus;
  orders: { orderCode: string; clientName: string; clientPhone: string; quantity: number }[];
}

// Resumen de operación del consolidado activo (ERP)
export interface OperationsSummary {
  consolidadoId: number;
  status: string;
  totalOrders: number;
  lima: number;
  provincia: number;
  units: number;
  revenuePen: number;
  gananciaLiquidaPen: number | null;
  bySeller: Record<string, number>;
}

export interface Consolidado {
  id: number;
  status: 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'ENVIADO' | 'ENTREGADO';
  openDate: string;
  closeDate: string | null;
  totalWeightG: number;
  totalCostUsd: number;
  courierCostUsd: number;
  totalInvestmentPen: number;
  totalRevenuePen: number;
  projectedProfitPen: number;
  notes: string | null;
  createdAt: string;
  // --- Programación y aviso público (v2) ---
  title?: string | null;
  description?: string | null;
  startAt?: string | null;      // ISO (Instant serializado)
  endsAt?: string | null;       // ISO: plazo de cierre; alimenta el countdown y el cierre automático
  extended?: boolean;           // el admin movió el plazo hacia adelante
  imageMediaId?: number | null; // imagen del aviso (galería)
}

/**
 * Estado público del consolidado para el aviso/countdown (GET /consolidados/current).
 * Fechas en epoch millis + serverNowMs: el contador se calcula contra la hora del
 * SERVIDOR, no la del visitante (inmune a relojes desfasados y zonas horarias).
 */
export interface ConsolidadoPublic {
  id: number | null;
  status: 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'ENTREGADO' | 'NONE';
  title: string | null;
  description: string | null;
  startAtMs: number | null;
  endsAtMs: number | null;
  serverNowMs: number;
  extended: boolean;
  imageMediaId: number | null;
  open: boolean;                // única fuente de verdad para habilitar compras por encargo
}

/** Imagen de la galería (banners de consolidados). */
export interface MediaSummary {
  id: number;
  name: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface RetailInventory {
  id: number;
  product: Product;
  quantity: number;
  costPerUnitPen: number | null;
  purchaseDate: string;
  notes: string | null;
}

export interface RetailSale {
  id: number;
  product: Product;
  quantity: number;
  salePricePen: number;
  costPen: number;
  profitPen: number;
  channel: string;
  saleDate: string;
}

export interface DashboardStats {
  totalProducts: number;
  activeConsolidados: number;
  pendingOrders: number;
  verifiedOrders: number;
  totalRevenuePen: number;
  totalProfitPen: number;
  retailStock: number;
  retailSalesCount: number;
  retailRevenuePen: number;
  retailProfitPen: number;
}

export interface LoginResponse {
  token: string;
  email: string;
  name: string;
}

export interface AppConfig {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
}

export interface PublicConfig {
  yapeNumber: string;
  exchangeRate: number;
  minOrderUsd: number;
  banners?: Banner[];
  promos?: Banner[];
}

// Banner del home (configurable desde app_config: home_banners)
export interface Banner {
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkType: 'product' | 'brand' | 'category' | 'search' | 'url';
  linkValue: string;
}

// Resultado ligero del dropdown del buscador
export interface SuggestResult {
  id: number;
  brand: string;
  name: string;
  ml: number | null;
  imageUrl: string | null;
  wholesalePricePen: number | null;
  retailPricePen: number | null;
}

// Cart item (frontend only)
export interface CartItem {
  product: Product;
  quantity: number;
  unitPricePen: number;
}

// Línea de promoción en el carrito (frontend)
export interface PromoCartItem {
  promo: Promotion;
  quantity: number;
}

// --- ACTUALIZADO: NUEVOS CAMPOS ---
export interface OrderRequest {
  clientName: string;
  clientPhone: string;
  channel?: string;           // CONSOLIDADO | STOCK
  existingOrderCode?: string; // Opcional: El código del pedido si quiere acumular
  yapeReference?: string;     // Opcional por ahora, lo mandaremos luego
  items: { productId: number; quantity: number; unitPricePen: number }[];
  promotions?: { promotionId: number; quantity: number }[];
  deliveryMethod?: string;
  shippingName?: string;
  shippingDni?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingDepartment?: string;
  shippingAgency?: string;
}

// Ganancia por periodo (mes/semana/año)
export interface ProfitPeriod {
  period: string;
  stock: number;
  promo: number;
  consolidado: number;
  total: number;
}
export interface ProfitReport {
  granularity: string;
  periods: ProfitPeriod[];
  totals: { stock: number; promo: number; consolidado: number; total: number };
}

export interface StockPurchaseRequest {
  items: { productId: number; quantity: number }[];
}

export interface ProductCount {
  productId: number;
  brand: string;
  name: string;
  ml: number;
  quantity: number;
}

export interface BreakdownSection {
  orderCount: number;
  totalUnits: number;
  productCounts: ProductCount[];
  weightPerfumesG: number;
  boxesNeeded: number;
  weightBoxesG: number;
  totalWeightG: number;
  subtotalProductsUsd: number;
  courierCostUsd: number;
  extraMiamiUsd: number;
  totalCostUsd: number;
  exchangeRate: number;
  totalInvestmentPen: number;
  totalRevenuePen: number | null;
  profitPen: number | null;
  marginPercent: number | null;
}

export interface FullBreakdownResponse {
  consolidado: BreakdownSection;
  miCompra: BreakdownSection;
  total: BreakdownSection;
}

// --- Multi-proveedor ---
export interface Supplier {
  id: number;
  name: string;
  minOrderUsd: number;
  currency: string;
  active: boolean;
  priorityToReachMin: boolean;
  parserProfileJson?: string | null;
}

// Restricción de compra de un proveedor (mínimos como datos, no como código)
export interface SupplierConstraint {
  id?: number;
  type: 'MIN_ORDER_USD' | 'MIN_UNITS' | 'MIN_UNITS_PER_BRAND' | string;
  valueNum: number;
  scopeJson?: string | null;   // ej. {"brand":"Lattafa"} para MIN_UNITS_PER_BRAND
  active?: boolean;
}

export interface ImportSummary {
  supplierName: string;
  rowsRead: number;
  productsCreated: number;
  offersCreated: number;
  offersUpdated: number;
  trueDuplicates: number;
  collisions: number;
  noUpcRows: number;
  markedOutOfStock: number;
  l2AutoMatched: number;   // filas sin UPC enganchadas a producto existente por nombre
  reviewQueued: number;    // posibles duplicados enviados a la cola de revisión
  suspiciousRows: number;  // filas con costo fuera de rango, guardadas fuera de stock
  notes: string[];
}

// Alta/edicion de proveedor
export interface SupplierRequest {
  name?: string;
  minOrderUsd?: number;
  priorityToReachMin?: boolean;
  active?: boolean;
}

// Asignacion de columnas del Excel (auto-detectada; editable en la vista previa)
export interface ColumnMapping {
  headerRow: number | null;
  descriptionCol: number | null;
  upcCol: number | null;
  priceCol: number | null;
  brandCol: number | null;
  statusCol: number | null;
  sizeUnit: string; // auto | ml | oz
}

export interface ImportPreviewLine {
  idx: number;
  brand: string;
  name: string;
  rawTitle: string | null;   // título original del Excel (para buscar por nombre exacto en Apify)
  ml: number | null;
  upc: string | null;
  costUsd: number | null;
  inStock: boolean;
  isNew: boolean;
  editable: boolean;
  matchedProductId: number | null;
  matchedBrand: string | null;
  matchedName: string | null;
  matchedMl: number | null;
  matchedImageUrl: string | null;
  currentPricePen: number | null;
  newPricePen: number | null;
  matchLevel: 'L1' | 'L2_AUTO' | 'L2_REVIEW' | 'NEW' | 'EXISTING' | null; // cómo se resolvió la identidad
  matchScore: number | null;   // similitud del mejor candidato (L2)
  gtinStatus: 'OK' | 'EMPTY' | 'INVALID_LENGTH' | 'CHECKSUM_FAIL' | 'AMBIGUOUS' | null;
  suspicious: boolean;         // costo fuera de rango plausible: no repreciará salvo aprobación
}

// Correcciones manuales al publicar (por índice de fila): marca/nombre/ml/foto de productos nuevos
export interface RowOverride { brand?: string; name?: string; ml?: number | null; imageUrl?: string | null; }
export interface PublishRequest {
  overrides?: Record<number, RowOverride>;
  approvedSuspiciousIdx?: number[]; // filas sospechosas que el admin aprueba igual
}

// Vista previa de una importacion ANTES de publicarla al cliente
export interface ImportPreview {
  batchId: number;
  supplierName: string;
  generic: boolean;
  mapping: ColumnMapping | null;
  headers: string[];
  rowsRead: number;
  newProducts: number;
  updatedOffers: number;
  noUpcRows: number;
  collisions: number;
  outOfStock: number;
  priceDrops: number;
  priceRises: number;
  l2AutoMatched: number;    // enganchados a producto existente por nombre (seguro)
  reviewCandidates: number; // irán a la cola de revisión al publicar
  suspiciousRows: number;   // costo fuera de rango (typo probable)
  layoutFallback: boolean;  // el parser afinado no reconoció el layout; se usó el genérico
  rows: ImportPreviewLine[];
}

export interface AltPrice {
  supplierId: number;
  supplierName: string;
  unitCostUsd: number;
  chosen: boolean;
  cheapest: boolean;
}

// Reporte de "Completar Excel del proveedor" (llenado de cantidades por UPC)
export interface FillMissing { gtin: string | null; brand: string; name: string; quantity: number; }
export interface FillReport {
  supplierName: string;
  sheetName: string;
  totalRows: number;
  found: number;
  updated: number;
  matchedByCode: number;   // ubicados por UPC / dígitos crudos
  matchedByName: number;   // ubicados por SKU o nombre (fallback robusto)
  hiddenRows: number;
  notFound: FillMissing[]; // pedidos pero ausentes del Excel (por ninguna clave)
  durationMs: number;
}
export interface FillExcelResponse { filename: string; fileBase64: string; report: FillReport; }

// "Comprar solo en un proveedor": consolidación de la asignación en un proveedor objetivo
export interface SingleSupplierBuyLine {
  productId: number; brand: string; name: string; gtin: string | null; ml: number | null;
  quantity: number; unitCostUsd: number; subtotalUsd: number;
  movedFromSupplierId: number | null; movedFromSupplierName: string | null;
}
export interface SingleSupplierCouldNotBuy {
  productId: number; brand: string; name: string; gtin: string | null; ml: number | null;
  quantity: number; currentSupplierName: string; reason: string;
}
export interface SingleSupplierPlan {
  consolidadoId: number; targetSupplierId: number; targetSupplierName: string;
  buy: SingleSupplierBuyLine[]; couldNotBuy: SingleSupplierCouldNotBuy[];
  buyPerfumes: number; buyUnits: number; buySubtotalUsd: number;
}

export interface AllocationLine {
  productId: number;
  brand: string;
  name: string;
  gtin: string | null;
  ml: number | null;
  quantity: number;
  unitCostUsd: number;
  subtotalUsd: number;
  movedToReachMin: boolean;
  penaltyUsd: number;
  // Trazabilidad de la decisión (el backend surface datos que el algoritmo ya calculó)
  chosenSupplierId: number | null;
  cheapestSupplierId: number | null;
  reason: string | null;
  alternatives: AltPrice[];
}

export interface SupplierAllocation {
  supplierId: number;
  name: string;
  minOrderUsd: number;
  subtotalUsd: number;
  reachedMin: boolean;
  lines: AllocationLine[];
}

export interface FillSuggestion {
  productId: number;
  brand: string;
  name: string;
  costUsd: number;
}

export interface UnfulfillableItem {
  productId: number;
  brand: string;
  name: string;
  quantity: number;
}

// Decisión del optimizador por proveedor con mínimo insatisfecho: forzar vs saltar
export interface SupplierDecision {
  supplierId: number;
  name: string;
  forceTotalUsd: number | null; // costo total del mejor plan FORZANDO su mínimo
  skipTotalUsd: number | null;  // costo total del mejor plan SALTÁNDOLO
  decision: 'FORZAR' | 'SALTAR';
}

export interface MarginWarning {
  productId: number;
  name: string;
  supplierId: number | null;
  supplierName: string | null;
  marginPen: number;  // margen unitario resultante (S/)
  floorPen: number;   // piso configurado (min_margin_pen_per_unit)
}

export interface LostSale {
  productId: number;
  name: string;
  quantity: number;
  reason: string;
}

export interface AllocationResponse {
  consolidadoId: number;
  suppliers: SupplierAllocation[];
  baselineTotalUsd: number;
  chosenTotalUsd: number;
  extraCostUsd: number;
  zimaxxPriorityEnabled: boolean;
  zimaxxMinReached: boolean;
  zimaxxGapUsd: number;
  storeFillSuggestions: FillSuggestion[];
  unfulfillable: UnfulfillableItem[];
  notes: string[];
  // v2: plan persistido + análisis forzar/saltar + guardia de margen
  planId: number | null;
  skipAnalysis: SupplierDecision[];
  marginWarnings: MarginWarning[];
  lostSales: LostSale[];
  penaltiesUsd: number;
}

// --- Plan de compra persistido (DRAFT -> CONFIRMED) ---
export interface PurchasePlanLine {
  id: number;
  productId: number;
  supplierId: number | null;
  qty: number;
  unitCostUsd: number | null;
  movedToReachMin: boolean;
  penaltyUsd: number | null;
  reason: string | null;
}

export interface PurchasePlan {
  id: number;
  consolidadoId: number;
  status: 'DRAFT' | 'CONFIRMED' | 'SUPERSEDED';
  baselineTotalUsd: number | null;
  totalUsd: number | null;
  extraCostUsd: number | null;
  createdAt: string;
  confirmedAt: string | null;
  lines: PurchasePlanLine[];
}

// --- Reporte de margen por producto del consolidado ---
export interface MarginReportRow {
  productId: number;
  name: string;
  quantity: number;
  avgUnitPricePen: number | null;
  unitCostUsd: number | null;
  landedPen: number | null;
  marginPen: number | null;
  belowFloor: boolean;
  costSource: 'PLAN_CONFIRMADO' | 'BASE_ACTUAL';
}

// --- Cola de revisión: candidatos a fusión / typos / conflictos ---
export interface MatchCandidateProduct {
  id: number;
  sku: string;
  brand: string;
  name: string;
  ml: number | null;
  gtin: string | null;
  imageUrl: string | null;
  pricePen: number | null;
  archived: boolean;
  mergedIntoId: number | null;
}

export interface MatchCandidateOffer {
  id: number;
  supplierName: string | null;
  rawTitle: string | null;
  costUsd: number | null;
  gtinRaw: string | null;
  gtinStatus: string | null;
}

export interface MatchCandidate {
  id: number;
  kind: 'L2_IMPORT' | 'DEDUP_SCAN' | 'GTIN_TYPO' | 'ATTR_CONFLICT' | string;
  score: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  reasons: string[];
  source: MatchCandidateProduct | null; // el producto "duplicado" (se fusionaría dentro del target)
  target: MatchCandidateProduct | null; // el producto canónico del catálogo
  offer?: MatchCandidateOffer;
}

// --- Ofertas por producto (vista multi-proveedor) ---
export interface ProductOffer {
  offerId: number;
  supplierId: number;
  supplierName: string | null;
  supplierActive: boolean;
  costUsd: number | null;
  inStock: boolean;
  flashSale: boolean;
  gtin: string | null;
  gtinStatus: string | null;
  rawTitle: string | null;
  lastImportedAt: string | null;
  isBasis: boolean; // esta oferta define el precio publicado
}

export interface ProductOffersView {
  productId: number;
  gtin: string | null;
  gtinConflict: boolean;
  matchPending: boolean;
  basisCostUsd: number | null;
  cheapestCostUsd: number | null;
  pricingBasis: string;
  offers: ProductOffer[];
}

/** Candidata de imagen (una de las N finales del algoritmo de búsqueda). */
export interface PhotoCandidate {
  url: string;
  origin?: string | null;
  title?: string | null;
  score: number;
}

/** Fila de producto para las herramientas de fotos (sin foto / revisar rotas). */
export interface PhotoRow {
  id: number;
  brand: string;
  name: string;
  ml: number | null;
  upc: string | null;
  imageUrl?: string | null;
  selected?: boolean;
  /** Motivo de rotura detectado por el navegador (error/timeout/placeholder/sin-url). */
  reason?: string;
}
