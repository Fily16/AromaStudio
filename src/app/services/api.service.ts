import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Product, Order, Consolidado, RetailInventory, RetailSale,
  DashboardStats, AppConfig, PublicConfig, OrderRequest, LoginResponse,
  StockPurchaseRequest, BreakdownSection, FullBreakdownResponse
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

  // --- Products (admin) ---
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.url}/products`, product, { headers: this.authHeaders() });
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.url}/products/${id}`, product, { headers: this.authHeaders() });
  }

  updateProductPrices(id: number, prices: { retailPricePen?: number; wholesalePricePen?: number; priceUsd?: number; weightG?: number }): Observable<Product> {
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

  // --- Orders (admin) ---
  getOrders(status?: string): Observable<Order[]> {
    const p: any = {};
    if (status) p.status = status;
    return this.http.get<Order[]>(`${this.url}/orders`, { params: p, headers: this.authHeaders() });
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

  enableMerchandise(consolidadoId: number): Observable<any> {
    return this.http.post(`${this.url}/admin/enable-merchandise/${consolidadoId}`, {}, { headers: this.authHeaders() });
  }

  // --- Consolidados ---
  getActiveConsolidado(): Observable<Consolidado> {
    return this.http.get<Consolidado>(`${this.url}/consolidados/active`);
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
}
