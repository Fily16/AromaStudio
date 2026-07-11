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
export interface MissingItem {
  productId: number;
  brand: string;
  name: string;
  priceUsd: number | null;
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
  status: 'ABIERTO' | 'CERRADO' | 'ENVIADO' | 'ENTREGADO';
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
}

// Correcciones manuales al publicar (por índice de fila): marca/nombre/ml/foto de productos nuevos
export interface RowOverride { brand?: string; name?: string; ml?: number | null; imageUrl?: string | null; }
export interface PublishRequest { overrides?: Record<number, RowOverride>; }

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
  rows: ImportPreviewLine[];
}

export interface AllocationLine {
  productId: number;
  brand: string;
  name: string;
  ml: number | null;
  quantity: number;
  unitCostUsd: number;
  subtotalUsd: number;
  movedToReachMin: boolean;
  penaltyUsd: number;
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
}
