import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/catalog/catalog.component').then(m => m.CatalogComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./components/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./components/admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin/orders',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/orders/orders.component').then(m => m.OrdersComponent)
  },
  {
    path: 'admin/products',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/products/products.component').then(m => m.ProductsComponent)
  },
  {
    path: 'admin/inventory',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/inventory/inventory.component').then(m => m.InventoryComponent)
  },
  {
    path: 'admin/config',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/config/config.component').then(m => m.ConfigComponent)
  },
  { path: '**', redirectTo: '' }
];
