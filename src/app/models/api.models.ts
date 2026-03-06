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
  description: string | null;
  category: 'men' | 'women' | 'unisex';
  isNew: boolean;
  isHighlighted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: number;
  product: Product;
  quantity: number;
  unitPricePen: number;
  subtotalPen: number;
}

export interface Order {
  id: number;
  consolidadoId: number;
  clientName: string;
  clientPhone: string;
  paymentStatus: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';
  yapeReference: string | null;
  totalPen: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
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
}

// Cart item (frontend only)
export interface CartItem {
  product: Product;
  quantity: number;
  unitPricePen: number;
}

export interface OrderRequest {
  clientName: string;
  clientPhone: string;
  items: { productId: number; quantity: number; unitPricePen: number }[];
}
