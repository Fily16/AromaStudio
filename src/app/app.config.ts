import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { sessionExpiredInterceptor } from './services/session-expired.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Sesión admin vencida (401/403 en peticiones con token) → login con aviso
    provideHttpClient(withInterceptors([sessionExpiredInterceptor]))
  ]
};
