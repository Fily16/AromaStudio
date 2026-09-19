import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Query param con el que el login muestra «Tu sesión venció, vuelve a entrar». */
export const SESSION_EXPIRED_PARAM = 'expired';
export const ADMIN_LOGIN_PATH = '/admin/login';

/**
 * Sesión vencida: SOLO para peticiones del panel (las que llevan header Authorization),
 * si el backend responde 401/403 se cierra la sesión y se manda al login admin con aviso.
 * No toca las peticiones públicas de la tienda ni el propio login. El error se re-lanza
 * igual, así cada pantalla puede apagar su "Cargando…".
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.headers.has('Authorization') || isLoginRequest(req.url)) return next(req);
  // AuthService depende de ApiService → HttpClient: se resuelve recién al fallar (sin ciclo de DI).
  const injector = inject(Injector);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        onSessionExpired(injector);
      }
      return throwError(() => err);
    }),
  );
};

function isLoginRequest(url: string): boolean {
  return /\/auth\/login(\?|$)/.test(url);
}

function onSessionExpired(injector: Injector) {
  const router = injector.get(Router);
  const auth = injector.get(AuthService);
  auth.logout();
  const current = router.url || '';
  // Varias peticiones fallan juntas: navegar una sola vez.
  if (current.startsWith(ADMIN_LOGIN_PATH)) return;
  const returnUrl = current.startsWith('/admin') ? current : null;
  router.navigate([ADMIN_LOGIN_PATH], {
    queryParams: { [SESSION_EXPIRED_PARAM]: 1, ...(returnUrl ? { returnUrl } : {}) },
  });
}
