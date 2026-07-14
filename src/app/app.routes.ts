import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./components/catalog/catalog.component').then(m => m.CatalogComponent)
  },
  {
    path: 'producto/:id',
    loadComponent: () => import('./components/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'promocion/:id',
    loadComponent: () => import('./components/promo-page/promo-page.component').then(m => m.PromoPageComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart/cart.component').then(m => m.CartComponent)
  },
  {
    // El checkout ahora es una fase dentro del carrito (una sola vista animada).
    path: 'checkout',
    redirectTo: 'cart',
    pathMatch: 'full'
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./components/admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', loadComponent: () => import('./components/admin/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'productos', loadComponent: () => import('./components/admin/products/products.component').then(m => m.ProductsComponent) },
      { path: 'stock', loadComponent: () => import('./components/admin/stock-launch/stock-launch.component').then(m => m.StockLaunchComponent) },
      { path: 'importar', loadComponent: () => import('./components/admin/import/import.component').then(m => m.ImportComponent) },
      { path: 'revision', loadComponent: () => import('./components/admin/review/review.component').then(m => m.ReviewComponent) },
      { path: 'compra', loadComponent: () => import('./components/admin/purchase-plan/purchase-plan.component').then(m => m.PurchasePlanComponent) },
      { path: 'ajustes', loadComponent: () => import('./components/admin/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
